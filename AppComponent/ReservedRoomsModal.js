import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ReservedRoomsModal({
  visible,
  onClose,
  reservedRooms = [],
  onCancelRoom,
  loadingReservedRooms = false,
  cancellingRoomId,
}) {
  const formatDateTime = (timestamp) => {
    if (!timestamp?.seconds) return "Not set";

    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  const formatPlannedDate = (dateString) => {
    if (!dateString) return "Not set";

    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <View style={styles.sheetModal}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Reserved Room</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          {loadingReservedRooms ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6b4f3a" />
              <Text style={styles.loadingText}>Loading reserved rooms...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {reservedRooms.length === 0 ? (
                <Text style={styles.emptyText}>
                  You do not have any reserved room yet.
                </Text>
              ) : (
                reservedRooms.map((room) => {
                  const isCancelling = cancellingRoomId === room.id;

                  return (
                    <View key={room.id} style={styles.listCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>
                          {room.name || room.roomName || "Unnamed Room"}
                        </Text>

                        <Text style={styles.listSubtitle}>
                          {room.price || "No price"}
                        </Text>

                        <Text style={styles.listSubtitle}>
                          Status: {room.status || "booked"}
                        </Text>

                        <View style={styles.detailsBox}>
                          <Text style={styles.detailLabel}>Planned Check-in</Text>
                          <Text style={styles.detailValue}>
                            {room.checkInDate
                              ? `${formatPlannedDate(room.checkInDate)} at ${room.checkInTime || "Not set"}`
                              : formatDateTime(room.checkInAt)}
                          </Text>

                          <Text style={[styles.detailLabel, { marginTop: 8 }]}>
                            Planned Check-out
                          </Text>
                          <Text style={styles.detailValue}>
                            {room.checkOutDate
                              ? formatPlannedDate(room.checkOutDate)
                              : room.checkOutAt
                              ? formatDateTime(room.checkOutAt)
                              : "Not yet checked out"}
                          </Text>

                          <Text style={[styles.detailLabel, { marginTop: 8 }]}>
                            Duration
                          </Text>
                          <Text style={styles.detailValue}>
                            {room.stayNights
                              ? `${room.stayNights} night${room.stayNights > 1 ? "s" : ""}`
                              : "Not set"}
                          </Text>

                          <Text style={[styles.detailLabel, { marginTop: 8 }]}>
                            Guests
                          </Text>
                          <Text style={styles.detailValue}>
                            Adults: {room.guests?.adults || 1} • Children: {room.guests?.children || 0} • Pets: {room.guests?.pets || 0}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.cancelActionButton,
                          isCancelling && styles.cancelDisabled,
                        ]}
                        onPress={() => onCancelRoom(room.id)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <View style={styles.cancelLoadingRow}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.cancelActionTextLoading}>Cancelling...</Text>
                          </View>
                        ) : (
                          <Text style={styles.cancelActionText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
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
    alignItems: "flex-start",
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
  detailsBox: {
    marginTop: 10,
    backgroundColor: "#f7f2ed",
    borderRadius: 12,
    padding: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b3200",
  },
  detailValue: {
    fontSize: 13,
    color: "#4b3a2f",
    marginTop: 2,
  },
  cancelActionButton: {
    backgroundColor: "#b84040",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 12,
    marginTop: 4,
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
  cancelDisabled: {
    opacity: 0.7,
  },
  cancelLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cancelActionTextLoading: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 6,
  },
});
