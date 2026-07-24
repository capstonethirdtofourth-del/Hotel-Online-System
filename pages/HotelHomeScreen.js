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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../FirebaseConfig";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BookingDetailsModal from "./components/BookingDetailsModal";

export default function HotelHomeScreen({ onBookRoom, roomStatusRefreshKey }) {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(false);
  const [activeBookingsByRoom, setActiveBookingsByRoom] = useState({});
  const [bookingDetailsVisible, setBookingDetailsVisible] = useState(false);
  const [roomForBooking, setRoomForBooking] = useState(null);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [userRoomRating, setUserRoomRating] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchActiveBookings();
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

  const fetchActiveBookings = async () => {
    try {
      const bookingsRef = collection(db, "roomBookings");

      const bookedQuery = query(bookingsRef, where("status", "==", "booked"));
      const checkedInQuery = query(bookingsRef, where("status", "==", "checked-in"));

      const [bookedSnapshot, checkedInSnapshot] = await Promise.all([
        getDocs(bookedQuery),
        getDocs(checkedInQuery),
      ]);

      const bookingsByRoom = {};

      [...bookedSnapshot.docs, ...checkedInSnapshot.docs].forEach((docSnap) => {
        const booking = {
          id: docSnap.id,
          ...docSnap.data(),
        };

        if (!booking.roomId) return;

        if (!bookingsByRoom[booking.roomId]) {
          bookingsByRoom[booking.roomId] = [];
        }

        bookingsByRoom[booking.roomId].push(booking);
      });

      setActiveBookingsByRoom(bookingsByRoom);
    } catch (error) {
      console.log("Error fetching active room bookings:", error);
    }
  };

  const fetchUserRoomRating = async (roomId) => {
    try {
      const currentUser = getAuth().currentUser;

      setUserRoomRating(null);
      setSelectedRating(0);

      if (!currentUser || !roomId) return;

      const ratingDocId = `${currentUser.uid}_${roomId}`;
      const ratingRef = doc(db, "roomRatings", ratingDocId);
      const ratingSnap = await getDoc(ratingRef);

      if (ratingSnap.exists()) {
        const ratingValue = Number(ratingSnap.data().rating) || 0;
        setUserRoomRating(ratingValue);
        setSelectedRating(ratingValue);
      }
    } catch (error) {
      console.log("Error fetching user room rating:", error);
    }
  };

  const openRoomModal = (room) => {
    setSelectedRoom(room);
    fetchUserRoomRating(room.id);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setRatingModalVisible(false);
    setSelectedRating(0);
    setUserRoomRating(null);
  };

  const openRatingModal = () => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      Alert.alert("Login Required", "Please login first before rating a room.");
      return;
    }

    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedRoom || submittingRating) return;

    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      Alert.alert("Login Required", "Please login first before rating a room.");
      return;
    }

    if (selectedRating < 1 || selectedRating > 5) {
      Alert.alert("Select Rating", "Please select 1 to 5 stars.");
      return;
    }

    try {
      setSubmittingRating(true);

      const ratingDocId = `${currentUser.uid}_${selectedRoom.id}`;
      const roomRef = doc(db, "rooms", selectedRoom.id);
      const ratingRef = doc(db, "roomRatings", ratingDocId);

      let updatedStats = null;
      let ratingAction = "submitted";

      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        const ratingSnap = await transaction.get(ratingRef);

        if (!roomSnap.exists()) {
          throw new Error("Room not found.");
        }

        const roomData = roomSnap.data();
        const currentAverage = Number(roomData.rating) || 0;
        const currentCount = Number(roomData.reviewCount) || 0;
        const currentTotal = currentAverage * currentCount;

        let newAverage = selectedRating;
        let newReviewCount = currentCount;

        if (ratingSnap.exists()) {
          const oldRating = Number(ratingSnap.data().rating) || 0;
          const newTotal = currentTotal - oldRating + selectedRating;

          newReviewCount = currentCount || 1;
          newAverage = newTotal / newReviewCount;
          ratingAction = "updated";

          transaction.update(ratingRef, {
            rating: selectedRating,
            updatedAt: serverTimestamp(),
          });
        } else {
          newReviewCount = currentCount + 1;
          const newTotal = currentTotal + selectedRating;
          newAverage = newTotal / newReviewCount;

          transaction.set(ratingRef, {
            userId: currentUser.uid,
            roomId: selectedRoom.id,
            roomName: selectedRoom.name,
            rating: selectedRating,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const safeAverage = Number(newAverage.toFixed(1));

        transaction.update(roomRef, {
          rating: safeAverage,
          reviewCount: newReviewCount,
        });

        updatedStats = {
          rating: safeAverage,
          reviewCount: newReviewCount,
        };
      });

      if (updatedStats) {
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === selectedRoom.id
              ? {
                  ...room,
                  rating: updatedStats.rating,
                  reviewCount: updatedStats.reviewCount,
                }
              : room
          )
        );

        setSelectedRoom((prevRoom) =>
          prevRoom
            ? {
                ...prevRoom,
                rating: updatedStats.rating,
                reviewCount: updatedStats.reviewCount,
              }
            : prevRoom
        );
      }

      setUserRoomRating(selectedRating);
      setRatingModalVisible(false);

      Alert.alert(
        ratingAction === "updated" ? "Rating Updated" : "Rating Submitted",
        ratingAction === "updated"
          ? "Your previous rating for this room has been updated."
          : "Thank you for rating this room."
      );
    } catch (error) {
      console.log("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleBookRoom = () => {
    if (!selectedRoom || bookingRoom) return;

    setRoomForBooking(selectedRoom);
    setBookingDetailsVisible(true);
  };

  const handleConfirmDetailedBooking = async (bookingData) => {
    if (!bookingData || bookingRoom) return false;

    try {
      setBookingRoom(true);

      const result = onBookRoom
        ? await onBookRoom(bookingData)
        : false;

      if (!result) return false;

      closeRoomModal();
      await fetchActiveBookings();
      return result;
    } finally {
      setBookingRoom(false);
    }
  };

  const closeBookingDetailsModal = () => {
    if (bookingRoom) return;
    setBookingDetailsVisible(false);
    setRoomForBooking(null);
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

  const getRoomBookings = (roomId) => {
    return activeBookingsByRoom[roomId] || [];
  };

  const getRoomBadge = (roomId) => {
    const roomBookings = getRoomBookings(roomId);

    if (roomBookings.some((booking) => booking.status === "checked-in")) {
      return "Occupied";
    }

    if (roomBookings.some((booking) => booking.status === "booked")) {
      return "Dates Reserved";
    }

    return null;
  };

  const renderRating = (
    rating = 0,
    reviewCount = 0,
    size = 14,
    textStyle = styles.ratingTextLight
  ) => {
    const numericRating = Number(rating) || 0;
    const roundedRating = Math.round(numericRating);

    return (
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= roundedRating ? "star" : "star-outline"}
            size={size}
            color="#FFD700"
          />
        ))}

        <Text style={textStyle}>
          {numericRating ? numericRating.toFixed(1) : "No rating"}
          {reviewCount > 0 ? ` (${reviewCount})` : ""}
        </Text>
      </View>
    );
  };

  const featuredRoom = rooms[0];
  const selectedRoomBadge = getRoomBadge(selectedRoom?.id);

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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.featuredCard}
          onPress={() => openRoomModal(featuredRoom)}
        >
          {getRoomBadge(featuredRoom.id) && (
            <View
              style={[
                styles.occupiedBadge,
                getRoomBadge(featuredRoom.id) === "Occupied"
                  ? styles.occupiedBadgeGreen
                  : styles.reservedBadge,
              ]}
            >
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
            {renderRating(featuredRoom.rating, featuredRoom.reviewCount)}
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
                <View
                  style={[
                    styles.occupiedBadgeSmall,
                    getRoomBadge(room.id) === "Occupied"
                      ? styles.occupiedBadgeGreen
                      : styles.reservedBadge,
                  ]}
                >
                  <Text style={styles.occupiedTextSmall}>
                    {getRoomBadge(room.id)}
                  </Text>
                </View>
              )}

              <Image source={{ uri: room.image }} style={styles.smallImage} />

              <View style={styles.smallPriceTag}>
                <Text style={styles.smallPriceText}>{room.price}</Text>
              </View>

              <View style={styles.smallOverlay}>
                <Text style={styles.smallTitle}>{room.name}</Text>
                {renderRating(room.rating, room.reviewCount, 11)}
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

                <View style={styles.modalRatingBox}>
                  {renderRating(
                    selectedRoom.rating,
                    selectedRoom.reviewCount,
                    18,
                    styles.ratingTextDark
                  )}

                  {userRoomRating ? (
                    <Text style={styles.yourRatingText}>
                      Your rating: {userRoomRating} star{userRoomRating > 1 ? "s" : ""}
                    </Text>
                  ) : (
                    <Text style={styles.yourRatingText}>You have not rated this room yet.</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.rateButton} onPress={openRatingModal}>
                  <Ionicons name="star-outline" size={18} color="#6b3200" />
                  <Text style={styles.rateButtonText}>
                    {userRoomRating ? "Update Rating" : "Rate Room"}
                  </Text>
                </TouchableOpacity>

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

                {!!selectedRoomBadge && (
                  <Text style={styles.availabilityNote}>
                    {selectedRoomBadge === "Occupied"
                      ? "This room is occupied now, but future dates may still be available."
                      : "Some dates are already reserved. Open the calendar to see available dates."}
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    bookingRoom && styles.bookButtonDisabled,
                  ]}
                  onPress={handleBookRoom}
                  disabled={bookingRoom}
                >
                  <Text style={styles.bookButtonText}>
                    {bookingRoom ? "Checking..." : "Check Availability"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>


      <BookingDetailsModal
        visible={bookingDetailsVisible}
        room={roomForBooking}
        submitting={bookingRoom}
        unavailableBookings={getRoomBookings(roomForBooking?.id)}
        onClose={closeBookingDetailsModal}
        onConfirmBooking={handleConfirmDetailedBooking}
      />

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalBox}>
            <Text style={styles.ratingModalTitle}>Rate this room</Text>
            <Text style={styles.ratingModalSubtitle}>{selectedRoom?.name}</Text>

            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  disabled={submittingRating}
                >
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={42}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectedRatingText}>
              {selectedRating > 0
                ? `${selectedRating} star${selectedRating > 1 ? "s" : ""} selected`
                : "Select your rating"}
            </Text>

            <TouchableOpacity
              style={[
                styles.submitRatingButton,
                (submittingRating || selectedRating < 1) && styles.submitRatingButtonDisabled,
              ]}
              onPress={handleSubmitRating}
              disabled={submittingRating || selectedRating < 1}
            >
              <Text style={styles.submitRatingButtonText}>
                {submittingRating
                  ? "Saving..."
                  : userRoomRating
                  ? "Update Rating"
                  : "Submit Rating"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelRatingButton}
              onPress={() => setRatingModalVisible(false)}
              disabled={submittingRating}
            >
              <Text style={styles.cancelRatingButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIMARY = "#6b3200";
const SECONDARY = "#000000";
const CREAM = "#FFF8E7";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  loaderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CREAM,
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
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingTextLight: {
    color: "#f3e8dc",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 5,
  },
  ratingTextDark: {
    color: "#3d3128",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  modalRatingBox: {
    marginBottom: 10,
  },
  yourRatingText: {
    marginTop: 5,
    color: "#7a6d63",
    fontSize: 12,
    fontWeight: "500",
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f2ed",
    borderWidth: 1,
    borderColor: "#e0c7ad",
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 16,
  },
  rateButtonText: {
    marginLeft: 8,
    color: PRIMARY,
    fontSize: 15,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  roomModal: {
    backgroundColor: CREAM,
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
  availabilityNote: {
    backgroundColor: "#fff7ed",
    color: "#9a3412",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    lineHeight: 19,
    fontSize: 13,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#6d4e3a",
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  occupiedBadgeGreen: {
    backgroundColor: "rgba(34, 139, 34, 0.9)",
  },
  reservedBadge: {
    backgroundColor: "rgba(180, 100, 0, 0.9)",
  },
  occupiedTextSmall: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  ratingModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 20,
  },
  ratingModalBox: {
    width: "100%",  
    backgroundColor: CREAM,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
  },
  ratingModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
    marginBottom: 4,
  },
  ratingModalSubtitle: {
    color: "#7a6d63",
    fontSize: 13,
    marginBottom: 18,
    textAlign: "center",
  },
  ratingStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedRatingText: {
    color: "#5f5a55",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 18,
  },
  submitRatingButton: {
    width: "100%",
    backgroundColor: "#644835",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  submitRatingButtonDisabled: {
    opacity: 0.6,
  },
  submitRatingButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  cancelRatingButton: {
    paddingVertical: 8,
  },
  cancelRatingButtonText: {
    color: "#7a6d63",
    fontSize: 14,
    fontWeight: "700",
  },
});
