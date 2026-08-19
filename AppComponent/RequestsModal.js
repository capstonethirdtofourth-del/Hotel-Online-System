import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RequestsModal({
  visible,
  onClose,
  loadingRequests,
  userRequests,
  onCancelRequest,
  cancellingRequestId,
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheetOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.sheetModal}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>My Requests</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          {loadingRequests ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6b4f3a" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {userRequests.length === 0 ? (
                <Text style={styles.emptyText}>No cancellable requests found.</Text>
              ) : (
                userRequests.map((request) => (
                  <View key={request.id} style={styles.listCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>
                        {request.requestTypeLabels?.join(", ") || "Request"}
                      </Text>
                      <Text style={styles.listSubtitle}>
                        {request.requestText || "No details"}
                      </Text>
                      <Text style={styles.listSubtitle}>Status: {request.status}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.cancelActionButton,
                        cancellingRequestId === request.id && styles.disabledButton,
                      ]}
                      disabled={cancellingRequestId === request.id}
                      onPress={() => onCancelRequest(request)}
                    >
                      <Text style={styles.cancelActionText}>
                        {cancellingRequestId === request.id ? "Cancelling..." : "Cancel"}
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
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
    fontSize: 15,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 14,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
  },
  listSubtitle: {
    fontSize: 13,
    color: "#7d6d61",
    marginTop: 4,
  },
  cancelActionButton: {
    backgroundColor: "#b84040",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 12,
  },
  cancelActionText: {
    color: "#fff",
    fontWeight: "700",
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
  disabledButton: {
    opacity: 0.6,
  },
});