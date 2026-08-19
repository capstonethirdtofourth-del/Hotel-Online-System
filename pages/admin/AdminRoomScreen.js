import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";
import {
  createBookingWithNightLocks,
  releaseBookingLocksAndUpdateStatus,
} from "../../services/bookingLockService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import BookingDetailsModal from "../components/BookingDetailsModal";

export default function AdminRoomScreen() {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState("manage");

  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationDateFilter, setReservationDateFilter] = useState("all");
  const [calendarVisible, setCalendarVisible] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [manualBookingModalVisible, setManualBookingModalVisible] =
    useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  const isProcessing = processingAction !== null;
  const isBooking = processingAction === "book";
  const isOccupying = processingAction === "occupy";
  const isCancelling = processingAction === "cancel";
  const isCheckingOut = processingAction === "checkout";

  useEffect(() => {
    setLoading(true);

    let roomsReady = false;
    let bookingsReady = false;

    const finishInitialLoad = () => {
      if (roomsReady && bookingsReady) {
        setLoading(false);
      }
    };

    const unsubscribeRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const roomsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setRooms(roomsData);

        if (!roomsReady) {
          roomsReady = true;
          finishInitialLoad();
        }
      },
      (error) => {
        console.log("Admin room listener error:", error);

        if (!roomsReady) {
          roomsReady = true;
          finishInitialLoad();
        }

        Alert.alert(
          "Room Listener Error",
          "Unable to receive realtime room updates."
        );
      }
    );

    const unsubscribeBookings = onSnapshot(
      collection(db, "roomBookings"),
      (snapshot) => {
        const bookingsData = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((booking) =>
            ["booked", "checked-in"].includes(booking.status)
          );

        setBookings(bookingsData);

        if (!bookingsReady) {
          bookingsReady = true;
          finishInitialLoad();
        }
      },
      (error) => {
        console.log("Admin booking listener error:", error);

        if (!bookingsReady) {
          bookingsReady = true;
          finishInitialLoad();
        }

        Alert.alert(
          "Booking Listener Error",
          "Unable to receive realtime booking updates."
        );
      }
    );

    return () => {
      unsubscribeRooms();
      unsubscribeBookings();
    };
  }, []);

  const bookingsByRoom = useMemo(() => {
    const map = {};

    bookings.forEach((booking) => {
      if (!booking.roomId) return;

      if (!map[booking.roomId]) {
        map[booking.roomId] = [];
      }

      map[booking.roomId].push(booking);
    });

    Object.values(map).forEach((roomBookings) => {
      roomBookings.sort((a, b) => {
        const aDate = a.checkInDate || "9999-12-31";
        const bDate = b.checkInDate || "9999-12-31";

        if (aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }

        const aTime = a.reservedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.reservedAt?.seconds || b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
    });

    return map;
  }, [bookings]);

  const roomOverview = useMemo(() => {
    return rooms.map((room) => {
      const roomBookings = bookingsByRoom[room.id] || [];
      const occupiedBooking =
        roomBookings.find((booking) => booking.status === "checked-in") || null;
      const reservedBookings = roomBookings.filter(
        (booking) => booking.status === "booked"
      );

      return {
        ...room,
        occupiedBooking,
        reservedBookings,
        allActiveBookings: roomBookings,
      };
    });
  }, [rooms, bookingsByRoom]);

  useEffect(() => {
    if (!roomModalVisible || !selectedRoom?.id) return;

    const latestRoom = roomOverview.find(
      (room) => room.id === selectedRoom.id
    );

    if (latestRoom) {
      setSelectedRoom(latestRoom);
    }

    if (selectedBooking?.id) {
      const latestBooking = bookings.find(
        (booking) => booking.id === selectedBooking.id
      );

      if (latestBooking) {
        // Replace the temporary local copy with the authoritative
        // Firestore snapshot as soon as the realtime listener receives it.
        setSelectedBooking(latestBooking);
      } else if (!selectedBooking?._localJustCreated) {
        // The booking may have just been cancelled or checked out.
        // A newly-created manual booking is temporarily kept here until
        // its onSnapshot update arrives.
        setSelectedBooking(null);
      }
    }
  }, [
    roomOverview,
    bookings,
    roomModalVisible,
    selectedRoom?.id,
    selectedBooking?.id,
  ]);

  const formatDateTime = (timestamp) => {
    if (!timestamp?.seconds) return "Not set";
    return new Date(timestamp.seconds * 1000).toLocaleString("en-PH");
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "Date not set";

    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return getLocalDateString(date);
  };

  const bookingIncludesDate = (booking, dateString) => {
    if (!booking?.checkInDate || !booking?.checkOutDate || !dateString) {
      return false;
    }

    // The checkout date is not an occupied night.
    return (
      booking.checkInDate <= dateString &&
      booking.checkOutDate > dateString
    );
  };

  const formatBookingRange = (booking) => {
    if (!booking?.checkInDate && !booking?.checkOutDate) {
      return "Dates not set";
    }

    const checkIn = formatDateOnly(booking.checkInDate);
    const checkOut = formatDateOnly(booking.checkOutDate);

    return `${checkIn} – ${checkOut}`;
  };

  const getGuestName = (booking) => {
    return (
      booking?.guestName ||
      booking?.userFullName ||
      booking?.userEmail ||
      "Unknown guest"
    );
  };

  const filteredReservations = useMemo(() => {
    const reservations = selectedRoom?.reservedBookings || [];
    const normalizedSearch = reservationSearch.trim().toLowerCase();

    return reservations.filter((booking) => {
      const matchesGuest =
        !normalizedSearch ||
        getGuestName(booking).toLowerCase().includes(normalizedSearch);

      const matchesDate =
        reservationDateFilter === "all" ||
        bookingIncludesDate(booking, reservationDateFilter);

      return matchesGuest && matchesDate;
    });
  }, [selectedRoom, reservationSearch, reservationDateFilter]);

  const formatGuests = (guests) => {
    if (!guests) return "Not set";

    const adults = guests.adults || 0;
    const children = guests.children || 0;
    const pets = guests.pets || 0;

    return `${adults} adult(s), ${children} child/children, ${pets} pet(s)`;
  };

  const formatAddOns = (addOns) => {
    if (!Array.isArray(addOns) || addOns.length === 0) {
      return "No add-ons selected";
    }

    return addOns
      .map((item) => {
        if (item.id === "breakfast") {
          const guestCount = item.guestCount || item.quantityPerNight || 0;
          const totalQuantity = item.totalQuantity || 0;

          if (guestCount > 0 && totalQuantity > 0) {
            return `${item.name} - ${guestCount} guest(s) per day, ${totalQuantity} total serving(s) (Free)`;
          }

          if (guestCount > 0) {
            return `${item.name} - ${guestCount} guest(s) per day (Free)`;
          }
        }

        return `${item.name} (Free)`;
      })
      .join("\n");
  };

  const getTotalAmount = (booking) => {
    return (
      booking?.pricing?.totalAmount ||
      booking?.roomPrice ||
      booking?.price ||
      "Not set"
    );
  };

  const openRoomModal = (room) => {
    setSelectedRoom(room);
    setSelectedBooking(null);
    setRoomModalMode("manage");
    setReservationSearch("");
    setReservationDateFilter("all");
    setGuestName("");
    setGuestPhone("");
    setRoomModalVisible(true);
  };

  const openReservationsModal = (room) => {
    setSelectedRoom(room);
    setSelectedBooking(null);
    setRoomModalMode("reservations");
    setReservationSearch("");
    setReservationDateFilter("all");
    setGuestName("");
    setGuestPhone("");
    setRoomModalVisible(true);
  };

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setGuestName(
      getGuestName(booking) === "Unknown guest" ? "" : getGuestName(booking)
    );
    setGuestPhone(booking?.guestPhone || booking?.userPhone || "");
  };

  const closeBookingDetails = () => {
    setSelectedBooking(null);
    setGuestName("");
    setGuestPhone("");
    setProcessingAction(null);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setSelectedBooking(null);
    setRoomModalMode("manage");
    setReservationSearch("");
    setReservationDateFilter("all");
    setCalendarVisible(false);
    setManualBookingModalVisible(false);
    setGuestName("");
    setGuestPhone("");
    setProcessingAction(null);
    setRoomModalVisible(false);
  };

  const handleBookRoom = () => {
    if (!selectedRoom || isProcessing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    // Do not create the Firestore document yet.
    // First open the same full booking form used by the guest flow so the
    // admin must choose a valid stay range, guest count, and add-ons.
    setManualBookingModalVisible(true);
  };

  const handleConfirmManualBooking = async (bookingData) => {
    if (!selectedRoom || !auth.currentUser) {
      Alert.alert(
        "Unable to Create Booking",
        "The admin account or selected room is unavailable."
      );
      return false;
    }

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return false;
    }

    if (!bookingData?.checkInDate || !bookingData?.checkOutDate) {
      Alert.alert(
        "Select Stay Dates",
        "Please choose both check-in and check-out dates."
      );
      return false;
    }

    try {
      const adminUser = auth.currentUser;

      const manualBookingPayload = {
        ...bookingData,

        // A manual reservation is created by the signed-in administrator.
        // The guest's typed identity is kept in the normal guest fields.
        userId: adminUser.uid,
        userEmail: adminUser.email || "admin",
        userFullName: guestName.trim(),
        userPhone: guestPhone.trim() || "",

        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        name: selectedRoom.name,
        price: selectedRoom.price,
        image: selectedRoom.image || "",
        imageKey: selectedRoom.imageKey || "",
        amenities: selectedRoom.amenities || [],
        roomNumber: selectedRoom.roomNumber || "",

        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || "",

        status: "booked",
        checkInAt: null,
        checkOutAt: null,

        reservedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Use the same atomic date-range locking used by guest bookings.
      // This prevents the admin from manually reserving a room-night that
      // another reservation already owns.
      return await createBookingWithNightLocks(manualBookingPayload);
    } catch (error) {
      console.log("Error creating manual booking:", error);

      if (error.code === "booking/date-conflict") {
        Alert.alert(
          "Dates Unavailable",
          `This room is already reserved on ${
            error.conflictDate || "one of the selected dates"
          }. Please choose a different stay range.`
        );
      } else if (
        error.code === "booking/invalid-date" ||
        error.code === "booking/invalid-range" ||
        error.code === "booking/missing-dates" ||
        error.code === "booking/stay-too-long"
      ) {
        Alert.alert(
          "Invalid Stay Dates",
          error.message || "Please select a valid stay range."
        );
      } else if (error.code === "permission-denied") {
        Alert.alert(
          "Permission Error",
          "The admin account is not allowed to create this reservation or its room-night locks."
        );
      } else {
        Alert.alert(
          "Booking Failed",
          error.message || "Failed to create the manual booking."
        );
      }

      // BookingDetailsModal treats false as "keep the modal open".
      return false;
    }
  };

  const handleManualBookingCreated = (createdBooking) => {
    if (!createdBooking) return;

    // BookingDetailsModal closes after this callback. Keep the room
    // management modal underneath it and immediately show the newly-created
    // reservation's details instead of closing everything.
    setSelectedBooking({
      ...createdBooking,
      _localJustCreated: true,
    });
    setRoomModalMode("manage");
  };

  const handleOccupyBookedRoom = async () => {
    if (!selectedBooking || isProcessing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    try {
      setProcessingAction("occupy");

      await updateDoc(doc(db, "roomBookings", selectedBooking.id), {
        status: "checked-in",
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || "",
        checkInAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Room is now marked as occupied.");
      closeRoomModal();
    } catch (error) {
      console.log("Error occupying booked room:", error);
      Alert.alert("Error", "Failed to occupy room.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleOccupyAvailableRoom = async () => {
    if (!selectedRoom || isProcessing) return;

    if (!guestName.trim()) {
      Alert.alert("Missing Guest Name", "Please enter the guest name.");
      return;
    }

    try {
      setProcessingAction("occupy");

      await addDoc(collection(db, "roomBookings"), {
        userId: "admin",
        userEmail: "admin",
        userFullName: guestName.trim(),
        userPhone: guestPhone.trim() || "",
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Room is now occupied.");
      closeRoomModal();
    } catch (error) {
      console.log("Error occupying room:", error);
      Alert.alert("Error", "Failed to occupy room.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCancelBookedRoom = async () => {
    if (!selectedBooking || isProcessing) return;

    Alert.alert("Cancel Booking", "Do you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessingAction("cancel");

            await releaseBookingLocksAndUpdateStatus({
              bookingId: selectedBooking.id,
              newStatus: "cancelled",
              actorId: auth.currentUser?.uid || "admin",
              requireOwner: false,
              additionalFields: {
                cancelledAt: serverTimestamp(),
                cancelledBy: auth.currentUser?.uid || "admin",
              },
            });

            Alert.alert("Success", "Booking cancelled.");
            closeRoomModal();
          } catch (error) {
            console.log("Error cancelling booking:", error);
            Alert.alert("Error", "Failed to cancel booking.");
          } finally {
            setProcessingAction(null);
          }
        },
      },
    ]);
  };

  const handleCheckoutOccupiedRoom = async () => {
    if (!selectedBooking || isProcessing) return;

    Alert.alert("Check Out", "Mark this room as checked out?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessingAction("checkout");

            await releaseBookingLocksAndUpdateStatus({
              bookingId: selectedBooking.id,
              newStatus: "checked-out",
              actorId: auth.currentUser?.uid || "admin",
              requireOwner: false,
              additionalFields: {
                checkOutAt: serverTimestamp(),
                checkedOutBy: auth.currentUser?.uid || "admin",
              },
            });

            Alert.alert("Success", "Room checked out successfully.");
            closeRoomModal();
          } catch (error) {
            console.log("Error checking out room:", error);
            Alert.alert("Error", "Failed to check out room.");
          } finally {
            setProcessingAction(null);
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

  const renderRoomOverviewCard = (room) => {
    const occupied = !!room.occupiedBooking;
    const reservationCount = room.reservedBookings.length;
    const nextReservation = room.reservedBookings[0] || null;

    return (
      <View key={room.id} style={styles.card}>
        <TouchableOpacity
          style={styles.roomCardMain}
          activeOpacity={0.88}
          onPress={() => openRoomModal(room)}
        >
          <Image source={{ uri: room.image }} style={styles.cardImage} />

          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{room.name}</Text>

              <View
                style={[
                  styles.statusBadge,
                  occupied
                    ? styles.statusBadgeOccupied
                    : styles.statusBadgeAvailable,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    occupied
                      ? styles.statusBadgeTextOccupied
                      : styles.statusBadgeTextAvailable,
                  ]}
                >
                  {occupied ? "Occupied" : "Available now"}
                </Text>
              </View>
            </View>

            <Text style={styles.cardSubtitle}>{room.price || "No price"}</Text>

            {occupied ? (
              <Text style={styles.metaText}>
                Guest: {getGuestName(room.occupiedBooking)}
              </Text>
            ) : (
              <Text style={styles.manageHint}>
                Tap room details for manual guest entry
              </Text>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9b8b7e" />
        </TouchableOpacity>

        {reservationCount > 0 ? (
          <TouchableOpacity
            style={styles.reservationSummaryButton}
            activeOpacity={0.82}
            onPress={() => openReservationsModal(room)}
          >
            <View style={styles.reservationSummaryIcon}>
              <Ionicons name="calendar-outline" size={18} color="#6b3200" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.reservationSummaryTitle}>
                {reservationCount} booked reservation
                {reservationCount > 1 ? "s" : ""}
              </Text>

              {nextReservation ? (
                <Text style={styles.reservationSummaryText} numberOfLines={2}>
                  Next: {formatBookingRange(nextReservation)} • {getGuestName(nextReservation)}
                </Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={18} color="#9b8b7e" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noReservationBox}>
            <Ionicons name="calendar-clear-outline" size={17} color="#9b8b7e" />
            <Text style={styles.noReservationText}>No booked reservations</Text>
          </View>
        )}
      </View>
    );
  };

  const renderReservationRow = (booking) => {
    const isOccupied = booking.status === "checked-in";

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.reservationRow}
        activeOpacity={0.85}
        onPress={() => openBookingDetails(booking)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.reservationGuest}>{getGuestName(booking)}</Text>
          <Text style={styles.reservationDates}>{formatBookingRange(booking)}</Text>
          {!!booking.checkInTime && (
            <Text style={styles.reservationTime}>
              Check-in time: {booking.checkInTime}
            </Text>
          )}
        </View>

        <View style={styles.reservationRightBox}>
          <Text
            style={[
              styles.reservationStatus,
              isOccupied && styles.reservationStatusOccupied,
            ]}
          >
            {isOccupied ? "Occupied" : "Booked"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9b8b7e" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderReservationDirectory = () => {
    if (!selectedRoom) return null;

    const today = getLocalDateString();
    const yesterday = getYesterdayString();
    const isCustomDate =
      reservationDateFilter !== "all" &&
      reservationDateFilter !== today &&
      reservationDateFilter !== yesterday;

    const renderFilterButton = (label, value, iconName) => {
      const active = reservationDateFilter === value;

      return (
        <TouchableOpacity
          key={value}
          style={[styles.filterChip, active && styles.filterChipActive]}
          onPress={() => setReservationDateFilter(value)}
          activeOpacity={0.8}
        >
          {iconName ? (
            <Ionicons
              name={iconName}
              size={15}
              color={active ? "#fff" : "#6b3200"}
            />
          ) : null}
          <Text
            style={[
              styles.filterChipText,
              active && styles.filterChipTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <>
        <View style={styles.directoryHeader}>
          <View>
            <Text style={styles.directoryTitle}>Booked Reservations</Text>
            <Text style={styles.directorySubtitle}>
              Search a guest or filter reservations by occupied date.
            </Text>
          </View>

          <View style={styles.directoryCountBadge}>
            <Text style={styles.directoryCountText}>
              {selectedRoom.reservedBookings.length}
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#8b7e74" />
          <TextInput
            style={styles.searchInput}
            value={reservationSearch}
            onChangeText={setReservationSearch}
            placeholder="Search guest name..."
            placeholderTextColor="#9b8b7e"
            autoCapitalize="words"
          />
          {!!reservationSearch && (
            <TouchableOpacity onPress={() => setReservationSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9b8b7e" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {renderFilterButton("All", "all", "list-outline")}
          {renderFilterButton("Today", today, "today-outline")}
          {renderFilterButton("Yesterday", yesterday, "time-outline")}

          <TouchableOpacity
            style={[styles.filterChip, isCustomDate && styles.filterChipActive]}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={isCustomDate ? "#fff" : "#6b3200"}
            />
            <Text
              style={[
                styles.filterChipText,
                isCustomDate && styles.filterChipTextActive,
              ]}
            >
              {isCustomDate
                ? formatDateOnly(reservationDateFilter)
                : "Choose date"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {reservationDateFilter !== "all" ? (
          <View style={styles.activeDateFilterBox}>
            <Ionicons name="filter-outline" size={16} color="#6b3200" />
            <Text style={styles.activeDateFilterText}>
              Showing stays active on {formatDateOnly(reservationDateFilter)}
            </Text>
            <TouchableOpacity onPress={() => setReservationDateFilter("all")}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.resultsLabel}>
          {filteredReservations.length} result
          {filteredReservations.length === 1 ? "" : "s"}
        </Text>

        {filteredReservations.length === 0 ? (
          <View style={styles.emptyReservationBox}>
            <Ionicons name="search-outline" size={28} color="#9b8b7e" />
            <Text style={styles.emptyReservationTitle}>
              No matching reservations
            </Text>
            <Text style={styles.emptyReservationText}>
              Try another guest name or remove the selected date filter.
            </Text>
          </View>
        ) : (
          filteredReservations.map(renderReservationRow)
        )}
      </>
    );
  };

  const renderRoomManagement = () => {
    if (!selectedRoom) return null;

    return (
      <>
        <Image source={{ uri: selectedRoom.image }} style={styles.modalImage} />

        <Text style={styles.priceText}>
          {selectedRoom.price || "No price"}
        </Text>

        <View style={styles.roomStateCard}>
          <View>
            <Text style={styles.roomStateLabel}>Current status</Text>
            <Text style={styles.roomStateValue}>
              {selectedRoom.occupiedBooking ? "Occupied" : "Available now"}
            </Text>
          </View>

          {selectedRoom.reservedBookings.length > 0 ? (
            <TouchableOpacity
              style={styles.viewReservationsPill}
              onPress={() => {
                setRoomModalMode("reservations");
                setSelectedBooking(null);
                setReservationSearch("");
                setReservationDateFilter("all");
              }}
            >
              <Ionicons name="calendar-outline" size={15} color="#6b3200" />
              <Text style={styles.viewReservationsPillText}>
                {selectedRoom.reservedBookings.length} booked
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.roomStateCount}>No bookings</Text>
          )}
        </View>

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

        {selectedRoom.occupiedBooking ? (
          <>
            <Text style={styles.sectionSmallTitle}>Current Occupancy</Text>
            {renderReservationRow(selectedRoom.occupiedBooking)}
          </>
        ) : (
          <View style={styles.manualActionBox}>
            <Text style={styles.sectionSmallTitle}>Manual Guest Entry</Text>
            <Text style={styles.manualActionHint}>
              Use this for a walk-in guest or a manually recorded reservation.
            </Text>

            <Text style={styles.inputLabel}>Guest Name</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Enter guest name"
              placeholderTextColor="#8A7768"
              editable={!isProcessing}
            />

            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="Enter phone number optional"
              placeholderTextColor="#8A7768"
              keyboardType="phone-pad"
              editable={!isProcessing}
            />

            <TouchableOpacity
              style={[
                styles.actionButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleOccupyAvailableRoom}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isOccupying ? "Processing..." : "Occupy Now"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleBookRoom}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                "Continue to Booking Details"
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  const renderBookingDetails = () => {
    if (!selectedBooking) return null;

    const isOccupied = selectedBooking.status === "checked-in";

    return (
      <>
        <TouchableOpacity
          style={styles.backToRoomButton}
          onPress={closeBookingDetails}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={18} color="#6b3200" />
          <Text style={styles.backToRoomText}>
            {roomModalMode === "reservations"
              ? "Back to reservations"
              : "Back to room management"}
          </Text>
        </TouchableOpacity>

        <View style={styles.selectedBookingHeader}>
          <Text style={styles.sectionSmallTitle}>
            {isOccupied ? "Current Occupancy" : "Reservation Details"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isOccupied ? styles.statusBadgeOccupied : styles.statusBadgeBooked,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOccupied
                  ? styles.statusBadgeTextOccupied
                  : styles.statusBadgeTextBooked,
              ]}
            >
              {isOccupied ? "Occupied" : "Booked"}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>
            Guest Name:{" "}
            <Text style={styles.infoValue}>{getGuestName(selectedBooking)}</Text>
          </Text>

          <Text style={styles.infoLabel}>
            Phone:{" "}
            <Text style={styles.infoValue}>
              {selectedBooking.guestPhone || selectedBooking.userPhone || "Not set"}
            </Text>
          </Text>

          <Text style={styles.infoLabel}>
            Email:{" "}
            <Text style={styles.infoValue}>
              {selectedBooking.userEmail || "Not set"}
            </Text>
          </Text>

          <Text style={styles.infoLabel}>
            Stay:{" "}
            <Text style={styles.infoValue}>{formatBookingRange(selectedBooking)}</Text>
          </Text>

          {!!selectedBooking.checkInTime && (
            <Text style={styles.infoLabel}>
              Planned Check-in Time:{" "}
              <Text style={styles.infoValue}>{selectedBooking.checkInTime}</Text>
            </Text>
          )}

          <Text style={styles.infoLabel}>
            Stay Duration:{" "}
            <Text style={styles.infoValue}>
              {selectedBooking.stayNights || 1} night(s)
            </Text>
          </Text>

          {isOccupied && (
            <Text style={styles.infoLabel}>
              Checked In At:{" "}
              <Text style={styles.infoValue}>
                {formatDateTime(selectedBooking.checkInAt)}
              </Text>
            </Text>
          )}

          <Text style={styles.infoLabel}>
            Date Booked:{" "}
            <Text style={styles.infoValue}>
              {formatDateTime(selectedBooking.reservedAt || selectedBooking.createdAt)}
            </Text>
          </Text>

          <Text style={styles.infoLabel}>
            Guests:{" "}
            <Text style={styles.infoValue}>
              {formatGuests(selectedBooking.guests)}
            </Text>
          </Text>

          <Text style={styles.infoLabel}>
            Add-ons:{"\n"}
            <Text style={styles.infoValue}>
              {formatAddOns(selectedBooking.addOns)}
            </Text>
          </Text>

          {!!selectedBooking.specialRequest && (
            <Text style={styles.infoLabel}>
              Special Request:{" "}
              <Text style={styles.infoValue}>
                {selectedBooking.specialRequest}
              </Text>
            </Text>
          )}

          <Text style={styles.infoLabel}>
            Total Amount:{" "}
            <Text style={styles.infoValue}>
              ₱{getTotalAmount(selectedBooking)}
            </Text>
          </Text>
        </View>

        {!isOccupied && (
          <>
            <Text style={styles.inputLabel}>Guest Name</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Enter guest name"
              placeholderTextColor="#8A7768"
              editable={!isProcessing}
            />

            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="Enter phone number optional"
              placeholderTextColor="#8A7768"
              keyboardType="phone-pad"
              editable={!isProcessing}
            />

            <TouchableOpacity
              style={[styles.actionButton, isProcessing && styles.disabledButton]}
              onPress={handleOccupyBookedRoom}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isOccupying ? "Processing..." : "Check In Guest"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleCancelBookedRoom}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isCancelling ? "Cancelling..." : "Cancel Reservation"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isOccupied && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.checkoutButton,
              isProcessing && styles.disabledButton,
            ]}
            onPress={handleCheckoutOccupiedRoom}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isCheckingOut ? "Processing..." : "Check Out Guest"}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

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
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Room Overview</Text>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.pageSubtitle}>
          Bookings update automatically when a guest books, cancels, checks in, or checks out.
        </Text>

        {roomOverview.length === 0 ? (
          <Text style={styles.emptyText}>No rooms found.</Text>
        ) : (
          roomOverview.map(renderRoomOverviewCard)
        )}
      </ScrollView>

      <Modal
        visible={roomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeRoomModal}
      >
        <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRoom?.name}</Text>
              <TouchableOpacity onPress={closeRoomModal} disabled={isProcessing}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRoom && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectedBooking
                  ? renderBookingDetails()
                  : roomModalMode === "reservations"
                  ? renderReservationDirectory()
                  : renderRoomManagement()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <BookingDetailsModal
        visible={manualBookingModalVisible}
        room={selectedRoom}
        unavailableBookings={selectedRoom?.allActiveBookings || []}
        onClose={() => setManualBookingModalVisible(false)}
        onConfirmBooking={handleConfirmManualBooking}
        onBookingCreated={handleManualBookingCreated}
      />

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={[styles.calendarOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>Filter by date</Text>
                <Text style={styles.calendarSubtitle}>
                  Select a date to show reservations active that night.
                </Text>
              </View>

              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={
                reservationDateFilter === "all"
                  ? getLocalDateString()
                  : reservationDateFilter
              }
              onDayPress={(day) => {
                setReservationDateFilter(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={
                reservationDateFilter === "all"
                  ? {}
                  : {
                      [reservationDateFilter]: {
                        selected: true,
                        selectedColor: "#6b3200",
                        selectedTextColor: "#fff",
                      },
                    }
              }
              enableSwipeMonths
              theme={{
                todayTextColor: "#6b3200",
                arrowColor: "#6b3200",
                monthTextColor: "#2f241d",
                textMonthFontWeight: "800",
                textDayFontWeight: "500",
                textDayHeaderFontWeight: "700",
              }}
            />

            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => {
                setReservationDateFilter("all");
                setCalendarVisible(false);
              }}
            >
              <Text style={styles.clearDateButtonText}>Show all dates</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CREAM = "#FFF8E7";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9F7EE",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2E8B57",
    marginRight: 5,
  },
  liveBadgeText: {
    color: "#267047",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#4b2a12",
    marginTop: 8,
  },
  pageSubtitle: {
    color: "#7a6d63",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionSmallTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4b2a12",
    marginBottom: 10,
    marginTop: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  roomCardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  cardImage: {
    width: 78,
    height: 78,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#eee3db",
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#2f241d",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#7c6c60",
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeAvailable: {
    backgroundColor: "#e8f7ee",
  },
  statusBadgeOccupied: {
    backgroundColor: "#fdecec",
  },
  statusBadgeBooked: {
    backgroundColor: "#fff2df",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeTextAvailable: {
    color: "#227447",
  },
  statusBadgeTextOccupied: {
    color: "#a93636",
  },
  statusBadgeTextBooked: {
    color: "#9a5b16",
  },
  metaText: {
    fontSize: 12,
    color: "#5e554d",
    marginTop: 5,
  },
  manageHint: {
    color: "#8a7d73",
    fontSize: 11,
    marginTop: 7,
  },
  reservationSummaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ef",
    borderTopWidth: 1,
    borderTopColor: "#eee3db",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  reservationSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2e5d8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  reservationSummaryTitle: {
    color: "#6b3200",
    fontSize: 13,
    fontWeight: "800",
  },
  reservationSummaryText: {
    color: "#6b5a4a",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  noReservationBox: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1ebe5",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noReservationText: {
    color: "#8a7d73",
    fontSize: 12,
    marginLeft: 7,
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalImage: {
    width: "100%",
    height: 210,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: "#eee3db",
  },
  priceText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#6b3200",
    marginBottom: 10,
  },
  roomStateCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#faf7f4",
    borderRadius: 14,
    padding: 14,
  },
  roomStateLabel: {
    color: "#7a6d63",
    fontSize: 12,
  },
  roomStateValue: {
    color: "#2f241d",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  roomStateCount: {
    color: "#6b3200",
    fontSize: 13,
    fontWeight: "800",
  },
  viewReservationsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2e5d8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewReservationsPillText: {
    color: "#6b3200",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 5,
  },
  amenitiesBox: {
    backgroundColor: "#f7f2ed",
    borderRadius: 14,
    padding: 12,
    marginBottom: 4,
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
  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffaf4",
    borderWidth: 1,
    borderColor: "#eadfd4",
    borderRadius: 13,
    padding: 12,
    marginBottom: 9,
  },
  reservationGuest: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2f241d",
  },
  reservationDates: {
    fontSize: 12,
    color: "#6b5a4a",
    marginTop: 4,
    lineHeight: 17,
  },
  reservationTime: {
    fontSize: 11,
    color: "#8b7e74",
    marginTop: 2,
  },
  reservationRightBox: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  reservationStatus: {
    color: "#9a5b16",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  reservationStatusOccupied: {
    color: "#a93636",
  },
  emptyReservationBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf7f4",
    borderRadius: 13,
    padding: 20,
  },
  emptyReservationText: {
    color: "#7a6d63",
    fontSize: 13,
    textAlign: "center",
    marginTop: 7,
  },
  emptyReservationTitle: {
    color: "#2f241d",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 9,
  },
  directoryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  directoryTitle: {
    color: "#2f241d",
    fontSize: 20,
    fontWeight: "800",
  },
  directorySubtitle: {
    color: "#7a6d63",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 260,
  },
  directoryCountBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f2e5d8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  directoryCountText: {
    color: "#6b3200",
    fontSize: 15,
    fontWeight: "800",
  },
  searchBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ded5cc",
    borderRadius: 13,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 11,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 9,
    color: "#2f241d",
    fontSize: 14,
  },
  filterRow: {
    paddingRight: 12,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9c7b7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#6b3200",
    borderColor: "#6b3200",
  },
  filterChipText: {
    color: "#6b3200",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  activeDateFilterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ef",
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10,
  },
  activeDateFilterText: {
    flex: 1,
    color: "#6b5a4a",
    fontSize: 11,
    marginLeft: 7,
  },
  clearFilterText: {
    color: "#6b3200",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
  },
  resultsLabel: {
    color: "#7a6d63",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 9,
  },
  manualActionBox: {
    borderTopWidth: 1,
    borderTopColor: "#eee3db",
    marginTop: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  manualActionHint: {
    color: "#7a6d63",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  backToRoomButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 7,
    marginBottom: 4,
  },
  backToRoomText: {
    color: "#6b3200",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },
  selectedBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    lineHeight: 19,
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
    backgroundColor: "#6d4e3a",
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
    backgroundColor: "#2f7d4a",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarTitle: {
    color: "#2f241d",
    fontSize: 19,
    fontWeight: "800",
  },
  calendarSubtitle: {
    color: "#7a6d63",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 260,
  },
  clearDateButton: {
    borderWidth: 1,
    borderColor: "#6b3200",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 10,
  },
  clearDateButtonText: {
    color: "#6b3200",
    fontWeight: "800",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
