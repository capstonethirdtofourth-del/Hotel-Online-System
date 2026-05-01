import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function AdminRoomScreen() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [roomsSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(
          query(
            collection(db, "roomBookings"),
            where("status", "in", ["booked", "checked-in"])
          )
        ),
      ]);

      const roomsData = roomsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const bookingsData = bookingsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setRooms(roomsData);
      setBookings(bookingsData);
    } catch (error) {
      console.log("Error loading admin room data:", error);
      Alert.alert("Error", "Failed to load room data.");
    } finally {
      setLoading(false);
    }
  };

  const bookingMap = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      map[booking.roomId] = booking;
    });
    return map;
  }, [bookings]);

  const availableRooms = useMemo(() => {
    return rooms.filter((room) => !bookingMap[room.id]);
  }, [rooms, bookingMap]);

  const bookedRooms = useMemo(() => {
    return bookings.filter((booking) => booking.status === "booked");
  }, [bookings]);

  const occupiedRooms = useMemo(() => {
    return bookings.filter((booking) => booking.status === "checked-in");
  }, [bookings]);

  const formatDateTime = (timestamp) => {
    if (!timestamp?.seconds) return "Not set";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const getRoomStatus = (roomId) => {
    const booking = bookingMap[roomId];
    if (!booking) return "available";
    return booking.status;
  };

  const getRoomBooking = (roomId) => {
    return bookingMap[roomId] || null;
  };

  const openRoomModal = (room) => {
    const booking = getRoomBooking(room.id);

    setSelectedRoom({
      ...room,
      booking,
      roomStatus: getRoomStatus(room.id),
    });

    setGuestName(
      booking?.guestName?.trim() ||
        booking?.userFullName?.trim() ||
        ""
    );
    setGuestPhone(booking?.guestPhone?.trim() || "");
    setRoomModalVisible(true);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setGuestName("");
    setGuestPhone("");
    setRoomModalVisible(false);
  };

  const handleBookRoom = async () => {
    if (!selectedRoom || processing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    try {
      setProcessing(true);

      await addDoc(collection(db, "roomBookings"), {
        userId: "admin",
        userEmail: "admin",
        userFullName: guestName.trim(),
        userPhone: guestPhone.trim() || "",
        roomId: selectedRoom.id,
        name: selectedRoom.name,
        price: selectedRoom.price,
        image: selectedRoom.image,
        amenities: selectedRoom.amenities || [],
        roomNumber: selectedRoom.roomNumber || "",
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || "",
        status: "booked",
        reservedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Room booked successfully.");
      closeRoomModal();
      await loadData();
    } catch (error) {
      console.log("Error booking room:", error);
      Alert.alert("Error", "Failed to book room.");
    } finally {
      setProcessing(false);
    }
  };

  const handleOccupyBookedRoom = async () => {
    if (!selectedRoom?.booking || processing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    try {
      setProcessing(true);

      await updateDoc(doc(db, "roomBookings", selectedRoom.booking.id), {
        status: "checked-in",
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || "",
        checkInAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Room is now marked as occupied.");
      closeRoomModal();
      await loadData();
    } catch (error) {
      console.log("Error occupying booked room:", error);
      Alert.alert("Error", "Failed to occupy room.");
    } finally {
      setProcessing(false);
    }
  };

  const handleOccupyAvailableRoom = async () => {
    if (!selectedRoom || processing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    try {
      setProcessing(true);

      await addDoc(collection(db, "roomBookings"), {
        userId: "admin",
        userEmail: "admin",
        userFullName: guestName.trim(),
        userPhone: guestPhone.trim() || "",
        roomId: selectedRoom.id,
        name: selectedRoom.name,
        price: selectedRoom.price,
        image: selectedRoom.image,
        amenities: selectedRoom.amenities || [],
        roomNumber: selectedRoom.roomNumber || "",
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || "",
        status: "checked-in",
        reservedAt: serverTimestamp(),
        checkInAt: serverTimestamp(),
      });

      Alert.alert("Success", "Room is now occupied.");
      closeRoomModal();
      await loadData();
    } catch (error) {
      console.log("Error occupying room:", error);
      Alert.alert("Error", "Failed to occupy room.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelBookedRoom = async () => {
    if (!selectedRoom?.booking || processing) return;

    Alert.alert("Cancel Booking", "Do you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessing(true);

            await updateDoc(doc(db, "roomBookings", selectedRoom.booking.id), {
              status: "cancelled",
              cancelledAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            Alert.alert("Success", "Booking cancelled.");
            closeRoomModal();
            await loadData();
          } catch (error) {
            console.log("Error cancelling booking:", error);
            Alert.alert("Error", "Failed to cancel booking.");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleCheckoutOccupiedRoom = async () => {
    if (!selectedRoom?.booking || processing) return;

    Alert.alert("Check Out", "Mark this room as checked out?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessing(true);

            await updateDoc(doc(db, "roomBookings", selectedRoom.booking.id), {
              status: "checked-out",
              checkOutAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            Alert.alert("Success", "Room checked out successfully.");
            closeRoomModal();
            await loadData();
          } catch (error) {
            console.log("Error checking out room:", error);
            Alert.alert("Error", "Failed to check out room.");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const renderAmenityIcon = (item) => {
    switch (item) {
      case "wifi":
        return <Ionicons name="wifi-outline" size={18} color="#6b3200" />;
      case "tv":
        return <Ionicons name="tv-outline" size={18} color="#6b3200" />;
      case "ref":
        return (
          <MaterialCommunityIcons
            name="fridge-outline"
            size={18}
            color="#6b3200"
          />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="bed-outline"
            size={18}
            color="#6b3200"
          />
        );
    }
  };

  const renderAmenityLabel = (item) => {
    if (item === "tv") return "TV";
    if (item === "ref") return "Ref";
    if (item === "wifi") return "WiFi";
    return "Extra beds and pillows";
  };

  const renderRoomCard = (room, statusLabel, subtitle) => (
    <TouchableOpacity
      key={room.id}
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => openRoomModal(room)}
    >
      <Image source={{ uri: room.image }} style={styles.cardImage} />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{room.name}</Text>
        <Text style={styles.cardSubtitle}>{room.price || ""}</Text>
        <Text style={styles.cardStatus}>{statusLabel}</Text>
        {!!subtitle && <Text style={styles.metaText}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderBookingCard = (booking, statusLabel, subtitle) => (
    <TouchableOpacity
      key={booking.id}
      style={styles.card}
      activeOpacity={0.9}
      onPress={() =>
        openRoomModal({
          id: booking.roomId,
          name: booking.name,
          price: booking.price,
          image: booking.image,
          amenities: booking.amenities || [],
          roomNumber: booking.roomNumber || "",
        })
      }
    >
      <Image source={{ uri: booking.image }} style={styles.cardImage} />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{booking.name}</Text>
        <Text style={styles.cardSubtitle}>{booking.roomNumber || ""}</Text>
        <Text style={styles.cardStatus}>{statusLabel}</Text>
        {!!subtitle && <Text style={styles.metaText}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#6b3200" />
        <Text style={styles.loadingText}>Loading admin rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Available Rooms</Text>
        {availableRooms.length === 0 ? (
          <Text style={styles.emptyText}>No available rooms.</Text>
        ) : (
          availableRooms.map((room) =>
            renderRoomCard(room, "Available", "")
          )
        )}

        <Text style={styles.sectionTitle}>Booked Rooms</Text>
        {bookedRooms.length === 0 ? (
          <Text style={styles.emptyText}>No booked rooms.</Text>
        ) : (
          bookedRooms.map((booking) =>
            renderBookingCard(
              booking,
              "Booked",
              `booked by: ${booking.guestName || booking.userEmail || "Unknown"}`
            )
          )
        )}

        <Text style={styles.sectionTitle}>Occupied Rooms</Text>
        {occupiedRooms.length === 0 ? (
          <Text style={styles.emptyText}>No occupied rooms.</Text>
        ) : (
          occupiedRooms.map((booking) =>
            renderBookingCard(
                booking,
                `${booking.price}`,
                "Occupied",
                `occupied by: ${booking.guestName || booking.userEmail || "Unknown"}`
            )
          )
        )}
      </ScrollView>

      <Modal
        visible={roomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeRoomModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRoom?.name}</Text>
              <TouchableOpacity onPress={closeRoomModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRoom && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedRoom.image }}
                  style={styles.modalImage}
                />

                <Text style={styles.priceText}>
                  {selectedRoom.price || "No price"}
                </Text>

                <Text style={styles.sectionSmallTitle}>Amenities</Text>
                <View style={styles.amenitiesBox}>
                  {(selectedRoom.amenities || []).length === 0 ? (
                    <Text style={styles.metaText}>No amenities listed.</Text>
                  ) : (
                    selectedRoom.amenities.map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.amenityRow}>
                        {renderAmenityIcon(item)}
                        <Text style={styles.amenityText}>
                          {renderAmenityLabel(item)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {selectedRoom.roomStatus === "available" && (
                  <>
                    <Text style={styles.sectionSmallTitle}>Guest Details</Text>

                    <Text style={styles.inputLabel}>Guest Name</Text>
                    <TextInput
                      style={styles.input}
                      value={guestName}
                      onChangeText={setGuestName}
                      placeholder="Enter guest name"
                    />

                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      placeholder="Enter phone number optional"
                      keyboardType="phone-pad"
                    />

                    <TouchableOpacity
                      style={[styles.actionButton, processing && styles.disabledButton]}
                      onPress={handleBookRoom}
                      disabled={processing}
                    >
                      <Text style={styles.actionButtonText}>
                        {processing ? "Processing..." : "Book"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.secondaryButton,
                        processing && styles.disabledButton,
                      ]}
                      onPress={handleOccupyAvailableRoom}
                      disabled={processing}
                    >
                      <Text style={styles.actionButtonText}>Occupy</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedRoom.roomStatus === "booked" && (
                  <>
                    <Text style={styles.sectionSmallTitle}>Booking Details</Text>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        Guest Name:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.guestName ||
                            selectedRoom.booking?.userFullName ||
                            "Not set"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Phone:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.guestPhone || "Not set"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Email:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.userEmail || "Not set"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Date of Booking:{" "}
                        <Text style={styles.infoValue}>
                          {formatDateTime(selectedRoom.booking?.reservedAt)}
                        </Text>
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>Guest Name</Text>
                    <TextInput
                      style={styles.input}
                      value={guestName}
                      onChangeText={setGuestName}
                      placeholder="Enter guest name"
                    />

                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      placeholder="Enter phone number optional"
                      keyboardType="phone-pad"
                    />

                    <TouchableOpacity
                      style={[styles.actionButton, processing && styles.disabledButton]}
                      onPress={handleOccupyBookedRoom}
                      disabled={processing}
                    >
                      <Text style={styles.actionButtonText}>
                        {processing ? "Processing..." : "Occupy"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.cancelButton,
                        processing && styles.disabledButton,
                      ]}
                      onPress={handleCancelBookedRoom}
                      disabled={processing}
                    >
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedRoom.roomStatus === "checked-in" && (
                  <>
                    <Text style={styles.sectionSmallTitle}>Occupancy Details</Text>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        Occupied At:{" "}
                        <Text style={styles.infoValue}>
                          {formatDateTime(selectedRoom.booking?.checkInAt)}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Date of Booking:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.reservedAt
                            ? formatDateTime(selectedRoom.booking?.reservedAt)
                            : "Not booked first"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Guest Name:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.guestName ||
                            selectedRoom.booking?.userFullName ||
                            "Not set"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Email:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.userEmail || "Not set"}
                        </Text>
                      </Text>

                      <Text style={styles.infoLabel}>
                        Phone:{" "}
                        <Text style={styles.infoValue}>
                          {selectedRoom.booking?.guestPhone || "Not set"}
                        </Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.checkoutButton,
                        processing && styles.disabledButton,
                      ]}
                      onPress={handleCheckoutOccupiedRoom}
                      disabled={processing}
                    >
                      <Text style={styles.actionButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f2ee",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5b3212",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionSmallTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4b2a12",
    marginBottom: 10,
    marginTop: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    elevation: 2,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#7c6c60",
    marginTop: 2,
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8b5e34",
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#5e554d",
    marginTop: 2,
  },
  loaderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  emptyText: {
    color: "#7a6d63",
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 14,
  },
  priceText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#6b3200",
    marginBottom: 10,
  },
  amenitiesBox: {
    backgroundColor: "#f7f2ed",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  amenityText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#3d3128",
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "#faf7f4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 13,
    color: "#4b3a2f",
    marginBottom: 8,
  },
  infoValue: {
    fontWeight: "700",
    color: "#2f241d",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b3a2f",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: "#6b3200",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButton: {
    backgroundColor: "#8b5e34",
  },
  cancelButton: {
    backgroundColor: "#b84040",
  },
  checkoutButton: {
    backgroundColor: "#222",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
});