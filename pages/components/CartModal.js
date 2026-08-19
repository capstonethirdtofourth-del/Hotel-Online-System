import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CartModal({
  visible,
  onClose,
  cart,
  cartTotal,
  onDecreaseQty,
  onIncreaseQty,
  onUpdatePreferences,
  onPlaceOrder,
  placingOrder,
}) {
  const insets = useSafeAreaInsets();
  const [editingItemId, setEditingItemId] = useState(null);
  const [preferenceDraft, setPreferenceDraft] = useState("");
  const [savingPreferenceId, setSavingPreferenceId] = useState(null);

  useEffect(() => {
    if (!visible) {
      setEditingItemId(null);
      setPreferenceDraft("");
      setSavingPreferenceId(null);
    }
  }, [visible]);

  const startEditingPreference = (item) => {
    if (placingOrder || savingPreferenceId) return;

    setEditingItemId(item.id);
    setPreferenceDraft(item.preferences || "");
  };

  const cancelEditingPreference = () => {
    if (savingPreferenceId) return;

    setEditingItemId(null);
    setPreferenceDraft("");
  };

  const savePreference = async (item) => {
    if (!onUpdatePreferences || savingPreferenceId) return;

    try {
      setSavingPreferenceId(item.id);

      const saved = await onUpdatePreferences(item, preferenceDraft);

      if (saved !== false) {
        setEditingItemId(null);
        setPreferenceDraft("");
      }
    } finally {
      setSavingPreferenceId(null);
    }
  };
  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.cartModal}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Your Order</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

                    {editingItemId === item.id ? (
                      <View style={styles.preferenceEditor}>
                        <Text style={styles.preferenceEditorLabel}>
                          Food Preferences
                        </Text>

                        <TextInput
                          style={styles.preferenceInput}
                          value={preferenceDraft}
                          onChangeText={setPreferenceDraft}
                          placeholder="e.g. More sauce, no onions..."
                          placeholderTextColor="#9b8d82"
                          multiline
                          maxLength={200}
                          textAlignVertical="top"
                          editable={savingPreferenceId !== item.id}
                        />

                        <View style={styles.preferenceEditorFooter}>
                          <Text style={styles.preferenceCount}>
                            {preferenceDraft.length}/200
                          </Text>

                          <View style={styles.preferenceEditorActions}>
                            <TouchableOpacity
                              style={styles.preferenceCancelButton}
                              onPress={cancelEditingPreference}
                              disabled={savingPreferenceId === item.id}
                            >
                              <Text style={styles.preferenceCancelText}>
                                Cancel
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.preferenceSaveButton,
                                savingPreferenceId === item.id &&
                                  styles.preferenceSaveButtonDisabled,
                              ]}
                              onPress={() => savePreference(item)}
                              disabled={savingPreferenceId === item.id}
                            >
                              {savingPreferenceId === item.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.preferenceSaveText}>
                                  Save
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.preferenceRow}>
                        {item.preferences ? (
                          <View style={styles.preferenceBox}>
                            <Ionicons
                              name="create-outline"
                              size={13}
                              color="#6b4f3a"
                            />
                            <Text style={styles.preferenceText}>
                              {item.preferences}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noPreferenceText}>
                            No food preferences
                          </Text>
                        )}

                        <TouchableOpacity
                          style={styles.editPreferenceButton}
                          onPress={() => startEditingPreference(item)}
                          disabled={placingOrder || !!savingPreferenceId}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={13}
                            color="#6b3200"
                          />
                          <Text style={styles.editPreferenceText}>
                            {item.preferences ? "Edit" : "Add note"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.cartItemPrice}>₱{item.price}</Text>
                  </View>

                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onDecreaseQty(item)}
                      disabled={
                        placingOrder ||
                        savingPreferenceId === item.id ||
                        editingItemId === item.id
                      }
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onIncreaseQty(item)}
                      disabled={
                        placingOrder ||
                        savingPreferenceId === item.id ||
                        editingItemId === item.id
                      }
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
              disabled={placingOrder || !!editingItemId || !!savingPreferenceId}
            >
              <Text style={styles.orderButtonText}>
                {placingOrder
                  ? "Placing Order..."
                  : editingItemId
                  ? "Save or cancel your note first"
                  : "Place Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  cartModal: {
    backgroundColor: CREAM,
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

  preferenceRow: {
    marginTop: 6,
    marginRight: 8,
  },

  noPreferenceText: {
    color: "#9b8d82",
    fontSize: 12,
    fontStyle: "italic",
  },

  editPreferenceButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 5,
    paddingVertical: 3,
  },

  editPreferenceText: {
    color: "#6b3200",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  preferenceEditor: {
    backgroundColor: "#f7efe6",
    borderRadius: 10,
    padding: 9,
    marginTop: 7,
    marginRight: 8,
  },

  preferenceEditorLabel: {
    color: "#6b3200",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  preferenceInput: {
    minHeight: 72,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9cfc6",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
    color: "#2f241d",
    fontSize: 13,
  },

  preferenceEditorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  preferenceCount: {
    color: "#8b7e74",
    fontSize: 10,
  },

  preferenceEditorActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  preferenceCancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 6,
  },

  preferenceCancelText: {
    color: "#6b4f3a",
    fontSize: 12,
    fontWeight: "700",
  },

  preferenceSaveButton: {
    minWidth: 58,
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: "#6b3200",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
  },

  preferenceSaveButtonDisabled: {
    opacity: 0.6,
  },

  preferenceSaveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  preferenceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f7efe6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    marginRight: 8,
  },

  preferenceText: {
    flex: 1,
    color: "#6b4f3a",
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 5,
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