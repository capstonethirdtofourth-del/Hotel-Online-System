import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

export default function ItemOptionsModal({
  visible,
  onClose,
  selectedItem,
  selectedVariant,
  setSelectedVariant,
  selectedQty,
  setSelectedQty,
  getItemVariants,
  addingToCart,
  onConfirmAddToCart,
}) {
  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.optionModal}>
          <View style={styles.header}>
            <Text style={styles.title}>Customize Order</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedItem && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalItemName}>{selectedItem.name}</Text>
              <Text style={styles.modalItemCategory}>
                {selectedItem.categoryTitle}
              </Text>

              <Text style={styles.optionSectionTitle}>Choose option</Text>
              <View style={styles.variantWrap}>
                {getItemVariants(selectedItem).map((variant) => {
                  const active = selectedVariant?.key === variant.key;

                  return (
                    <TouchableOpacity
                      key={variant.key}
                      style={[
                        styles.variantButton,
                        active && styles.variantButtonActive,
                      ]}
                      onPress={() => setSelectedVariant(variant)}
                    >
                      <Text
                        style={[
                          styles.variantButtonText,
                          active && styles.variantButtonTextActive,
                        ]}
                      >
                        {variant.label}
                      </Text>
                      <Text
                        style={[
                          styles.variantPriceText,
                          active && styles.variantButtonTextActive,
                        ]}
                      >
                        ₱{variant.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.optionSectionTitle}>
                Quantity: {selectedQty}
              </Text>

              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={selectedQty}
                onValueChange={setSelectedQty}
                minimumTrackTintColor="#6b4f3a"
                maximumTrackTintColor="#d9d1ca"
                thumbTintColor="#6b4f3a"
              />

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1</Text>
                <Text style={styles.sliderLabelText}>10</Text>
              </View>

              <View style={styles.modalSummaryBox}>
                <Text style={styles.modalSummaryText}>
                  Selected: {selectedVariant?.label || "Regular"}
                </Text>
                <Text style={styles.modalSummaryText}>
                  Total: ₱{(selectedVariant?.price || 0) * selectedQty}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.orderButton,
                  addingToCart && styles.disabledButton,
                ]}
                onPress={onConfirmAddToCart}
                disabled={addingToCart}
              >
                <Text style={styles.orderButtonText}>
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
  optionModal: {
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
  modalItemName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalItemCategory: {
    fontSize: 13,
    color: "#8b7e74",
    marginTop: 4,
    marginBottom: 16,
  },
  optionSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3d2b1f",
    marginBottom: 10,
    marginTop: 8,
  },
  variantWrap: {
    gap: 10,
  },
  variantButton: {
    borderWidth: 1,
    borderColor: "#e5ddd6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantButtonActive: {
    backgroundColor: "#6b4f3a",
    borderColor: "#6b4f3a",
  },
  variantButtonText: {
    color: "#3d2b1f",
    fontSize: 15,
    fontWeight: "700",
  },
  variantButtonTextActive: {
    color: "#fff",
  },
  variantPriceText: {
    color: "#8b5e34",
    fontSize: 14,
    fontWeight: "700",
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderLabelText: {
    color: "#8b7e74",
    fontSize: 12,
  },
  modalSummaryBox: {
    backgroundColor: "#faf7f4",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
  },
  modalSummaryText: {
    fontSize: 15,
    color: "#3d2b1f",
    fontWeight: "600",
    marginBottom: 4,
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
});