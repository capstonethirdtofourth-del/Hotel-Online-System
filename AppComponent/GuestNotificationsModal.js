import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CREAM = "#FFF8E7";
const WHITE = "#FFFFFF";
const BROWN = "#6B3200";
const DEEP_BROWN = "#351706";
const GOLD = "#D8B26A";
const MUTED = "#806D5D";
const SOFT_BROWN = "#F3E5D3";

function formatNotificationDate(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationIcon(item) {
  if (item?.type === "admin_food_cancellation_request") {
    return "restaurant-outline";
  }

  if (item?.type === "admin_food_guest_cancelled") {
    return "close-circle-outline";
  }

  if (item?.type === "admin_request_cancellation_request") {
    return "clipboard-outline";
  }

  if (item?.type === "admin_request_guest_cancelled") {
    return "close-circle-outline";
  }

  if (item?.type === "booking_reminder") {
    return "calendar-outline";
  }

  if (item?.type === "booking_auto_checkout") {
    return "checkmark-done-circle-outline";
  }

  if (item?.type === "booking_expired") {
    return "calendar-clear-outline";
  }

  if (
    String(item?.type || "").startsWith("food_") ||
    item?.source === "food"
  ) {
    if (item?.status === "ready") return "checkmark-circle-outline";
    if (item?.status === "out_for_delivery") return "bicycle-outline";
    if (item?.status === "delivered") return "bag-check-outline";
    if (item?.status === "cancelled") return "close-circle-outline";
    return "restaurant-outline";
  }

  if (
    String(item?.type || "").startsWith("request_") ||
    item?.source === "request"
  ) {
    if (item?.status === "completed") {
      return "checkmark-done-circle-outline";
    }

    if (item?.status === "cancelled") {
      return "close-circle-outline";
    }

    if (item?.status === "ongoing") {
      return "time-outline";
    }

    return "clipboard-outline";
  }

  return "notifications-outline";
}

export default function GuestNotificationsModal({
  visible,
  notifications = [],
  isAdmin = false,
  onClose,
  onClear,
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="notifications" size={21} color={CREAM} />
              </View>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>
                  {isAdmin
                    ? "Guest cancellation requests and cancellations"
                    : "Food, request, and reservation updates"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close notifications"
            >
              <Ionicons name="close" size={24} color={DEEP_BROWN} />
            </TouchableOpacity>
          </View>

          {notifications.length > 0 ? (
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Ionicons name="trash-outline" size={16} color={BROWN} />
              <Text style={styles.clearButtonText}>Clear all</Text>
            </TouchableOpacity>
          ) : null}

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={34}
                    color={BROWN}
                  />
                </View>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyText}>
                  {isAdmin
                    ? "Guest food-order and service-request cancellation requests and direct cancellations will appear here."
                    : "Food updates, service-request updates, and reservation reminders will appear here."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.notificationCard}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name={getNotificationIcon(item)}
                    size={23}
                    color={BROWN}
                  />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardTime}>
                      {formatNotificationDate(item.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.cardMessage}>{item.message}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>
                        {item.statusLabel || item.status}
                      </Text>
                    </View>

                    {item.guestName || item.requestLabel || item.roomName ? (
                      <Text style={styles.requestLabel} numberOfLines={1}>
                        {item.guestName || item.requestLabel || item.roomName}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    height: "78%",
    backgroundColor: CREAM,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 9,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D7C3A7",
    marginBottom: 9,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    color: DEEP_BROWN,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SOFT_BROWN,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  clearButtonText: {
    color: BROWN,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7D2B3",
    padding: 13,
    marginBottom: 11,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SOFT_BROWN,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 11,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardTitle: {
    flex: 1,
    color: DEEP_BROWN,
    fontSize: 15,
    fontWeight: "900",
  },
  cardTime: {
    color: MUTED,
    fontSize: 10,
    marginLeft: 8,
    marginTop: 2,
  },
  cardMessage: {
    color: "#5F4A3A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },
  statusChip: {
    backgroundColor: "#F7E6C9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusChipText: {
    color: BROWN,
    fontSize: 10,
    fontWeight: "900",
  },
  requestLabel: {
    flex: 1,
    color: MUTED,
    fontSize: 10,
    textAlign: "right",
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: SOFT_BROWN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: DEEP_BROWN,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
});
