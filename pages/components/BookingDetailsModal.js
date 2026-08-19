import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";

const BROWN = "#6B3200";
const DEEP_BROWN = "#351706";
const CREAM = "#FFF8E7";
const CARD = "#FFFDF7";
const GOLD = "#D8B26A";
const SOFT_GOLD = "#F5E4BF";
const MUTED_BROWN = "#7B604D";
const LIGHT_BORDER = "#E6D2AA";

const ADD_ONS = [
  {
    id: "breakfast",
    name: "Breakfast",
    description: "Complimentary breakfast for every guest",
    type: "per_person_per_night",
    defaultSelected: true,
  },
  {
    id: "extra_bed",
    name: "Extra Bed",
    description: "Optional extra bed for children or additional guests",
    type: "per_night",
    defaultSelected: false,
  },
];

const HOTEL_TIME_ZONE = "Asia/Manila";

function getHotelDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getTodayString() {
  return getHotelDateString(new Date());
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "Not selected";
  const date = parseDateString(dateString);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getNightDifference(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = parseDateString(checkIn);
  const end = parseDateString(checkOut);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

function enumerateDates(startDateString, endDateString, includeEnd = true) {
  const dates = [];
  if (!startDateString || !endDateString) return dates;

  const current = parseDateString(startDateString);
  const end = parseDateString(endDateString);

  while (includeEnd ? current <= end : current < end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function buildUnavailableNightSet(bookings = []) {
  const unavailable = new Set();

  bookings.forEach((booking) => {
    if (!booking?.checkInDate || !booking?.checkOutDate) return;

    enumerateDates(
      booking.checkInDate,
      booking.checkOutDate,
      false
    ).forEach((dateString) => unavailable.add(dateString));
  });

  return unavailable;
}

function buildMarkedDates(
  checkInDate,
  checkOutDate,
  unavailableBookings = []
) {
  const marked = {};

  unavailableBookings.forEach((booking) => {
    if (!booking?.checkInDate || !booking?.checkOutDate) return;

    const reservedNights = enumerateDates(
      booking.checkInDate,
      booking.checkOutDate,
      false
    );

    reservedNights.forEach((dateString, index) => {
      marked[dateString] = {
        startingDay: index === 0,
        endingDay: index === reservedNights.length - 1,
        color: "#FCE8E6",
        textColor: "#B84040",
      };
    });
  });

  if (!checkInDate) return marked;

  if (!checkOutDate) {
    marked[checkInDate] = {
      selected: true,
      startingDay: true,
      endingDay: true,
      color: BROWN,
      textColor: "#ffffff",
    };
    return marked;
  }

  const selectedDates = enumerateDates(checkInDate, checkOutDate);

  selectedDates.forEach((dateString, index) => {
    const isStart = index === 0;
    const isEnd = index === selectedDates.length - 1;

    marked[dateString] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: isStart || isEnd ? BROWN : SOFT_GOLD,
      textColor: isStart || isEnd ? "#ffffff" : DEEP_BROWN,
    };
  });

  return marked;
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const cleaned = String(value).replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value) {
  const numberValue = Number(value || 0);
  return `₱${numberValue.toLocaleString("en-PH")}`;
}

export default function BookingDetailsModal({
  visible,
  room,
  onClose,
  onBookingCreated,
  onConfirmBooking,
  unavailableBookings = [],
}) {
  const insets = useSafeAreaInsets();
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [checkInTime, setCheckInTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState({ breakfast: true });
  const [specialRequest, setSpecialRequest] = useState("");
  const [loading, setLoading] = useState(false);

  const bookingScrollRef = useRef(null);
  const previousRoomIdRef = useRef(null);

  const roomPriceValue = parsePrice(room?.price || room?.roomPrice || 0);
  const roomPriceLabel =
    typeof room?.price === "string" && room?.price.trim()
      ? room.price
      : `${toMoney(roomPriceValue)}`;
  const roomName = room?.name || room?.roomName || "Selected Room";
  const roomId = room?.id || room?.roomId || null;
  const maxGuests = Number(room?.maxGuests || room?.capacity || 0);

  const resetBookingForm = () => {
    setCheckInDate(null);
    setCheckOutDate(null);
    setCheckInTime(new Date());
    setShowTimePicker(false);

    setAdults(1);
    setChildren(0);
    setPets(0);

    setSelectedAddOns({
      breakfast: true,
      extra_bed: false,
    });

    setSpecialRequest("");

    requestAnimationFrame(() => {
      bookingScrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    });
  };

  useEffect(() => {
    if (!visible || !roomId) return;

    const isFirstBookingSession = previousRoomIdRef.current === null;
    const openedDifferentRoom = previousRoomIdRef.current !== roomId;

    if (isFirstBookingSession || openedDifferentRoom) {
      resetBookingForm();
    }

    // Keep this room ID while the modal is hidden so reopening the same room
    // preserves the guest's unfinished draft.
    previousRoomIdRef.current = roomId;
  }, [visible, roomId]);

  const unavailableNightSet = useMemo(
    () => buildUnavailableNightSet(unavailableBookings),
    [unavailableBookings]
  );

  const hasUndatedActiveBooking = useMemo(
    () =>
      unavailableBookings.some(
        (booking) => !booking?.checkInDate || !booking?.checkOutDate
      ),
    [unavailableBookings]
  );

  const rangeContainsUnavailableNight = (startDate, endDate) => {
    if (!startDate || !endDate) return false;

    return enumerateDates(startDate, endDate, false).some((dateString) =>
      unavailableNightSet.has(dateString)
    );
  };

  const totalGuests = adults + children;
  const stayNights = useMemo(
    () => getNightDifference(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );

  const selectedAddOnsList = useMemo(() => {
    return ADD_ONS.filter((addOn) => !!selectedAddOns[addOn.id]);
  }, [selectedAddOns]);

  // All add-ons are complimentary and never change the room total.
  const addOnsTotal = 0;
  const roomSubtotal = roomPriceValue * stayNights;
  const totalAmount = roomSubtotal;

  const breakfastGuestCount = totalGuests;
  const breakfastTotalServings = totalGuests * stayNights;

  const hasGuestCapacityWarning = maxGuests > 0 && totalGuests > maxGuests;
  const shouldSuggestExtraBed = children > 0 && !selectedAddOns.extra_bed;

  const markedDates = useMemo(
    () =>
      buildMarkedDates(
        checkInDate,
        checkOutDate,
        unavailableBookings
      ),
    [checkInDate, checkOutDate, unavailableBookings]
  );

  const decrease = (setter, currentValue, minimumValue) => {
    if (currentValue > minimumValue) {
      setter(currentValue - 1);
    }
  };

  const increase = (setter, currentValue) => {
    setter(currentValue + 1);
  };

  const toggleAddOn = (id) => {
    if (id === "breakfast" && selectedAddOns.breakfast) {
      Alert.alert(
        "Remove Free Breakfast?",
        "Free breakfast is included for every guest. Are you sure you want to remove it from this booking?",
        [
          {
            text: "Keep Breakfast",
            style: "cancel",
          },
          {
            text: "Remove Breakfast",
            style: "destructive",
            onPress: () =>
              setSelectedAddOns((prev) => ({
                ...prev,
                breakfast: false,
              })),
          },
        ]
      );
      return;
    }

    setSelectedAddOns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDayPress = (day) => {
    const selectedDate = day.dateString;
    const selectingNewCheckIn = !checkInDate || !!checkOutDate;

    if (selectingNewCheckIn) {
      if (unavailableNightSet.has(selectedDate)) {
        Alert.alert(
          "Date Unavailable",
          "That night is already reserved. Please choose another check-in date."
        );
        return;
      }

      setCheckInDate(selectedDate);
      setCheckOutDate(null);
      return;
    }

    if (selectedDate <= checkInDate) {
      if (unavailableNightSet.has(selectedDate)) {
        Alert.alert(
          "Date Unavailable",
          "That night is already reserved. Please choose another check-in date."
        );
        return;
      }

      setCheckInDate(selectedDate);
      setCheckOutDate(null);
      return;
    }

    if (rangeContainsUnavailableNight(checkInDate, selectedDate)) {
      Alert.alert(
        "Dates Unavailable",
        "Your selected stay includes one or more reserved nights. Choose an earlier checkout date or a different check-in date."
      );
      return;
    }

    setCheckOutDate(selectedDate);
  };

  const resetDateSelection = () => {
    setCheckInDate(null);
    setCheckOutDate(null);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      setCheckInTime(selectedTime);
    }
  };

  const handleConfirmBooking = async () => {
    if (!roomId) {
      Alert.alert("Missing Room ID", "The selected room does not have an ID.");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Login Required", "Please login before booking a room.");
      return;
    }

    if (!checkInDate || !checkOutDate || stayNights < 1) {
      Alert.alert(
        "Select Stay Dates",
        "Please choose both check-in and check-out dates."
      );
      return;
    }

    if (hasGuestCapacityWarning) {
      Alert.alert(
        "Guest Limit Exceeded",
        `This room only allows up to ${maxGuests} guests.`
      );
      return;
    }

    if (hasUndatedActiveBooking) {
      Alert.alert(
        "Availability Unknown",
        "This room has an active booking without a checkout date. Please contact the hotel before booking it."
      );
      return;
    }

    if (rangeContainsUnavailableNight(checkInDate, checkOutDate)) {
      Alert.alert(
        "Dates Unavailable",
        "This room is already reserved during part of your selected stay."
      );
      return;
    }

    try {
      setLoading(true);

      const addOnsForFirestore = selectedAddOnsList.map((addOn) => {
        if (addOn.id === "breakfast") {
          return {
            id: addOn.id,
            name: addOn.name,
            type: addOn.type,
            isFree: true,
            automatic: false,
            includedByDefault: true,
            guestCount: breakfastGuestCount,
            quantityPerNight: breakfastGuestCount,
            stayNights,
            totalQuantity: breakfastTotalServings,
          };
        }

        return {
          id: addOn.id,
          name: addOn.name,
          type: addOn.type,
          isFree: true,
          automatic: false,
          quantity: 1,
          stayNights,
        };
      });

      const bookingData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || null,

        roomId,
        roomName,
        roomPrice: roomPriceValue,

        name: roomName,
        price: roomPriceLabel,
        image: room?.image || "",
        imageKey: room?.imageKey || "",
        amenities: room?.amenities || [],
        roomNumber: room?.roomNumber || "",

        status: "booked",

        checkInDate,
        checkInTime: formatTime(checkInTime),
        stayNights,
        checkOutDate,

        checkInAt: null,
        checkOutAt: null,

        guests: {
          adults,
          children,
          pets,
          totalGuests,
        },

        addOns: addOnsForFirestore,
        specialRequest: specialRequest.trim(),

        pricing: {
          roomRatePerNight: roomPriceValue,
          roomSubtotal,
          addOnsTotal,
          totalAmount,
        },

        reservedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (onConfirmBooking) {
        const result = await onConfirmBooking(bookingData);

        if (result === false) {
          return;
        }

        Alert.alert(
          "Booking Created",
          "Your room booking has been submitted successfully."
        );

        if (onBookingCreated) {
          onBookingCreated(result || bookingData);
        }

        resetBookingForm();
        previousRoomIdRef.current = null;
        onClose();
        return;
      }

      const docRef = await addDoc(collection(db, "roomBookings"), bookingData);

      Alert.alert(
        "Booking Created",
        "Your room booking has been submitted successfully."
      );

      if (onBookingCreated) {
        onBookingCreated({
          id: docRef.id,
          ...bookingData,
        });
      }

      resetBookingForm();
      previousRoomIdRef.current = null;
      onClose();
    } catch (error) {
      console.log("Booking error:", error);
      Alert.alert("Booking Failed", "Something went wrong while booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Book Your Stay</Text>
              <Text style={styles.subtitle}>{roomName}</Text>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={bookingScrollRef}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.roomCard}>
              <Text style={styles.roomPrice}>{roomPriceLabel} / night</Text>
              <Text style={styles.roomNote}>
                Choose your stay dates, guest count, and add-ons before confirming.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>When will you stay?</Text>

            <View style={styles.dateSummaryCard}>
              <View style={styles.dateSummaryBlock}>
                <Text style={styles.dateSummaryLabel}>Check-in</Text>
                <Text style={styles.dateSummaryValue}>
                  {formatDisplayDate(checkInDate)}
                </Text>
              </View>

              <View style={styles.dateDivider} />

              <View style={styles.dateSummaryBlock}>
                <Text style={styles.dateSummaryLabel}>Check-out</Text>
                <Text style={styles.dateSummaryValue}>
                  {formatDisplayDate(checkOutDate)}
                </Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              Tap a check-in date first, then tap a check-out date.
            </Text>

            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.selectedSwatch]} />
                <Text style={styles.legendText}>Your selected stay</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.reservedSwatch]} />
                <Text style={styles.legendText}>Reserved night</Text>
              </View>
            </View>

            {hasUndatedActiveBooking && (
              <Text style={styles.warningText}>
                This room has an active booking without a checkout date. Online availability cannot be confirmed yet.
              </Text>
            )}

            <Calendar
              current={checkInDate || getTodayString()}
              minDate={getTodayString()}
              onDayPress={handleDayPress}
              markingType="period"
              markedDates={markedDates}
              enableSwipeMonths
              hideExtraDays={false}
              theme={{
                backgroundColor: CARD,
                calendarBackground: CARD,
                textSectionTitleColor: MUTED_BROWN,
                selectedDayBackgroundColor: BROWN,
                selectedDayTextColor: "#ffffff",
                todayTextColor: BROWN,
                dayTextColor: DEEP_BROWN,
                textDisabledColor: "#D6C8BA",
                monthTextColor: BROWN,
                textMonthFontWeight: "800",
                textDayFontWeight: "600",
                textDayHeaderFontWeight: "700",
                arrowColor: BROWN,
              }}
              style={styles.calendar}
            />

            <View style={styles.stayFooterRow}>
              <Pressable style={styles.resetPill} onPress={resetDateSelection}>
                <Text style={styles.resetPillText}>Reset dates</Text>
              </Pressable>

              <View style={styles.nightPill}>
                <Text style={styles.nightPillText}>
                  {stayNights > 0 ? `${stayNights} night${stayNights > 1 ? "s" : ""}` : "Select checkout"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Check-in Time</Text>

            <Pressable
              style={styles.selectBox}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.label}>Arrival time</Text>
              <Text style={styles.selectValue}>{formatTime(checkInTime)}</Text>
            </Pressable>

            {showTimePicker && (
              <DateTimePicker
                value={checkInTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}

            <Text style={styles.sectionTitle}>Guests</Text>

            <GuestCounter
              title="Adults"
              subtitle="Ages 18 and above"
              value={adults}
              minimumValue={1}
              onDecrease={() => decrease(setAdults, adults, 1)}
              onIncrease={() => increase(setAdults, adults)}
            />

            <GuestCounter
              title="Children"
              subtitle="Ages 17 and below"
              value={children}
              minimumValue={0}
              onDecrease={() => decrease(setChildren, children, 0)}
              onIncrease={() => increase(setChildren, children)}
            />

            <GuestCounter
              title="Pets"
              subtitle="Dogs, cats, or small pets"
              value={pets}
              minimumValue={0}
              onDecrease={() => decrease(setPets, pets, 0)}
              onIncrease={() => increase(setPets, pets)}
            />

            {hasGuestCapacityWarning && (
              <Text style={styles.warningText}>
                This room only allows up to {maxGuests} guests.
              </Text>
            )}

            <Text style={styles.sectionTitle}>Complimentary Add-ons</Text>

            <Text style={styles.helperText}>
              These add-ons are free and do not change your booking total.
            </Text>

            {shouldSuggestExtraBed && (
              <Suggestion text="You added children. An extra bed may be helpful." />
            )}

            {ADD_ONS.map((addOn) => {
              const selected = !!selectedAddOns[addOn.id];
              const isBreakfast = addOn.id === "breakfast";

              return (
                <Pressable
                  key={addOn.id}
                  style={[
                    styles.addOnCard,
                    selected ? styles.addOnCardSelected : null,
                  ]}
                  onPress={() => toggleAddOn(addOn.id)}
                >
                  <View style={styles.checkbox}>
                    {selected && <Text style={styles.checkboxText}>✓</Text>}
                  </View>

                  <View style={styles.addOnInfo}>
                    <View style={styles.addOnTitleRow}>
                      <Text style={styles.addOnName}>{addOn.name}</Text>
                      {isBreakfast && selected && (
                        <View style={styles.automaticBadge}>
                          <Text style={styles.automaticBadgeText}>Preselected</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.addOnDescription}>
                      {isBreakfast
                        ? selected
                          ? stayNights > 0
                            ? `Included for ${breakfastGuestCount} guest${breakfastGuestCount === 1 ? "" : "s"} per day • ${breakfastTotalServings} total serving${breakfastTotalServings === 1 ? "" : "s"}`
                            : `Included for ${breakfastGuestCount} guest${breakfastGuestCount === 1 ? "" : "s"} per day`
                          : "Free breakfast removed. Tap to add it back."
                        : addOn.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Text style={styles.sectionTitle}>Special Request</Text>

            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Example: extra towel, quiet room, near window..."
              placeholderTextColor="#8A7768"
              value={specialRequest}
              onChangeText={setSpecialRequest}
            />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Price Summary</Text>

              <SummaryRow
                label={`Room (${roomPriceLabel} x ${stayNights} night/s)`}
                value={toMoney(roomSubtotal)}
              />

              <SummaryRow label="Complimentary add-ons" value="Included" />

              <View style={styles.divider} />

              <SummaryRow
                label="Total"
                value={toMoney(totalAmount)}
                large
              />
            </View>

            <Pressable
              style={[
                styles.confirmButton,
                loading || hasGuestCapacityWarning || hasUndatedActiveBooking
                  ? styles.confirmButtonDisabled
                  : null,
              ]}
              onPress={handleConfirmBooking}
              disabled={
                loading || hasGuestCapacityWarning || hasUndatedActiveBooking
              }
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function GuestCounter({
  title,
  subtitle,
  value,
  minimumValue,
  onDecrease,
  onIncrease,
}) {
  return (
    <View style={styles.counterRow}>
      <View>
        <Text style={styles.counterTitle}>{title}</Text>
        <Text style={styles.counterSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.counterControls}>
        <Pressable
          style={[
            styles.counterButton,
            value <= minimumValue ? styles.counterButtonDisabled : null,
          ]}
          onPress={onDecrease}
          disabled={value <= minimumValue}
        >
          <Text style={styles.counterButtonText}>−</Text>
        </Pressable>

        <Text style={styles.counterValue}>{value}</Text>

        <Pressable style={styles.counterButton} onPress={onIncrease}>
          <Text style={styles.counterButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Suggestion({ text }) {
  return (
    <View style={styles.suggestionBox}>
      <Text style={styles.suggestionText}>💡 {text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, large }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, large ? styles.summaryLarge : null]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, large ? styles.summaryLarge : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(53,23,6,0.48)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: CREAM,
    maxHeight: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: DEEP_BROWN,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED_BROWN,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SOFT_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 26,
    color: BROWN,
    marginTop: -2,
  },
  roomCard: {
    backgroundColor: SOFT_GOLD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: BROWN,
  },
  roomNote: {
    color: MUTED_BROWN,
    marginTop: 4,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DEEP_BROWN,
    marginTop: 18,
    marginBottom: 10,
  },
  dateSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    borderRadius: 18,
    backgroundColor: CARD,
    overflow: "hidden",
  },
  dateSummaryBlock: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dateDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: LIGHT_BORDER,
  },
  dateSummaryLabel: {
    fontSize: 12,
    color: MUTED_BROWN,
    marginBottom: 4,
  },
  dateSummaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: DEEP_BROWN,
  },
  helperText: {
    color: MUTED_BROWN,
    fontSize: 12,
    marginTop: 8,
  },
  calendarLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  selectedSwatch: {
    backgroundColor: BROWN,
  },
  reservedSwatch: {
    backgroundColor: "#FCE8E6",
    borderWidth: 1,
    borderColor: "#B84040",
  },
  legendText: {
    color: MUTED_BROWN,
    fontSize: 12,
  },
  calendar: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    borderRadius: 18,
    overflow: "hidden",
  },
  stayFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  resetPill: {
    borderWidth: 1,
    borderColor: BROWN,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resetPillText: {
    color: DEEP_BROWN,
    fontWeight: "700",
  },
  nightPill: {
    backgroundColor: BROWN,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nightPillText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  selectBox: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: CARD,
  },
  label: {
    fontSize: 12,
    color: MUTED_BROWN,
    marginBottom: 4,
  },
  selectValue: {
    fontSize: 16,
    fontWeight: "700",
    color: DEEP_BROWN,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE2CC",
  },
  counterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DEEP_BROWN,
  },
  counterSubtitle: {
    fontSize: 12,
    color: MUTED_BROWN,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  counterButtonDisabled: {
    backgroundColor: "#D5C7B7",
  },
  counterButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: -2,
  },
  counterValue: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: DEEP_BROWN,
  },
  warningText: {
    backgroundColor: "#FCE8E6",
    color: "#B84040",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    fontWeight: "600",
  },
  suggestionBox: {
    backgroundColor: "#FFF1D6",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  suggestionText: {
    color: "#7B4D16",
    lineHeight: 20,
  },
  addOnCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  addOnCardSelected: {
    borderColor: BROWN,
    backgroundColor: SOFT_GOLD,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxText: {
    color: BROWN,
    fontWeight: "900",
  },
  addOnInfo: {
    flex: 1,
  },
  addOnTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  automaticBadge: {
    marginLeft: 8,
    backgroundColor: SOFT_GOLD,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: GOLD,
  },
  automaticBadgeText: {
    color: BROWN,
    fontSize: 10,
    fontWeight: "800",
  },
  addOnName: {
    fontSize: 14,
    fontWeight: "800",
    color: DEEP_BROWN,
  },
  addOnDescription: {
    fontSize: 12,
    color: MUTED_BROWN,
    marginTop: 2,
  },
  addOnPrice: {
    fontWeight: "800",
    color: BROWN,
    marginLeft: 10,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: "top",
    color: DEEP_BROWN,
  },
  summaryCard: {
    backgroundColor: SOFT_GOLD,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DEEP_BROWN,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: MUTED_BROWN,
    flex: 1,
    marginRight: 10,
  },
  summaryValue: {
    color: DEEP_BROWN,
    fontWeight: "700",
  },
  summaryLarge: {
    fontSize: 17,
    fontWeight: "900",
    color: BROWN,
  },
  divider: {
    height: 1,
    backgroundColor: LIGHT_BORDER,
    marginVertical: 8,
  },
  confirmButton: {
    backgroundColor: BROWN,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: "#B8A28F",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
