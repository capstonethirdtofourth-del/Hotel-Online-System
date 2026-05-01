import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OrdersModal({
  visible,
  onClose,
  loadingOrders,
  userOrders,
  onCancelOrder,
  cancellingOrderId,
}) {
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const openCancelModal = (order) => {
    setSelectedOrder(order);
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    if (cancellingOrderId) return;
    setCancelModalVisible(false);
    setSelectedOrder(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;

    const success = await onCancelOrder(selectedOrder);

    if (success) {
      setCancelModalVisible(false);
      setSelectedOrder(null);
    }
  };

  return (
    <>
      <Modal
        animationType="slide"
        visible={visible}
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ordersModal}>
            <View style={styles.header}>
              <Text style={styles.title}>My Orders</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            {loadingOrders ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color="#6b4f3a" />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {userOrders.length === 0 ? (
                  <Text style={styles.emptyText}>No cancellable orders found.</Text>
                ) : (
                  userOrders.map((order) => (
                    <View key={order.id} style={styles.orderItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderName}>
                          {order.items?.length > 0
                            ? `${order.items[0].name}${
                                order.items.length > 1
                                  ? ` +${order.items.length - 1} more`
                                  : ""
                              }`
                            : "No items"}
                        </Text>

                        <Text style={styles.orderStatus}>
                          Status: {order.status}
                        </Text>

                        <Text style={styles.orderPrice}>₱{order.total}</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          cancellingOrderId === order.id && styles.disabledButton,
                        ]}
                        onPress={() => openCancelModal(order)}
                        disabled={cancellingOrderId === order.id}
                      >
                        <Text style={styles.cancelButtonText}>
                          {cancellingOrderId === order.id
                            ? "Cancelling..."
                            : "Cancel"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={closeCancelModal}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Cancel Order?</Text>

            <Text style={styles.confirmText}>
              Are you sure you want to cancel{" "}
              <Text style={{ fontWeight: "700" }}>
                {selectedOrder?.items?.length > 0
                  ? selectedOrder.items[0].name
                  : "this order"}
              </Text>
              ?
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={closeCancelModal}
                disabled={!!cancellingOrderId}
              >
                <Text style={styles.secondaryButtonText}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !!cancellingOrderId && styles.disabledButton,
                ]}
                onPress={handleConfirmCancel}
                disabled={!!cancellingOrderId}
              >
                <Text style={styles.primaryButtonText}>
                  {cancellingOrderId ? "Cancelling..." : "Yes, Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  ordersModal: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  loaderBox: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
    fontSize: 15,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  orderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
  },
  orderStatus: {
    fontSize: 12,
    color: "#8b7e74",
    marginTop: 4,
  },
  orderPrice: {
    fontSize: 14,
    color: "#8b5e34",
    marginTop: 4,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#b84040",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmModal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 15,
    color: "#5f5a55",
    marginBottom: 18,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#ece7e2",
    marginRight: 10,
  },
  secondaryButtonText: {
    color: "#4a3b31",
    fontWeight: "700",
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#b84040",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});