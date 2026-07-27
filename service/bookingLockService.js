import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../FirebaseConfig";

const MAX_STAY_NIGHTS = 90;

function createBookingError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function parseDateOnly(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ""))) {
    throw createBookingError(
      "booking/invalid-date",
      `Invalid date value: ${dateString || "empty"}`
    );
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw createBookingError(
      "booking/invalid-date",
      `Invalid calendar date: ${dateString}`
    );
  }

  return date;
}

function formatDateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns every occupied night from check-in (inclusive) to checkout (exclusive).
 * Example: Aug 1 to Aug 3 locks Aug 1 and Aug 2 only.
 */
export function enumerateStayNights(checkInDate, checkOutDate) {
  const start = parseDateOnly(checkInDate);
  const end = parseDateOnly(checkOutDate);

  if (start >= end) {
    throw createBookingError(
      "booking/invalid-range",
      "Checkout must be after check-in."
    );
  }

  const nights = [];
  const current = new Date(start.getTime());

  while (current < end) {
    nights.push(formatDateOnly(current));

    if (nights.length > MAX_STAY_NIGHTS) {
      throw createBookingError(
        "booking/stay-too-long",
        `Bookings are limited to ${MAX_STAY_NIGHTS} nights.`
      );
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
}

export function getRoomNightLockId(roomId, dateString) {
  if (!roomId) {
    throw createBookingError("booking/missing-room", "Room ID is required.");
  }

  return `${roomId}_${dateString}`;
}

/**
 * Atomically creates one booking and all of its predictable room-night locks.
 * Firestore retries transactions when another client changes a lock document
 * that this transaction read, so only one competing booking can commit.
 */
export async function createBookingWithNightLocks(bookingPayload) {
  const roomId = bookingPayload?.roomId;
  const checkInDate = bookingPayload?.checkInDate;
  const checkOutDate = bookingPayload?.checkOutDate;

  if (!roomId) {
    throw createBookingError("booking/missing-room", "Room ID is required.");
  }

  if (!checkInDate || !checkOutDate) {
    throw createBookingError(
      "booking/missing-dates",
      "Check-in and checkout dates are required."
    );
  }

  const lockedNights = enumerateStayNights(checkInDate, checkOutDate);
  const bookingRef = doc(collection(db, "roomBookings"));
  const lockEntries = lockedNights.map((dateString) => {
    const lockId = getRoomNightLockId(roomId, dateString);
    return {
      dateString,
      lockId,
      ref: doc(db, "roomNightLocks", lockId),
    };
  });

  const finalPayload = {
    ...bookingPayload,
    lockedNights,
    nightLockIds: lockEntries.map((entry) => entry.lockId),
    lockVersion: 1,
  };

  await runTransaction(db, async (transaction) => {
    // Firestore requires transaction reads before transaction writes.
    const lockSnapshots = [];

    for (const entry of lockEntries) {
      lockSnapshots.push(await transaction.get(entry.ref));
    }

    const conflictIndex = lockSnapshots.findIndex((snapshot) => snapshot.exists());

    if (conflictIndex >= 0) {
      const conflictDate = lockEntries[conflictIndex].dateString;
      throw createBookingError(
        "booking/date-conflict",
        `The room is no longer available on ${conflictDate}.`,
        { conflictDate }
      );
    }

    transaction.set(bookingRef, finalPayload);

    lockEntries.forEach((entry) => {
      transaction.set(entry.ref, {
        roomId,
        date: entry.dateString,
        bookingId: bookingRef.id,
        userId: bookingPayload.userId || "",
        status: bookingPayload.status || "booked",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  return {
    id: bookingRef.id,
    ...finalPayload,
  };
}

/**
 * Changes a booking status and releases only locks that still belong to it.
 * Set requireOwner=true for guest cancellation. Admin workflows should rely
 * on Firestore rules/custom claims and call with requireOwner=false.
 */
export async function releaseBookingLocksAndUpdateStatus({
  bookingId,
  newStatus,
  actorId = "",
  requireOwner = false,
  additionalFields = {},
}) {
  if (!bookingId) {
    throw createBookingError(
      "booking/missing-booking",
      "Booking ID is required."
    );
  }

  const bookingRef = doc(db, "roomBookings", bookingId);

  return runTransaction(db, async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists()) {
      throw createBookingError(
        "booking/not-found",
        "The booking could not be found."
      );
    }

    const bookingData = bookingSnapshot.data();

    if (requireOwner && bookingData.userId !== actorId) {
      throw createBookingError(
        "booking/not-owner",
        "You cannot modify another guest's booking."
      );
    }

    let lockedNights = Array.isArray(bookingData.lockedNights)
      ? bookingData.lockedNights
      : [];

    // Supports bookings made before lockedNights was added.
    if (
      lockedNights.length === 0 &&
      bookingData.roomId &&
      bookingData.checkInDate &&
      bookingData.checkOutDate
    ) {
      lockedNights = enumerateStayNights(
        bookingData.checkInDate,
        bookingData.checkOutDate
      );
    }

    const lockEntries = lockedNights.map((dateString) => ({
      dateString,
      ref: doc(
        db,
        "roomNightLocks",
        getRoomNightLockId(bookingData.roomId, dateString)
      ),
    }));

    const lockSnapshots = [];
    for (const entry of lockEntries) {
      lockSnapshots.push(await transaction.get(entry.ref));
    }

    transaction.update(bookingRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...additionalFields,
    });

    lockSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;

      const lockData = snapshot.data();
      if (lockData.bookingId === bookingId) {
        transaction.delete(lockEntries[index].ref);
      }
    });

    return {
      id: bookingId,
      ...bookingData,
      status: newStatus,
    };
  });
}

/**
 * One-time migration helper for active bookings created before room-night locks.
 * Run this once from an authorized admin/development environment.
 */
export async function backfillActiveBookingNightLocks() {
  const activeBookingsQuery = query(
    collection(db, "roomBookings"),
    where("status", "in", ["booked", "checked-in"])
  );
  const snapshot = await getDocs(activeBookingsQuery);

  const report = {
    total: snapshot.size,
    migrated: 0,
    alreadyLocked: 0,
    skippedMissingDates: 0,
    conflicts: [],
    errors: [],
  };

  for (const bookingDoc of snapshot.docs) {
    const bookingData = bookingDoc.data();

    if (
      !bookingData.roomId ||
      !bookingData.checkInDate ||
      !bookingData.checkOutDate
    ) {
      report.skippedMissingDates += 1;
      continue;
    }

    try {
      const lockedNights = enumerateStayNights(
        bookingData.checkInDate,
        bookingData.checkOutDate
      );
      const lockEntries = lockedNights.map((dateString) => {
        const lockId = getRoomNightLockId(bookingData.roomId, dateString);
        return {
          dateString,
          lockId,
          ref: doc(db, "roomNightLocks", lockId),
        };
      });

      let createdAnyLock = false;
      let allAlreadyOwned = true;

      await runTransaction(db, async (transaction) => {
        const lockSnapshots = [];
        for (const entry of lockEntries) {
          lockSnapshots.push(await transaction.get(entry.ref));
        }

        lockSnapshots.forEach((lockSnapshot, index) => {
          if (!lockSnapshot.exists()) {
            allAlreadyOwned = false;
            return;
          }

          if (lockSnapshot.data().bookingId !== bookingDoc.id) {
            throw createBookingError(
              "booking/migration-conflict",
              `Lock ${lockEntries[index].lockId} belongs to another booking.`,
              {
                bookingId: bookingDoc.id,
                conflictingBookingId: lockSnapshot.data().bookingId,
                conflictDate: lockEntries[index].dateString,
              }
            );
          }
        });

        lockSnapshots.forEach((lockSnapshot, index) => {
          if (lockSnapshot.exists()) return;

          createdAnyLock = true;
          const entry = lockEntries[index];
          transaction.set(entry.ref, {
            roomId: bookingData.roomId,
            date: entry.dateString,
            bookingId: bookingDoc.id,
            userId: bookingData.userId || "",
            status: bookingData.status,
            migratedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        transaction.update(bookingDoc.ref, {
          lockedNights,
          nightLockIds: lockEntries.map((entry) => entry.lockId),
          lockVersion: 1,
          updatedAt: serverTimestamp(),
        });
      });

      if (allAlreadyOwned && !createdAnyLock) {
        report.alreadyLocked += 1;
      } else {
        report.migrated += 1;
      }
    } catch (error) {
      if (error.code === "booking/migration-conflict") {
        report.conflicts.push({
          bookingId: bookingDoc.id,
          conflictDate: error.conflictDate,
          conflictingBookingId: error.conflictingBookingId,
          message: error.message,
        });
      } else {
        report.errors.push({
          bookingId: bookingDoc.id,
          code: error.code || "unknown",
          message: error.message || String(error),
        });
      }
    }
  }

  return report;
}
