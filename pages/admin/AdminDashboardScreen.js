import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

const CREAM = "#FFF8E7";
const WHITE = "#FFFFFF";
const BROWN = "#6B3200";
const DEEP_BROWN = "#351706";
const GOLD = "#D8B26A";
const MUTED = "#806D5D";
const SOFT_BROWN = "#F3E5D3";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DashboardCard({
  icon,
  iconLibrary = "ionicons",
  title,
  description,
  metrics,
  actionLabel,
  onPress,
}) {
  const IconComponent =
    iconLibrary === "material"
      ? MaterialCommunityIcons
      : iconLibrary === "feather"
      ? Feather
      : Ionicons;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardIconBox}>
          <IconComponent name={icon} size={25} color={BROWN} />
        </View>

        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color="#9D8067" />
      </View>

      <View style={styles.metricsRow}>
        {metrics.map((metric, index) => (
          <View
            key={metric.label}
            style={[
              styles.metric,
              index < metrics.length - 1 && styles.metricWithDivider,
            ]}
          >
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardActionRow}>
        <Text style={styles.cardActionText}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={17} color={BROWN} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen({ onNavigate }) {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState({
    rooms: false,
    bookings: false,
    orders: false,
    requests: false,
  });
  const [listenerError, setListenerError] = useState("");

  useEffect(() => {
    const subscribe = (collectionName, setter, loadingKey) =>
      onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          setter(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          );
          setLoaded((current) => ({ ...current, [loadingKey]: true }));
        },
        (error) => {
          console.log(`Admin dashboard ${collectionName} listener error:`, error);
          setListenerError("Some dashboard totals could not be loaded.");
          setLoaded((current) => ({ ...current, [loadingKey]: true }));
        }
      );

    const unsubscribers = [
      subscribe("rooms", setRooms, "rooms"),
      subscribe("roomBookings", setBookings, "bookings"),
      subscribe("orders", setOrders, "orders"),
      subscribe("requests", setRequests, "requests"),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const loading = !Object.values(loaded).every(Boolean);
  const today = getLocalDateString();

  const summary = useMemo(() => {
    const occupiedRoomIds = new Set(
      bookings
        .filter((booking) => booking.status === "checked-in")
        .map((booking) => booking.roomId)
        .filter(Boolean)
    );

    const bookedReservations = bookings.filter(
      (booking) => booking.status === "booked"
    );

    const arrivalsToday = bookedReservations.filter(
      (booking) => booking.checkInDate === today
    ).length;

    const departuresToday = bookings.filter(
      (booking) =>
        booking.status === "checked-in" && booking.checkOutDate === today
    ).length;

    const newOrders = orders.filter((order) =>
      ["pending", "confirmed"].includes(order.status || "pending")
    ).length;

    const activeOrders = orders.filter((order) =>
      ["preparing", "ready", "out_for_delivery"].includes(order.status)
    ).length;

    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered"
    ).length;

    const newRequests = requests.filter((request) =>
      ["pending", "confirmed"].includes(request.status || "pending")
    ).length;

    const activeRequests = requests.filter((request) =>
      ["acknowledged", "ongoing"].includes(request.status)
    ).length;

    const completedRequests = requests.filter((request) =>
      ["completed", "fulfilled"].includes(request.status)
    ).length;

    return {
      roomAvailableNow: Math.max(rooms.length - occupiedRoomIds.size, 0),
      roomOccupied: occupiedRoomIds.size,
      bookedReservations: bookedReservations.length,
      arrivalsToday,
      departuresToday,
      newOrders,
      activeOrders,
      deliveredOrders,
      newRequests,
      activeRequests,
      completedRequests,
    };
  }, [bookings, orders, requests, rooms.length, today]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BROWN} />
        <Text style={styles.loadingText}>Loading admin dashboard…</Text>
      </View>
    );
  }

  const attentionItems = [
    summary.newOrders > 0
      ? `${summary.newOrders} food order${summary.newOrders === 1 ? "" : "s"} waiting for attention`
      : null,
    summary.newRequests > 0
      ? `${summary.newRequests} guest request${summary.newRequests === 1 ? "" : "s"} waiting for attention`
      : null,
    summary.arrivalsToday > 0
      ? `${summary.arrivalsToday} scheduled arrival${summary.arrivalsToday === 1 ? "" : "s"} today`
      : null,
    summary.departuresToday > 0
      ? `${summary.departuresToday} expected departure${summary.departuresToday === 1 ? "" : "s"} today`
      : null,
  ].filter(Boolean);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>ADMIN OVERVIEW</Text>
      <Text style={styles.title}>Hotel operations at a glance</Text>
      <Text style={styles.subtitle}>
        Live room, food-order, and service-request totals.
      </Text>

      {listenerError ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#9A5B00" />
          <Text style={styles.warningText}>{listenerError}</Text>
        </View>
      ) : null}

      <View style={styles.attentionCard}>
        <View style={styles.attentionHeader}>
          <View style={styles.attentionIcon}>
            <Ionicons name="notifications-outline" size={21} color={CREAM} />
          </View>
          <View style={styles.attentionHeading}>
            <Text style={styles.attentionTitle}>Needs attention</Text>
            <Text style={styles.attentionSubtitle}>
              {attentionItems.length > 0
                ? "Items that may require action now"
                : "Everything looks clear right now"}
            </Text>
          </View>
        </View>

        {attentionItems.length > 0 ? (
          attentionItems.map((item) => (
            <View key={item} style={styles.attentionRow}>
              <View style={styles.attentionDot} />
              <Text style={styles.attentionText}>{item}</Text>
            </View>
          ))
        ) : (
          <View style={styles.allClearRow}>
            <Ionicons name="checkmark-circle" size={20} color="#3C8B62" />
            <Text style={styles.allClearText}>No urgent pending items.</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Management</Text>

      <DashboardCard
        icon="bed-king-outline"
        iconLibrary="material"
        title="Rooms"
        description="Reservations, occupancy, check-in, and checkout"
        metrics={[
          { label: "Available now", value: summary.roomAvailableNow },
          { label: "Occupied", value: summary.roomOccupied },
          { label: "Reservations", value: summary.bookedReservations },
        ]}
        actionLabel="Manage rooms"
        onPress={() => onNavigate?.("Rooms")}
      />

      <DashboardCard
        icon="restaurant-outline"
        title="Food Orders"
        description="Kitchen progress, estimates, and delivery status"
        metrics={[
          { label: "New", value: summary.newOrders },
          { label: "In progress", value: summary.activeOrders },
          { label: "Delivered", value: summary.deliveredOrders },
        ]}
        actionLabel="Manage food orders"
        onPress={() => onNavigate?.("FoodMenu")}
      />

      <DashboardCard
        icon="file-text"
        iconLibrary="feather"
        title="Guest Requests"
        description="Acknowledge, process, and complete hotel requests"
        metrics={[
          { label: "New", value: summary.newRequests },
          { label: "Ongoing", value: summary.activeRequests },
          { label: "Completed", value: summary.completedRequests },
        ]}
        actionLabel="Manage requests"
        onPress={() => onNavigate?.("Request")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 10,
  },
  eyebrow: {
    color: "#A36C28",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    color: DEEP_BROWN,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0CE",
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    color: "#81510F",
    fontSize: 13,
    marginLeft: 8,
  },
  attentionCard: {
    backgroundColor: BROWN,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  attentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  attentionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: DEEP_BROWN,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionHeading: {
    flex: 1,
    marginLeft: 10,
  },
  attentionTitle: {
    color: CREAM,
    fontSize: 17,
    fontWeight: "900",
  },
  attentionSubtitle: {
    color: "#EED6B8",
    fontSize: 12,
    marginTop: 2,
  },
  attentionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
  },
  attentionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginTop: 6,
    marginRight: 9,
  },
  attentionText: {
    flex: 1,
    color: CREAM,
    fontSize: 13,
    lineHeight: 19,
  },
  allClearRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 10,
  },
  allClearText: {
    color: CREAM,
    fontSize: 13,
    marginLeft: 8,
  },
  sectionTitle: {
    color: DEEP_BROWN,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E7D2B3",
    padding: 15,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconBox: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: SOFT_BROWN,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeading: {
    flex: 1,
    marginHorizontal: 11,
  },
  cardTitle: {
    color: DEEP_BROWN,
    fontSize: 17,
    fontWeight: "900",
  },
  cardDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#FCF5EA",
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 11,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
  },
  metricWithDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#DCC5A5",
  },
  metricValue: {
    color: BROWN,
    fontSize: 21,
    fontWeight: "900",
  },
  metricLabel: {
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  cardActionText: {
    color: BROWN,
    fontSize: 13,
    fontWeight: "800",
    marginRight: 5,
  },
});
