import {
  arrayUnion,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../FirebaseConfig";

export const FOOD_STATUS_FLOW = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const REQUEST_STATUS_FLOW = [
  "pending",
  "acknowledged",
  "ongoing",
  "completed",
];

export const FOOD_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const REQUEST_STATUS_LABELS = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  confirmed: "Acknowledged",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  unable_to_complete: "Unable to Complete",
  fulfilled: "Completed",
};

const DEFAULT_MESSAGES = {
  orders: {
    pending: "Your food order has been submitted.",
    confirmed: "The hotel confirmed your food order.",
    preparing: "Your food is currently being prepared.",
    ready: "Your food is ready for delivery.",
    out_for_delivery: "Your food is on the way to your room.",
    delivered: "Your food order has been delivered.",
    cancelled: "Your food order was cancelled.",
  },
  requests: {
    pending: "Your service request has been submitted.",
    acknowledged: "The hotel acknowledged your request.",
    ongoing: "Hotel staff are currently handling your request.",
    completed: "Your service request has been completed.",
    fulfilled: "Your service request has been completed.",
    cancelled: "Your service request was cancelled.",
    unable_to_complete: "The hotel could not complete this request.",
  },
};

const STATUS_TIMESTAMP_FIELDS = {
  pending: "submittedAt",
  confirmed: "confirmedAt",
  preparing: "preparingAt",
  ready: "readyAt",
  out_for_delivery: "outForDeliveryAt",
  delivered: "deliveredAt",
  acknowledged: "acknowledgedAt",
  ongoing: "startedAt",
  completed: "completedAt",
  fulfilled: "completedAt",
  cancelled: "cancelledAt",
  unable_to_complete: "unableToCompleteAt",
};

export function getStatusLabel(type, status) {
  if (type === "orders") {
    return FOOD_STATUS_LABELS[status] || status || "Unknown";
  }

  return REQUEST_STATUS_LABELS[status] || status || "Unknown";
}

export function getDefaultStatusMessage(collectionName, status) {
  return (
    DEFAULT_MESSAGES[collectionName]?.[status] ||
    `Status updated to ${getStatusLabel(collectionName === "orders" ? "orders" : "requests", status)}.`
  );
}

export function buildEstimatedCompletion(minutes) {
  const numericMinutes = Number(minutes);

  if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
    return null;
  }

  return Timestamp.fromMillis(Date.now() + numericMinutes * 60 * 1000);
}

export async function updateActivityStatus({
  collectionName,
  documentId,
  status,
  estimatedMinutes = null,
  statusMessage = "",
  actorId = "admin",
}) {
  if (!collectionName || !documentId || !status) {
    throw new Error("Missing status update information.");
  }

  const message =
    statusMessage.trim() || getDefaultStatusMessage(collectionName, status);
  const now = Timestamp.now();
  const estimate = buildEstimatedCompletion(estimatedMinutes);
  const terminalStatuses = [
    "delivered",
    "completed",
    "fulfilled",
    "cancelled",
    "unable_to_complete",
  ];

  const payload = {
    status,
    statusMessage: message,
    updatedAt: serverTimestamp(),
    updatedBy: actorId || "admin",
    statusHistory: arrayUnion({
      status,
      message,
      changedAt: now,
      changedBy: actorId || "admin",
    }),
  };

  const timestampField = STATUS_TIMESTAMP_FIELDS[status];
  if (timestampField) {
    payload[timestampField] = serverTimestamp();
  }

  if (estimate) {
    payload.estimatedMinutes = Number(estimatedMinutes);
    payload.estimatedCompletionAt = estimate;
  } else {
    payload.estimatedMinutes = null;
    payload.estimatedCompletionAt = null;
  }

  await updateDoc(doc(db, collectionName, documentId), payload);
}
