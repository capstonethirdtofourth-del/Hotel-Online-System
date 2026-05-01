import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InfoModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheetModal}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Hotel Information</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>FB PAGE</Text>
            <Text style={styles.infoValue}>H&K Hotel and Home Kafe</Text>

            <Text style={styles.infoLabel}>NUMBER</Text>
            <Text style={styles.infoValue}>0967 327 7 399</Text>

            <Text style={styles.infoLabel}>ADDRESS</Text>
            <Text style={styles.infoValue}>
              3102 Diversion Road. Maharlika High Way, San Leonardo, Nueva Ecija.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetModal: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "78%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  infoCard: {
    backgroundColor: "#f7f2ed",
    borderRadius: 18,
    padding: 18,
  },
  infoLabel: {
    fontSize: 12,
    color: "#8a7869",
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    color: "#2f241d",
    lineHeight: 22,
    fontWeight: "500",
  },
});