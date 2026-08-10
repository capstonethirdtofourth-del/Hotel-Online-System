import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../FirebaseConfig";

const FOOD_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const REQUEST_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Acknowledged",
  acknowledged: "Acknowledged",
  ongoing: "Ongoing",
  completed: "Completed",
  fulfilled: "Completed",
  unable_to_complete: "Unable to Complete",
  cancelled: "Cancelled",
};

export async function createUserNotification({
  userId,
  type,
  source,
  title,
  message,
  status = "",
  statusLabel = "",
  bookingId = "",
  orderId = "",
  requestId = "",
  roomName = "",
  requestLabel = "",
  eventDate = "",
}) {
  if (!userId) {
    console.log("Notification skipped: missing userId");
    return null;
  }

  return addDoc(
    collection(db, "users", userId, "notifications"),
    {
      userId,
      type: type || "general",
      source: source || "general",
      title: title || "H&K Home Kafe update",
      message: message || "",
      status,
      statusLabel: statusLabel || status,
      bookingId,
      orderId,
      requestId,
      roomName,
      requestLabel,
      eventDate,
      read: false,
      dismissed: false,
      createdAt: serverTimestamp(),
    }
  );
}

export function createFoodStatusNotification({
  order,
  status,
  message,
  type = "food_status_update",
  title = "Food order updated",
}) {
  if (!order?.userId) return Promise.resolve(null);

  return createUserNotification({
    userId: order.userId,
    type,
    source: "food",
    title,
    message:
      message ||
      `Your food order is now ${FOOD_STATUS_LABELS[status] || status}.`,
    status,
    statusLabel: FOOD_STATUS_LABELS[status] || status,
    orderId: order.id || "",
    bookingId: order.bookingId || "",
    roomName: order.roomName || order.roomNumber || "",
  });
}

export function createRequestStatusNotification({
  request,
  status,
  message,
  type = "request_status_update",
  title = "Request status updated",
}) {
  if (!request?.userId) return Promise.resolve(null);

  const requestLabel =
    request.requestTypeLabels?.join(", ") || "Service Request";

  return createUserNotification({
    userId: request.userId,
    type,
    source: "request",
    title,
    message:
      message ||
      `Your ${requestLabel} request is now ${
        REQUEST_STATUS_LABELS[status] || status
      }.`,
    status,
    statusLabel: REQUEST_STATUS_LABELS[status] || status,
    requestId: request.id || "",
    bookingId: request.bookingId || "",
    roomName: request.roomName || "",
    requestLabel,
  });
}
