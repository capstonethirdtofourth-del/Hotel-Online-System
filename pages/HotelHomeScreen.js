import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../FirebaseConfig";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function HotelHomeScreen({ onBookRoom, roomStatusRefreshKey }) {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(false);
  const [blockedRooms, setBlockedRooms] = useState({});

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchBlockedRooms();
  }, [roomStatusRefreshKey]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);

      const snapshot = await getDocs(collection(db, "rooms"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setRooms(data);
    } catch (error) {
      console.log("Error fetching rooms:", error);
      Alert.alert("Error", "Failed to load rooms.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchBlockedRooms = async () => {
    try {
      const bookingsRef = collection(db, "roomBookings");

      const bookedQuery = query(bookingsRef, where("status", "==", "booked"));
      const checkedInQuery = query(bookingsRef, where("status", "==", "checked-in"));

      const [bookedSnapshot, checkedInSnapshot] = await Promise.all([
        getDocs(bookedQuery),
        getDocs(checkedInQuery),
      ]);

      const blockedMap = {};

      bookedSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        blockedMap[data.roomId] = "booked";
      });

      checkedInSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        blockedMap[data.roomId] = "checked-in";
      });

      setBlockedRooms(blockedMap);
    } catch (error) {
      console.log("Error fetching blocked rooms:", error);
    }
  };

  const openRoomModal = (room) => {
    setSelectedRoom(room);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
  };

  const handleBookRoom = async () => {
    if (!selectedRoom || bookingRoom) return;

    const roomStatus = blockedRooms[selectedRoom?.id];

    if (roomStatus === "checked-in") {
      Alert.alert("Room Occupied", "This room is currently occupied.");
      return;
    }

    if (roomStatus === "booked") {
      Alert.alert("Room Unavailable", "This room is already booked.");
      return;
    }

    try {
      setBookingRoom(true);

      if (onBookRoom) {
        const success = await onBookRoom(selectedRoom);
        if (!success) return;
      }

      Alert.alert(
        "Room Booked",
        `${selectedRoom.name} has been added to your reserved room list.`
      );

      closeRoomModal();
      await fetchBlockedRooms();
    } finally {
      setBookingRoom(false);
    }
  };

  const renderAmenityIcon = (item) => {
    switch (item) {
      case "wifi":
        return <Ionicons name="wifi-outline" size={20} color="#6b3200" />;
      case "tv":
        return <Ionicons name="tv-outline" size={20} color="#6b3200" />;
      case "ref":
        return (
          <MaterialCommunityIcons
            name="fridge-outline"
            size={20}
            color="#6b3200"
          />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="bed-outline"
            size={20}
            color="#6b3200"
          />
        );
    }
  };

  const getRoomBadge = (roomId) => {
    if (blockedRooms[roomId] === "checked-in") {
      return "Currently Occupied";
    }

    if (blockedRooms[roomId] === "booked") {
      return "Booked";
    }

    return null;
  };

  const featuredRoom = rooms[0];
  const selectedRoomStatus = blockedRooms[selectedRoom?.id];
  const selectedRoomBlocked =
    selectedRoomStatus === "booked" || selectedRoomStatus === "checked-in";

  if (loadingRooms) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#6b3200" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={styles.loaderBox}>
        <Text style={styles.loadingText}>No rooms found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.featuredCard}
          onPress={() => openRoomModal(featuredRoom)}
        >
          {getRoomBadge(featuredRoom.id) && (
            <View style={styles.occupiedBadge}>
              <Text style={styles.occupiedText}>{getRoomBadge(featuredRoom.id)}</Text>
            </View>
          )}

          <Image
            source={{ uri: featuredRoom.image }}
            style={styles.featuredImage}
          />

          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{featuredRoom.price}</Text>
          </View>

          <View style={styles.cardOverlay}>
            <Text style={styles.roomTitle}>{featuredRoom.name}</Text>
            <Text style={styles.roomSubtitle}>
              {featuredRoom.description}
            </Text>
          </View>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rooms.slice(1).map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.smallCard}
              activeOpacity={0.9}
              onPress={() => openRoomModal(room)}
            >
              {getRoomBadge(room.id) && (
                <View style={styles.occupiedBadgeSmall}>
                  <Text style={styles.occupiedTextSmall}>
                    {blockedRooms[room.id] === "checked-in" ? "Occupied" : "Booked"}
                  </Text>
                </View>
              )}

              <Image source={{ uri: room.image }} style={styles.smallImage} />

              <View style={styles.smallPriceTag}>
                <Text style={styles.smallPriceText}>{room.price}</Text>
              </View>

              <View style={styles.smallOverlay}>
                <Text style={styles.smallTitle}>{room.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal
        visible={!!selectedRoom}
        transparent
        animationType="slide"
        onRequestClose={closeRoomModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.roomModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRoom?.name}</Text>
              <TouchableOpacity onPress={closeRoomModal}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRoom && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedRoom.image }}
                  style={styles.modalImage}
                />

                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPrice}>{selectedRoom.price}</Text>
                  <Text style={styles.modalSubtitle}>per night</Text>
                </View>

                <Text style={styles.descriptionText}>
                  {selectedRoom.description}
                </Text>

                <Text style={styles.sectionTitle}>Available in this room</Text>

                <View style={styles.amenitiesBox}>
                  {(selectedRoom.amenities || []).map((item, index) => (
                    <View key={index} style={styles.amenityRow}>
                      {renderAmenityIcon(item)}
                      <Text style={styles.amenityText}>
                        {item === "tv"
                          ? "TV"
                          : item === "ref"
                          ? "Ref"
                          : item === "wifi"
                          ? "WiFi"
                          : "Extra beds and pillows"}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    (bookingRoom || selectedRoomBlocked) && styles.bookButtonDisabled,
                  ]}
                  onPress={handleBookRoom}
                  disabled={bookingRoom || selectedRoomBlocked}
                >
                  <Text style={styles.bookButtonText}>
                    {selectedRoomStatus === "checked-in"
                      ? "Room Occupied"
                      : selectedRoomStatus === "booked"
                      ? "Already Booked"
                      : bookingRoom
                      ? "Booking..."
                      : "Book Room"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIMARY = "#6b3200";
const SECONDARY = "#000000";

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 20,
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
  featuredCard: {
    width: "100%",
    height: 250,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ddd",
    marginBottom: 24,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  priceTag: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 16,
  },
  priceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(80,40,0,0.75)",
    padding: 14,
  },
  roomTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  roomSubtitle: {
    color: "#f3e8dc",
    fontSize: 11,
    marginTop: 4,
  },
  smallCard: {
    width: 150,
    height: 110,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  smallImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  smallPriceTag: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  smallPriceText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  smallOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(80,40,0,0.78)",
    padding: 8,
  },
  smallTitle: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  roomModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 14,
  },
  modalPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: PRIMARY,
    marginRight: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#7a6d63",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5f5a55",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
    marginBottom: 12,
  },
  amenitiesBox: {
    backgroundColor: "#f7f2ed",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  amenityText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#3d3128",
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: SECONDARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  occupiedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(200,0,0,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 2,
  },
  occupiedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  occupiedBadgeSmall: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "rgba(200,0,0,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  occupiedTextSmall: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});