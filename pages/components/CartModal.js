import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CartModal({
  visible,
  onClose,
  cart,
  cartTotal,
  onDecreaseQty,
  onIncreaseQty,
  onPlaceOrder,
  placingOrder,
}) {
  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cartModal}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Your Order</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {cart.length === 0 ? (
              <Text style={styles.emptyCartText}>Your cart is empty.</Text>
            ) : (
              cart.map((item) => (
                <View key={item.cartKey} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    {!!item.variantLabel && (
                      <Text style={styles.cartItemVariant}>{item.variantLabel}</Text>
                    )}
                    <Text style={styles.cartItemCategory}>{item.categoryTitle}</Text>
                    <Text style={styles.cartItemPrice}>₱{item.price}</Text>
                  </View>

                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onDecreaseQty(item)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onIncreaseQty(item)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.cartFooter}>
            <Text style={styles.totalText}>Total: ₱{cartTotal}</Text>
            <TouchableOpacity
              style={[styles.orderButton, placingOrder && styles.disabledButton]}
              onPress={onPlaceOrder}
              disabled={placingOrder}
            >
              <Text style={styles.orderButtonText}>
                {placingOrder ? "Placing Order..." : "Place Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  cartModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "75%",
  },

  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  cartTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },

  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  cartItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
  },

  cartItemVariant: {
    fontSize: 12,
    color: "#8b7e74",
  },

  cartItemCategory: {
    fontSize: 12,
    color: "#8b7e74",
  },

  cartItemPrice: {
    fontSize: 14,
    color: "#8b5e34",
    fontWeight: "600",
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#6b4f3a",
    justifyContent: "center",
    alignItems: "center",
  },

  qtyBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  qtyText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: "700",
  },

  cartFooter: {
    marginTop: 12,
  },

  totalText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  orderButton: {
    backgroundColor: "#6b4f3a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  orderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.6,
  },

  emptyCartText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});