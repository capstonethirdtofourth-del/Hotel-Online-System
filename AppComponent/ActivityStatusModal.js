import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusTimeline from "../pages/components/StatusTimeline";
import {
  FOOD_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from "../services/activityStatusService";

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  return null;
}

function formatDateTime(value) {
  const date = timestampToDate(value);
  if (!date) return "Not set";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEstimate(item) {
  const target = timestampToDate(item.estimatedCompletionAt);

  if (target) {
    const remaining = Math.ceil((target.getTime() - Date.now()) / 60000);
    const clockTime = target.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (remaining > 0) {
      return `About ${remaining} minute${remaining === 1 ? "" : "s"} • ${clockTime}`;
    }

    return `Expected around ${clockTime}`;
  }

  if (Number(item.estimatedMinutes) > 0) {
    return `${item.estimatedMinutes} minutes`;
  }

  return null;
}

function getOrderTitle(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return "Food Order";
  }

  const firstName = order.items[0]?.name || "Food Order";
  return order.items.length > 1
    ? `${firstName} +${order.items.length - 1} more`
    : firstName;
}

function getRequestTitle(request) {
  return request.requestTypeLabels?.join(", ") || "Service Request";
}

function getTimestampValue(item) {
  return (
    item.updatedAt?.seconds ||
    item.createdAt?.seconds ||
    item.updatedAt?.toMillis?.() / 1000 ||
    item.createdAt?.toMillis?.() / 1000 ||
    0
  );
}

function normalizeFoodStatus(status) {
  const normalized = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    ongoing: "preparing",
    in_progress: "preparing",
    inprogress: "preparing",
    cooking: "preparing",
    to_be_delivered: "out_for_delivery",
    to_deliver: "out_for_delivery",
    for_delivery: "out_for_delivery",
    outfordelivery: "out_for_delivery",
    completed: "delivered",
    complete: "delivered",
    canceled: "cancelled",
  };

  return aliases[normalized] || normalized;
}

function normalizeRequestStatus(status) {
  const normalized = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    confirmed: "acknowledged",
    in_progress: "ongoing",
    inprogress: "ongoing",
    processing: "ongoing",
    fulfilled: "completed",
    complete: "completed",
    canceled: "cancelled",
  };

  return aliases[normalized] || normalized;
}

export default function ActivityStatusModal({
  visible,
  onClose,
  orders = [],
  requests = [],
  loading = false,
  onCancelOrder,
  onCancelRequest,
  cancellingOrderId,
  cancellingRequestId,
}) {
  const [activeTab, setActiveTab] = useState("orders");

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => getTimestampValue(b) - getTimestampValue(a)),
    [orders]
  );

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => getTimestampValue(b) - getTimestampValue(a)),
    [requests]
  );

  const items = activeTab === "orders" ? sortedOrders : sortedRequests;

  const renderOrder = (order) => {
    const status = normalizeFoodStatus(order.status);
    const estimate = formatEstimate(order);
    const directCancellable = ["pending", "confirmed"].includes(status);
    const canRequestCancellation =
      status === "preparing" &&
      !["pending", "rejected", "approved"].includes(
        order.cancellationRequestStatus || ""
      );
    const cancellationPending = order.cancellationRequestStatus === "pending";
    const cancellationRejected = order.cancellationRequestStatus === "rejected";
    const cancellationLocked = ["ready", "out_for_delivery"].includes(status);
    const isCancelling = cancellingOrderId === order.id;

    return (
      <View key={order.id} style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.titleBox}>
            <Text style={styles.cardTitle}>{getOrderTitle(order)}</Text>
            <Text style={styles.metaText}>
              {order.roomName || order.roomNumber
                ? `Delivery: ${order.roomName || order.roomNumber}`
                : "Delivery room not assigned"}
            </Text>
            <Text style={styles.metaText}>
              Ordered: {formatDateTime(order.createdAt)}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {FOOD_STATUS_LABELS[status] || status}
            </Text>
          </View>
        </View>

        <Text style={styles.messageText}>
          {order.statusMessage || "Your food order has been submitted."}
        </Text>

        {estimate ? (
          <View style={styles.estimateBox}>
            <Ionicons name="time-outline" size={17} color="#6b3200" />
            <Text style={styles.estimateText}>Estimated: {estimate}</Text>
          </View>
        ) : null}

        <StatusTimeline type="orders" status={status} />

        <View style={styles.footerRow}>
          <Text style={styles.totalText}>
            Total: ₱{Number(order.total || 0).toLocaleString("en-PH")}
          </Text>

          {onCancelOrder ? (
            directCancellable ? (
              <TouchableOpacity
                style={[styles.cancelButton, isCancelling && styles.disabledButton]}
                onPress={() => onCancelOrder(order)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Text>
              </TouchableOpacity>
            ) : canRequestCancellation ? (
              <TouchableOpacity
                style={[
                  styles.requestCancelButton,
                  isCancelling && styles.disabledButton,
                ]}
                onPress={() => onCancelOrder(order)}
                disabled={isCancelling}
              >
                <Text style={styles.requestCancelButtonText}>
                  {isCancelling ? "Sending..." : "Request Cancellation"}
                </Text>
              </TouchableOpacity>
            ) : cancellationPending ? (
              <View style={styles.pendingCancellationActions}>
                <View style={styles.pendingCancellationPill}>
                  <Ionicons name="time-outline" size={14} color="#8A5B25" />
                  <Text style={styles.pendingCancellationText}>
                    Cancellation Requested
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.withdrawCancellationButton,
                    isCancelling && styles.disabledButton,
                  ]}
                  onPress={() => onCancelOrder(order)}
                  disabled={isCancelling}
                >
                  <Text style={styles.withdrawCancellationText}>
                    {isCancelling
                      ? "Updating..."
                      : "Cancel Cancellation Request"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : cancellationRejected ? (
              <View style={styles.rejectedCancellationPill}>
                <Text style={styles.rejectedCancellationText}>
                  Cancellation Declined
                </Text>
              </View>
            ) : cancellationLocked ? (
              <View style={styles.unavailableCancellationPill}>
                <Text style={styles.unavailableCancellationText}>
                  Cancellation Unavailable
                </Text>
              </View>
            ) : null
          ) : null}
        </View>
      </View>
    );
  };

  const renderRequest = (request) => {
    const normalizedStatus = normalizeRequestStatus(request.status);
    const estimate = formatEstimate(request);
    const directCancellable = ["pending", "acknowledged"].includes(
      normalizedStatus
    );
    const canRequestCancellation =
      normalizedStatus === "ongoing" &&
      !["pending", "rejected", "approved"].includes(
        request.cancellationRequestStatus || ""
      );
    const cancellationPending =
      request.cancellationRequestStatus === "pending";
    const cancellationRejected =
      request.cancellationRequestStatus === "rejected";
    const isCancelling = cancellingRequestId === request.id;

    return (
      <View key={request.id} style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.titleBox}>
            <Text style={styles.cardTitle}>{getRequestTitle(request)}</Text>
            <Text style={styles.requestText}>
              {request.requestText || "No request details"}
            </Text>
            <Text style={styles.metaText}>
              Room: {request.roomName || "Not assigned"}
            </Text>
            <Text style={styles.metaText}>
              Submitted: {formatDateTime(request.createdAt)}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {REQUEST_STATUS_LABELS[normalizedStatus] || normalizedStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.messageText}>
          {request.statusMessage || "Your request has been submitted."}
        </Text>

        {estimate ? (
          <View style={styles.estimateBox}>
            <Ionicons name="time-outline" size={17} color="#6b3200" />
            <Text style={styles.estimateText}>Estimated: {estimate}</Text>
          </View>
        ) : null}

        <StatusTimeline type="requests" status={normalizedStatus} />

        {onCancelRequest ? (
          <View style={styles.requestFooter}>
            {directCancellable ? (
              <TouchableOpacity
                style={[styles.cancelButton, isCancelling && styles.disabledButton]}
                onPress={() => onCancelRequest(request)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? "Cancelling..." : "Cancel Request"}
                </Text>
              </TouchableOpacity>
            ) : canRequestCancellation ? (
              <TouchableOpacity
                style={[
                  styles.requestCancelButton,
                  isCancelling && styles.disabledButton,
                ]}
                onPress={() => onCancelRequest(request)}
                disabled={isCancelling}
              >
                <Text style={styles.requestCancelButtonText}>
                  {isCancelling ? "Sending..." : "Request Cancellation"}
                </Text>
              </TouchableOpacity>
            ) : cancellationPending ? (
              <View style={styles.pendingCancellationActions}>
                <View style={styles.pendingCancellationPill}>
                  <Ionicons name="time-outline" size={14} color="#8A5B25" />
                  <Text style={styles.pendingCancellationText}>
                    Cancellation Requested
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.withdrawCancellationButton,
                    isCancelling && styles.disabledButton,
                  ]}
                  onPress={() => onCancelRequest(request)}
                  disabled={isCancelling}
                >
                  <Text style={styles.withdrawCancellationText}>
                    {isCancelling
                      ? "Updating..."
                      : "Cancel Cancellation Request"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : cancellationRejected ? (
              <View style={styles.rejectedCancellationPill}>
                <Text style={styles.rejectedCancellationText}>
                  Cancellation Declined
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>My Activity Status</Text>
              <Text style={styles.headerSubtitle}>
                Live progress for food and service requests
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={27} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "orders" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("orders")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "orders" && styles.activeTabText,
                ]}
              >
                Food Orders ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "requests" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("requests")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "requests" && styles.activeTabText,
                ]}
              >
                Requests ({requests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6b3200" />
              <Text style={styles.loadingText}>Loading live status...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {items.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name={activeTab === "orders" ? "restaurant-outline" : "clipboard-outline"}
                    size={40}
                    color="#9a8a7d"
                  />
                  <Text style={styles.emptyTitle}>
                    No {activeTab === "orders" ? "food orders" : "requests"} yet
                  </Text>
                  <Text style={styles.emptyText}>
                    New activity will appear here automatically.
                  </Text>
                </View>
              ) : activeTab === "orders" ? (
                items.map(renderOrder)
              ) : (
                items.map(renderRequest)
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const CREAM = "#FFF8E7";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  modalCard: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    maxHeight: "90%",
    minHeight: "62%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#7d6d61",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#ece4dd",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  activeTab: {
    backgroundColor: "#6b4f3a",
  },
  tabText: {
    fontSize: 12,
    color: "#66584d",
    fontWeight: "700",
  },
  activeTabText: {
    color: "#fff",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eadfd6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  titleBox: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2f241d",
  },
  requestText: {
    fontSize: 13,
    color: "#534940",
    marginTop: 5,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 11,
    color: "#88786c",
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#f2e5d8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  statusBadgeText: {
    color: "#6b3200",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  messageText: {
    marginTop: 12,
    backgroundColor: "#faf6f2",
    borderRadius: 12,
    padding: 10,
    color: "#53463d",
    fontSize: 13,
    lineHeight: 19,
  },
  estimateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  estimateText: {
    marginLeft: 7,
    color: "#6b4d18",
    fontSize: 12,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  requestFooter: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  totalText: {
    color: "#6b3200",
    fontWeight: "800",
  },
  cancelButton: {
    backgroundColor: "#b84040",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  requestCancelButton: {
    backgroundColor: "#8A5B25",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  requestCancelButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  pendingCancellationActions: {
    alignItems: "flex-end",
  },
  withdrawCancellationButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#8A5B25",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  withdrawCancellationText: {
    color: "#8A5B25",
    fontSize: 10,
    fontWeight: "800",
  },
  pendingCancellationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0CE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pendingCancellationText: {
    color: "#8A5B25",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },
  rejectedCancellationPill: {
    backgroundColor: "#FCE8E8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rejectedCancellationText: {
    color: "#A33A3A",
    fontSize: 11,
    fontWeight: "800",
  },
  unavailableCancellationPill: {
    backgroundColor: "#ECE7E2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  unavailableCancellationText: {
    color: "#83766C",
    fontSize: 11,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loaderBox: {
    flex: 1,
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#7d6d61",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 70,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#51443a",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#8b7e74",
    marginTop: 5,
  },
});
