const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

const HOTEL_TIME_ZONE = "Asia/Manila";
const ACTIVE_BOOKING_STATUSES = ["booked", "checked-in"];
const SYSTEM_ACTOR = "system:scheduler";

function getDateStringInTimeZone(
  date = new Date(),
  timeZone = HOTEL_TIME_ZONE
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToDateOnly(dateString, dayCount) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + dayCount);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function enumerateStayNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return [];

  const start = new Date(`${checkInDate}T00:00:00.000Z`);
  const end = new Date(`${checkOutDate}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    return [];
  }

  const nights = [];
  const current = new Date(start.getTime());

  while (current < end && nights.length < 90) {
    nights.push(
      [
        current.getUTCFullYear(),
        String(current.getUTCMonth() + 1).padStart(2, "0"),
        String(current.getUTCDate()).padStart(2, "0"),
      ].join("-")
    );

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
}

function getLockIds(booking) {
  if (
    Array.isArray(booking.nightLockIds) &&
    booking.nightLockIds.length > 0
  ) {
    return booking.nightLockIds;
  }

  if (!booking.roomId || !booking.checkInDate || !booking.checkOutDate) {
    return [];
  }

  return enumerateStayNights(
    booking.checkInDate,
    booking.checkOutDate
  ).map((dateString) => `${booking.roomId}_${dateString}`);
}

function getNotificationRef(userId, notificationId) {
  return db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .doc(notificationId);
}

async function createReminderIfNeeded(bookingRef, tomorrowDate) {
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists) return false;

    const booking = bookingSnapshot.data();

    if (
      booking.status !== "booked" ||
      booking.checkInDate !== tomorrowDate ||
      !booking.userId
    ) {
      return false;
    }

    // Deterministic IDs prevent duplicate reminders even though the
    // scheduler checks once every hour.
    const notificationId =
      `booking_reminder_${bookingRef.id}_${booking.checkInDate}`;

    const notificationRef = getNotificationRef(
      booking.userId,
      notificationId
    );

    const notificationSnapshot = await transaction.get(notificationRef);

    if (notificationSnapshot.exists) {
      return false;
    }

    const roomName = booking.roomName || booking.name || "your room";

    transaction.set(notificationRef, {
      userId: booking.userId,
      type: "booking_reminder",
      source: "booking",
      title: "Reservation reminder",
      message:
        `Your stay in ${roomName} starts tomorrow (${booking.checkInDate}).`,
      status: "booked",
      statusLabel: "Tomorrow",
      bookingId: bookingRef.id,
      orderId: "",
      requestId: "",
      roomName,
      requestLabel: "",
      eventDate: booking.checkInDate,
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return true;
  });
}

async function processExpiredBooking(bookingRef, todayDate) {
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists) return false;

    const booking = bookingSnapshot.data();

    if (
      !ACTIVE_BOOKING_STATUSES.includes(booking.status) ||
      !booking.checkOutDate ||
      booking.checkOutDate >= todayDate ||
      !booking.userId
    ) {
      return false;
    }

    // All reads happen before writes.
    const lockEntries = [];

    for (const lockId of getLockIds(booking)) {
      const lockRef = db.collection("roomNightLocks").doc(lockId);
      const lockSnapshot = await transaction.get(lockRef);

      lockEntries.push({
        lockRef,
        lockSnapshot,
      });
    }

    const wasCheckedIn = booking.status === "checked-in";
    const newStatus = wasCheckedIn ? "checked-out" : "cancelled";

    const eventType = wasCheckedIn
      ? "booking_auto_checkout"
      : "booking_expired";

    const notificationId =
      `${eventType}_${bookingRef.id}_${booking.checkOutDate}`;

    const notificationRef = getNotificationRef(
      booking.userId,
      notificationId
    );

    const notificationSnapshot = await transaction.get(notificationRef);

    const roomName = booking.roomName || booking.name || "your room";

    // Reuse existing booking schema fields only.
    const bookingUpdate = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (wasCheckedIn) {
      bookingUpdate.checkOutAt = FieldValue.serverTimestamp();
      bookingUpdate.checkedOutBy = SYSTEM_ACTOR;
    } else {
      bookingUpdate.cancelledAt = FieldValue.serverTimestamp();
      bookingUpdate.cancelledBy = SYSTEM_ACTOR;
    }

    transaction.update(bookingRef, bookingUpdate);

    lockEntries.forEach(({ lockRef, lockSnapshot }) => {
      if (
        lockSnapshot.exists &&
        lockSnapshot.data().bookingId === bookingRef.id
      ) {
        transaction.delete(lockRef);
      }
    });

    if (!notificationSnapshot.exists) {
      transaction.set(notificationRef, {
        userId: booking.userId,
        type: eventType,
        source: "booking",
        title: wasCheckedIn
          ? "Stay checked out"
          : "Reservation expired",
        message: wasCheckedIn
          ? `Your stay in ${roomName} was checked out automatically because the checkout date has passed.`
          : `Your reservation for ${roomName} was automatically cancelled because the reserved stay dates have passed.`,
        status: newStatus,
        statusLabel: wasCheckedIn ? "Checked out" : "Expired",
        bookingId: bookingRef.id,
        orderId: "",
        requestId: "",
        roomName,
        requestLabel: "",
        eventDate: booking.checkOutDate,
        read: false,
        dismissed: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return true;
  });
}


function getTimestampMillis(value) {
  if (!value) return Date.now();

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value.seconds) {
    return Number(value.seconds) * 1000;
  }

  return Date.now();
}

async function resolveGuestName(data = {}) {
  const embeddedName =
    data.guestName ||
    data.userFullName ||
    "";

  if (embeddedName) return embeddedName;

  if (data.userId) {
    try {
      const userSnapshot = await db
        .collection("users")
        .doc(data.userId)
        .get();

      if (userSnapshot.exists) {
        const userData = userSnapshot.data();

        if (userData.fullName) {
          return userData.fullName;
        }
      }
    } catch (error) {
      logger.warn("Unable to resolve guest name", {
        userId: data.userId,
        message: error?.message || String(error),
      });
    }
  }

  return data.userEmail || "A guest";
}

function sanitizeNotificationKey(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 240);
}

async function notifyAllAdmins({
  notificationIdPrefix,
  dedupeKey = "",
  type,
  title,
  message,
  status = "attention",
  statusLabel = "Attention",
  bookingId = "",
  orderId = "",
  requestId = "",
  ratingId = "",
  requesterUserId = "",
  guestName = "",
  roomName = "",
  requestLabel = "",
  eventDate = "",
  eventTimestamp,
}) {
  const adminsSnapshot = await db
    .collection("users")
    .where("role", "==", "admin")
    .get();

  if (adminsSnapshot.empty) {
    logger.warn("No admin users found for notification", {
      type,
      bookingId,
      orderId,
      requestId,
      ratingId,
    });
    return 0;
  }

  const suffix = sanitizeNotificationKey(
    dedupeKey || getTimestampMillis(eventTimestamp)
  );

  let createdCount = 0;

  await Promise.all(
    adminsSnapshot.docs.map(async (adminDoc) => {
      const notificationId =
        `${notificationIdPrefix}_${suffix}`;

      const notificationRef = adminDoc.ref
        .collection("notifications")
        .doc(notificationId);

      // Firestore events may be retried. Check the deterministic document
      // before writing so a retry does not reset a notification that the
      // admin already read or dismissed.
      const existingSnapshot = await notificationRef.get();

      if (existingSnapshot.exists) {
        return;
      }

      await notificationRef.set({
        userId: adminDoc.id,
        type,
        source: "admin",
        title,
        message,
        status,
        statusLabel,
        bookingId,
        orderId,
        requestId,
        ratingId,
        requesterUserId,
        guestName,
        roomName,
        requestLabel,
        eventDate,
        read: false,
        dismissed: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      createdCount += 1;
    })
  );

  return createdCount;
}

async function dismissAdminReviewNotification({
  notificationIdPrefix,
  eventTimestamp,
}) {
  const adminsSnapshot = await db
    .collection("users")
    .where("role", "==", "admin")
    .get();

  if (adminsSnapshot.empty) return 0;

  const suffix = sanitizeNotificationKey(
    getTimestampMillis(eventTimestamp)
  );

  let dismissedCount = 0;

  await Promise.all(
    adminsSnapshot.docs.map(async (adminDoc) => {
      const notificationRef = adminDoc.ref
        .collection("notifications")
        .doc(`${notificationIdPrefix}_${suffix}`);

      const notificationSnapshot = await notificationRef.get();

      if (!notificationSnapshot.exists) return;

      await notificationRef.update({
        read: true,
        readAt: FieldValue.serverTimestamp(),
        dismissed: true,
        dismissedAt: FieldValue.serverTimestamp(),
      });

      dismissedCount += 1;
    })
  );

  return dismissedCount;
}


exports.notifyAdminsOnNewBooking = onDocumentCreated(
  "roomBookings/{bookingId}",
  async (event) => {
    const booking = event.data?.data();

    if (!booking || booking.status !== "booked") return;

    const bookingId = event.params.bookingId;
    const guestName = await resolveGuestName(booking);
    const roomName =
      booking.roomName ||
      booking.name ||
      booking.roomNumber ||
      "Room";

    await notifyAllAdmins({
      notificationIdPrefix: `admin_new_booking_${bookingId}`,
      dedupeKey: bookingId,
      type: "admin_new_booking",
      title: "New room booking",
      message:
        `${guestName} booked ${roomName} from ${booking.checkInDate || "the selected date"} to ${booking.checkOutDate || "the selected checkout date"}.`,
      status: "booked",
      statusLabel: "New Booking",
      bookingId,
      requesterUserId: booking.userId || "",
      guestName,
      roomName,
      eventDate: booking.checkInDate || "",
      eventTimestamp:
        booking.reservedAt ||
        booking.createdAt,
    });
  }
);

exports.notifyAdminsOnBookingUpdate = onDocumentUpdated(
  "roomBookings/{bookingId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const bookingId = event.params.bookingId;
    const guestName = await resolveGuestName(after);
    const roomName =
      after.roomName ||
      after.name ||
      after.roomNumber ||
      "Room";

    // Guest manually cancelled their reservation.
    const guestCancelled =
      before.status !== "cancelled" &&
      after.status === "cancelled" &&
      after.cancelledBy &&
      after.cancelledBy === after.userId;

    if (guestCancelled) {
      await notifyAllAdmins({
        notificationIdPrefix:
          `admin_guest_booking_cancelled_${bookingId}`,
        dedupeKey:
          `${bookingId}_${getTimestampMillis(after.cancelledAt || after.updatedAt)}`,
        type: "admin_guest_booking_cancelled",
        title: "Guest cancelled reservation",
        message:
          `${guestName} cancelled the reservation for ${roomName}.`,
        status: "cancelled",
        statusLabel: "Guest Cancelled",
        bookingId,
        requesterUserId: after.userId || "",
        guestName,
        roomName,
        eventDate: after.checkInDate || "",
        eventTimestamp:
          after.cancelledAt ||
          after.updatedAt,
      });

      return;
    }

    // Automatic no-show/expired reservation.
    const systemExpired =
      before.status !== "cancelled" &&
      after.status === "cancelled" &&
      after.cancelledBy === SYSTEM_ACTOR;

    if (systemExpired) {
      await notifyAllAdmins({
        notificationIdPrefix:
          `admin_booking_expired_${bookingId}`,
        dedupeKey:
          `${bookingId}_${after.checkOutDate || "expired"}`,
        type: "admin_booking_expired",
        title: "Reservation expired automatically",
        message:
          `${guestName}'s reservation for ${roomName} was automatically cancelled because the checkout date passed without check-in.`,
        status: "cancelled",
        statusLabel: "Expired / No-show",
        bookingId,
        requesterUserId: after.userId || "",
        guestName,
        roomName,
        eventDate: after.checkOutDate || "",
        eventTimestamp: after.updatedAt,
      });

      return;
    }

    // Automatic checkout performed by the Manila scheduler.
    const systemCheckedOut =
      before.status !== "checked-out" &&
      after.status === "checked-out" &&
      after.checkedOutBy === SYSTEM_ACTOR;

    if (systemCheckedOut) {
      await notifyAllAdmins({
        notificationIdPrefix:
          `admin_booking_auto_checkout_${bookingId}`,
        dedupeKey:
          `${bookingId}_${after.checkOutDate || "checkout"}`,
        type: "admin_booking_auto_checkout",
        title: "Guest checked out automatically",
        message:
          `${guestName}'s stay in ${roomName} was automatically checked out because the checkout date passed.`,
        status: "checked-out",
        statusLabel: "Auto Checkout",
        bookingId,
        requesterUserId: after.userId || "",
        guestName,
        roomName,
        eventDate: after.checkOutDate || "",
        eventTimestamp:
          after.checkOutAt ||
          after.updatedAt,
      });
    }
  }
);

exports.notifyAdminsOnNewFoodOrder = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    const order = event.data?.data();

    if (!order) return;

    const orderId = event.params.orderId;
    const guestName = await resolveGuestName(order);
    const roomName =
      order.roomName ||
      order.roomNumber ||
      "Room not assigned";

    const itemCount = Array.isArray(order.items)
      ? order.items.reduce(
          (total, item) =>
            total + Math.max(Number(item.quantity) || 0, 0),
          0
        )
      : 0;

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_new_food_order_${orderId}`,
      dedupeKey: orderId,
      type: "admin_new_food_order",
      title: "New food order",
      message:
        `${guestName} placed a food order${itemCount > 0 ? ` with ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}${roomName !== "Room not assigned" ? ` for ${roomName}` : ""}.`,
      status: order.status || "pending",
      statusLabel: "New Order",
      orderId,
      requesterUserId: order.userId || "",
      guestName,
      roomName,
      eventTimestamp:
        order.createdAt ||
        order.updatedAt,
    });
  }
);

exports.notifyAdminsOnNewServiceRequest = onDocumentCreated(
  "requests/{requestId}",
  async (event) => {
    const request = event.data?.data();

    if (!request) return;

    const requestId = event.params.requestId;
    const guestName = await resolveGuestName(request);

    const requestLabel =
      Array.isArray(request.requestTypeLabels) &&
      request.requestTypeLabels.length > 0
        ? request.requestTypeLabels.join(", ")
        : "Service Request";

    const roomName =
      request.roomName ||
      request.roomNumber ||
      "Room not assigned";

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_new_service_request_${requestId}`,
      dedupeKey: requestId,
      type: "admin_new_service_request",
      title: "New guest request",
      message:
        `${guestName} submitted ${requestLabel}${roomName !== "Room not assigned" ? ` for ${roomName}` : ""}.`,
      status: request.status || "pending",
      statusLabel: "New Request",
      requestId,
      requesterUserId: request.userId || "",
      guestName,
      roomName,
      requestLabel,
      eventTimestamp:
        request.createdAt ||
        request.updatedAt,
    });
  }
);

exports.notifyAdminsOnLowRoomRating = onDocumentCreated(
  "roomRatings/{ratingId}",
  async (event) => {
    const rating = event.data?.data();

    if (!rating) return;

    const numericRating = Number(rating.rating);

    // Do not spam admins with normal/good ratings. Only 1-2 stars
    // are treated as an actionable management alert.
    if (
      !Number.isFinite(numericRating) ||
      numericRating > 2
    ) {
      return;
    }

    const ratingId = event.params.ratingId;
    const guestName = await resolveGuestName(rating);
    const roomName =
      rating.roomName ||
      rating.roomId ||
      "a room";

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_low_room_rating_${ratingId}`,
      dedupeKey:
        `${ratingId}_${numericRating}`,
      type: "admin_low_room_rating",
      title: "Low room rating received",
      message:
        `${guestName} submitted a ${numericRating}-star rating for ${roomName}.`,
      status: "low_rating",
      statusLabel: `${numericRating}-Star Rating`,
      ratingId,
      requesterUserId: rating.userId || "",
      guestName,
      roomName,
      eventTimestamp:
        rating.createdAt ||
        rating.updatedAt,
    });
  }
);

exports.notifyAdminsOnLowRoomRatingUpdate = onDocumentUpdated(
  "roomRatings/{ratingId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const previousRating = Number(before.rating);
    const newRating = Number(after.rating);

    // Notify only when a previously non-low rating becomes 1-2 stars.
    if (
      !Number.isFinite(newRating) ||
      newRating > 2 ||
      (Number.isFinite(previousRating) && previousRating <= 2)
    ) {
      return;
    }

    const ratingId = event.params.ratingId;
    const guestName = await resolveGuestName(after);
    const roomName =
      after.roomName ||
      after.roomId ||
      "a room";

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_low_room_rating_update_${ratingId}`,
      dedupeKey:
        `${ratingId}_${newRating}_${getTimestampMillis(after.updatedAt)}`,
      type: "admin_low_room_rating",
      title: "Room rating changed to low",
      message:
        `${guestName} changed the rating for ${roomName} to ${newRating} stars.`,
      status: "low_rating",
      statusLabel: `${newRating}-Star Rating`,
      ratingId,
      requesterUserId: after.userId || "",
      guestName,
      roomName,
      eventTimestamp: after.updatedAt,
    });
  }
);

exports.notifyAdminsOnFoodCancellationRequest = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const orderId = event.params.orderId;

    const becamePending =
      before.cancellationRequestStatus !== "pending" &&
      after.cancellationRequestStatus === "pending" &&
      after.cancellationRequested === true;

    if (becamePending) {
      const guestName = await resolveGuestName(after);

      const roomName =
        after.roomName ||
        after.roomNumber ||
        "Room not assigned";

      const count = await notifyAllAdmins({
        notificationIdPrefix:
          `admin_food_cancellation_${orderId}`,
        type: "admin_food_cancellation_request",
        title: "Food cancellation requested",
        message:
          `${guestName} requested cancellation of a food order while it is being prepared.`,
        status: "cancellation_requested",
        statusLabel: "Needs Review",
        orderId,
        requesterUserId: after.userId || "",
        guestName,
        roomName,
        eventTimestamp:
          after.cancellationRequestedAt ||
          after.updatedAt,
      });

      logger.info("Admin food cancellation notifications created", {
        orderId,
        adminCount: count,
      });

      return;
    }

    const leftPendingState =
      before.cancellationRequestStatus === "pending" &&
      after.cancellationRequestStatus !== "pending";

    if (!leftPendingState) return;

    // Remove the old actionable "Needs Review" alert after the guest
    // withdraws it or the admin approves/declines it.
    await dismissAdminReviewNotification({
      notificationIdPrefix:
        `admin_food_cancellation_${orderId}`,
      eventTimestamp:
        before.cancellationRequestedAt ||
        before.updatedAt,
    });

    if (after.cancellationRequestStatus !== "withdrawn") {
      return;
    }

    const guestName = await resolveGuestName(after);

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_food_cancellation_withdrawn_${orderId}`,
      type: "admin_food_cancellation_withdrawn",
      title: "Food cancellation request withdrawn",
      message:
        `${guestName} withdrew the cancellation request. The food order remains active.`,
      status: "withdrawn",
      statusLabel: "Withdrawn",
      orderId,
      requesterUserId: after.userId || "",
      guestName,
      roomName:
        after.roomName ||
        after.roomNumber ||
        "Room not assigned",
      eventTimestamp: after.updatedAt,
    });
  }
);

exports.notifyAdminsOnServiceCancellationRequest = onDocumentUpdated(
  "requests/{requestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const requestId = event.params.requestId;

    const becamePending =
      before.cancellationRequestStatus !== "pending" &&
      after.cancellationRequestStatus === "pending" &&
      after.cancellationRequested === true;

    if (becamePending) {
      const guestName = await resolveGuestName(after);

      const roomName =
        after.roomName ||
        after.roomNumber ||
        "Room not assigned";

      const requestLabel =
        Array.isArray(after.requestTypeLabels) &&
        after.requestTypeLabels.length > 0
          ? after.requestTypeLabels.join(", ")
          : "Service Request";

      const count = await notifyAllAdmins({
        notificationIdPrefix:
          `admin_request_cancellation_${requestId}`,
        type: "admin_request_cancellation_request",
        title: "Request cancellation requested",
        message:
          `${guestName} requested cancellation of ${requestLabel} while it is ongoing.`,
        status: "cancellation_requested",
        statusLabel: "Needs Review",
        requestId,
        requesterUserId: after.userId || "",
        guestName,
        roomName,
        requestLabel,
        eventTimestamp:
          after.cancellationRequestedAt ||
          after.updatedAt,
      });

      logger.info("Admin service cancellation notifications created", {
        requestId,
        adminCount: count,
      });

      return;
    }

    const leftPendingState =
      before.cancellationRequestStatus === "pending" &&
      after.cancellationRequestStatus !== "pending";

    if (!leftPendingState) return;

    await dismissAdminReviewNotification({
      notificationIdPrefix:
        `admin_request_cancellation_${requestId}`,
      eventTimestamp:
        before.cancellationRequestedAt ||
        before.updatedAt,
    });

    if (after.cancellationRequestStatus !== "withdrawn") {
      return;
    }

    const guestName = await resolveGuestName(after);

    const requestLabel =
      Array.isArray(after.requestTypeLabels) &&
      after.requestTypeLabels.length > 0
        ? after.requestTypeLabels.join(", ")
        : "Service Request";

    await notifyAllAdmins({
      notificationIdPrefix:
        `admin_request_cancellation_withdrawn_${requestId}`,
      type: "admin_request_cancellation_withdrawn",
      title: "Request cancellation withdrawn",
      message:
        `${guestName} withdrew the cancellation request for ${requestLabel}. The request remains active.`,
      status: "withdrawn",
      statusLabel: "Withdrawn",
      requestId,
      requesterUserId: after.userId || "",
      guestName,
      roomName:
        after.roomName ||
        after.roomNumber ||
        "Room not assigned",
      requestLabel,
      eventTimestamp: after.updatedAt,
    });
  }
);

exports.processBookingLifecycle = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: HOTEL_TIME_ZONE,
    retryCount: 3,
  },
  async () => {
    const todayDate = getDateStringInTimeZone(
      new Date(),
      HOTEL_TIME_ZONE
    );

    const tomorrowDate = addDaysToDateOnly(todayDate, 1);

    logger.info("Processing booking lifecycle", {
      timeZone: HOTEL_TIME_ZONE,
      todayDate,
      tomorrowDate,
    });

    const activeSnapshot = await db
      .collection("roomBookings")
      .where("status", "in", ACTIVE_BOOKING_STATUSES)
      .get();

    let reminderCount = 0;
    let lifecycleCount = 0;
    let failureCount = 0;

    for (const bookingDoc of activeSnapshot.docs) {
      const booking = bookingDoc.data();

      try {
        if (
          booking.status === "booked" &&
          booking.checkInDate === tomorrowDate
        ) {
          if (
            await createReminderIfNeeded(
              bookingDoc.ref,
              tomorrowDate
            )
          ) {
            reminderCount += 1;
          }

          const guestName = await resolveGuestName(booking);
          const roomName =
            booking.roomName ||
            booking.name ||
            booking.roomNumber ||
            "Room";

          await notifyAllAdmins({
            notificationIdPrefix:
              `admin_arrival_tomorrow_${bookingDoc.id}`,
            dedupeKey:
              `${bookingDoc.id}_${booking.checkInDate}`,
            type: "admin_guest_arrival_tomorrow",
            title: "Guest arriving tomorrow",
            message:
              `${guestName} is scheduled to check in to ${roomName} tomorrow (${booking.checkInDate}).`,
            status: "booked",
            statusLabel: "Arrival Tomorrow",
            bookingId: bookingDoc.id,
            requesterUserId: booking.userId || "",
            guestName,
            roomName,
            eventDate: booking.checkInDate,
            eventTimestamp:
              booking.reservedAt ||
              booking.createdAt,
          });
        }

        // The checkout day itself remains valid.
        // Process only when the Manila date is AFTER checkOutDate.
        if (
          booking.checkOutDate &&
          booking.checkOutDate < todayDate
        ) {
          if (
            await processExpiredBooking(
              bookingDoc.ref,
              todayDate
            )
          ) {
            lifecycleCount += 1;
          }
        }
      } catch (error) {
        failureCount += 1;

        logger.error("Failed to process booking", {
          bookingId: bookingDoc.id,
          message: error?.message || String(error),
          stack: error?.stack || "",
        });
      }
    }

    logger.info("Booking lifecycle processing complete", {
      scanned: activeSnapshot.size,
      remindersCreated: reminderCount,
      lifecycleUpdates: lifecycleCount,
      failures: failureCount,
      timeZone: HOTEL_TIME_ZONE,
    });
  }
);
