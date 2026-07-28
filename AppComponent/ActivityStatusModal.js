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
    const status = order.status || "pending";
    const estimate = formatEstimate(order);
    const cancellable = ["pending", "confirmed"].includes(status);
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

          {cancellable && onCancelOrder ? (
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.disabledButton]}
              onPress={() => onCancelOrder(order)}
              disabled={isCancelling}
            >
              <Text style={styles.cancelButtonText}>
                {isCancelling ? "Cancelling..." : "Cancel"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderRequest = (request) => {
    const normalizedStatus =
      request.status === "fulfilled"
        ? "completed"
        : request.status === "confirmed"
        ? "acknowledged"
        : request.status || "pending";
    const estimate = formatEstimate(request);
    const cancellable = ["pending", "acknowledged"].includes(normalizedStatus);
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

        {cancellable && onCancelRequest ? (
          <View style={styles.requestFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.disabledButton]}
              onPress={() => onCancelRequest(request)}
              disabled={isCancelling}
            >
              <Text style={styles.cancelButtonText}>
                {isCancelling ? "Cancelling..." : "Cancel Request"}
              </Text>
            </TouchableOpacity>
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
