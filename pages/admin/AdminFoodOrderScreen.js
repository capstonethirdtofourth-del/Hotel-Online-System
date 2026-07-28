import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";
import StatusTimeline from "../components/StatusTimeline";
import {
  FOOD_STATUS_FLOW,
  FOOD_STATUS_LABELS,
  getDefaultStatusMessage,
  updateActivityStatus,
} from "../../services/activityStatusService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "kitchen", label: "Kitchen" },
  { key: "delivery", label: "Delivery" },
  { key: "finished", label: "Finished" },
];

const ESTIMATE_OPTIONS = [5, 10, 15, 20, 30, 45];
const STATUS_OPTIONS = [...FOOD_STATUS_FLOW, "cancelled"];

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
}

function formatDateTime(value) {
  const date = timestampToDate(value);
  if (!date) return "No date";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOrderTitle(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return "Food Order";
  }

  const first = order.items[0]?.name || "Food Order";
  return order.items.length > 1 ? `${first} +${order.items.length - 1} more` : first;
}

function getTimeValue(item) {
  return item.createdAt?.seconds || item.updatedAt?.seconds || 0;
}

function matchesFilter(order, filter) {
  const status = order.status || "pending";

  if (filter === "all") return true;
  if (filter === "new") return ["pending", "confirmed"].includes(status);
  if (filter === "kitchen") return ["preparing", "ready"].includes(status);
  if (filter === "delivery") return status === "out_for_delivery";
  if (filter === "finished") return ["delivered", "cancelled"].includes(status);
  return true;
}

export default function AdminFoodOrderScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        data.sort((a, b) => getTimeValue(b) - getTimeValue(a));
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.log("Admin order listener error:", error);
        setLoading(false);
        Alert.alert("Error", "Failed to load food orders.");
      }
    );

    return unsubscribe;
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, activeFilter)),
    [orders, activeFilter]
  );

  const openOrder = (order) => {
    const status = order.status || "pending";
    setSelectedOrder(order);
    setSelectedStatus(status);
    setEstimatedMinutes(
      Number(order.estimatedMinutes) > 0 ? String(order.estimatedMinutes) : ""
    );
    setStatusMessage(
      order.statusMessage || getDefaultStatusMessage("orders", status)
    );
  };

  const closeOrder = () => {
    if (saving) return;
    setSelectedOrder(null);
    setEstimatedMinutes("");
    setStatusMessage("");
  };

  const chooseStatus = (status) => {
    setSelectedStatus(status);
    setStatusMessage(getDefaultStatusMessage("orders", status));

    if (["delivered", "cancelled"].includes(status)) {
      setEstimatedMinutes("");
    }
  };

  const saveUpdate = async () => {
    if (!selectedOrder || saving) return;

    const numericEstimate = estimatedMinutes.trim()
      ? Number(estimatedMinutes)
      : null;

    if (
      estimatedMinutes.trim() &&
      (!Number.isFinite(numericEstimate) || numericEstimate <= 0)
    ) {
      Alert.alert("Invalid Estimate", "Enter a valid number of minutes.");
      return;
    }

    try {
      setSaving(true);

      await updateActivityStatus({
        collectionName: "orders",
        documentId: selectedOrder.id,
        status: selectedStatus,
        estimatedMinutes: numericEstimate,
        statusMessage,
        actorId: auth.currentUser?.uid || "admin",
      });

      Alert.alert("Order Updated", "The guest can now see the new order status.");
      setSelectedOrder(null);
      setEstimatedMinutes("");
      setStatusMessage("");
    } catch (error) {
      console.log("Order status update error:", error);
      Alert.alert("Error", "Failed to update the order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#6b3200" />
        <Text style={styles.loadingText}>Loading food orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Order Management</Text>
        <Text style={styles.headerSubtitle}>
          Update preparation, delivery, and estimated time
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          const count = orders.filter((order) => matchesFilter(order, filter.key)).length;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="restaurant-outline" size={42} color="#9a8a7d" />
            <Text style={styles.emptyTitle}>No orders in this section</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const status = order.status || "pending";

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.card}
                onPress={() => openOrder(order)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBox}>
                    <Text style={styles.cardTitle}>{getOrderTitle(order)}</Text>
                    <Text style={styles.metaText}>
                      Guest: {order.guestName || order.userFullName || order.userEmail || "Unknown"}
                    </Text>
                    <Text style={styles.metaText}>
                      Room: {order.roomName || order.roomNumber || "Not assigned"}
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

                <View style={styles.itemList}>
                  {(order.items || []).slice(0, 3).map((item, index) => (
                    <Text key={`${item.name}-${index}`} style={styles.itemText}>
                      {item.quantity || 1}× {item.name}
                      {item.variantLabel ? ` (${item.variantLabel})` : ""}
                    </Text>
                  ))}
                  {(order.items || []).length > 3 ? (
                    <Text style={styles.moreText}>
                      +{order.items.length - 3} more item(s)
                    </Text>
                  ) : null}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.totalText}>
                    ₱{Number(order.total || 0).toLocaleString("en-PH")}
                  </Text>
                  <Text style={styles.openText}>Manage order ›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={closeOrder}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Update Food Order</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedOrder ? getOrderTitle(selectedOrder) : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={closeOrder} disabled={saving}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Guest: {selectedOrder.guestName || selectedOrder.userFullName || selectedOrder.userEmail || "Unknown"}
                  </Text>
                  <Text style={styles.infoText}>
                    Room: {selectedOrder.roomName || selectedOrder.roomNumber || "Not assigned"}
                  </Text>
                  <Text style={styles.infoText}>
                    Total: ₱{Number(selectedOrder.total || 0).toLocaleString("en-PH")}
                  </Text>
                </View>

                <StatusTimeline type="orders" status={selectedOrder.status || "pending"} />

                <Text style={styles.sectionTitle}>New Status</Text>
                <View style={styles.chipWrap}>
                  {STATUS_OPTIONS.map((status) => {
                    const active = selectedStatus === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusChip, active && styles.statusChipActive]}
                        onPress={() => chooseStatus(status)}
                      >
                        <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                          {FOOD_STATUS_LABELS[status] || status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sectionTitle}>Estimated Time</Text>
                <View style={styles.chipWrap}>
                  {ESTIMATE_OPTIONS.map((minutes) => {
                    const active = estimatedMinutes === String(minutes);
                    return (
                      <TouchableOpacity
                        key={minutes}
                        style={[styles.estimateChip, active && styles.estimateChipActive]}
                        onPress={() => setEstimatedMinutes(String(minutes))}
                      >
                        <Text style={[styles.estimateChipText, active && styles.estimateChipTextActive]}>
                          {minutes} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.input}
                  value={estimatedMinutes}
                  onChangeText={(value) => setEstimatedMinutes(value.replace(/[^0-9]/g, ""))}
                  placeholder="Custom minutes (optional)"
                  keyboardType="number-pad"
                  editable={!saving}
                />

                <Text style={styles.sectionTitle}>Message to Guest</Text>
                <TextInput
                  style={styles.textArea}
                  value={statusMessage}
                  onChangeText={setStatusMessage}
                  placeholder="Example: Your food is being prepared."
                  multiline
                  textAlignVertical="top"
                  editable={!saving}
                />

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.disabledButton]}
                  onPress={saveUpdate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Status Update</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CREAM = "#FFF8E7";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#3d2b1f",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#7a6a5f",
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    backgroundColor: "#ece7e2",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#6b4f3a",
  },
  filterText: {
    color: "#5f5248",
    fontWeight: "700",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee3db",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardTitleBox: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2f241d",
  },
  metaText: {
    fontSize: 11,
    color: "#7d6d61",
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#f2e5d8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 110,
  },
  statusBadgeText: {
    color: "#6b3200",
    fontWeight: "800",
    fontSize: 10,
    textAlign: "center",
  },
  itemList: {
    marginTop: 10,
    backgroundColor: "#faf7f4",
    borderRadius: 12,
    padding: 10,
  },
  itemText: {
    fontSize: 12,
    color: "#51473f",
    marginBottom: 3,
  },
  moreText: {
    fontSize: 11,
    color: "#8b7e74",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  totalText: {
    fontSize: 16,
    color: "#8b5e34",
    fontWeight: "800",
  },
  openText: {
    fontSize: 12,
    color: "#6b3200",
    fontWeight: "700",
  },
  loaderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CREAM,
  },
  loadingText: {
    color: "#7a6a5f",
    marginTop: 10,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 70,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#66584d",
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  modalCard: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalSubtitle: {
    marginTop: 3,
    color: "#7d6d61",
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
  },
  infoText: {
    color: "#51473f",
    fontSize: 13,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3d2b1f",
    marginTop: 18,
    marginBottom: 9,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  statusChipActive: {
    backgroundColor: "#6b4f3a",
    borderColor: "#6b4f3a",
  },
  statusChipText: {
    color: "#5d5046",
    fontSize: 12,
    fontWeight: "700",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  estimateChip: {
    borderWidth: 1,
    borderColor: "#e0c7ad",
    backgroundColor: "#fffaf2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
  },
  estimateChipActive: {
    backgroundColor: "#8b5e34",
    borderColor: "#8b5e34",
  },
  estimateChipText: {
    color: "#6b4f3a",
    fontSize: 12,
    fontWeight: "700",
  },
  estimateChipTextActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 13,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 12,
    minHeight: 100,
    padding: 13,
  },
  saveButton: {
    backgroundColor: "#6b4f3a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    marginBottom: 15,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
