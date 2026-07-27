import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./FirebaseConfig";
import { useFonts } from "expo-font";
import {
  createBookingWithNightLocks,
  releaseBookingLocksAndUpdateStatus,
} from "./services/bookingLockService";

import HotelHomeScreen from "./pages/HotelHomeScreen";
import LandingPageScreen from "./pages/LandingPageScreen";
import FoodMenuScreen from "./pages/FoodMenuScreen";
import RequestScreen from "./pages/RequestScreen";
import RegisterScreen from "./pages/RegisterScreen";
import LoginScreen from "./pages/LoginScreen";
import OrdersModal from "./pages/components/OrdersModal";
import ReservedRoomsModal from "./AppComponent/ReservedRoomsModal";
import RequestsModal from "./AppComponent/RequestsModal";
import InfoModal from "./AppComponent/InfoModal";

import AdminRoomScreen from "./pages/admin/AdminRoomScreen";
import AdminRequestScreen from "./pages/admin/AdminRequestScreen";

const Stack = createNativeStackNavigator();

function MainLayout({
  navigation,
  currentUser,
  userData,
  onOpenOrders,
  onOpenReservedRooms,
  onOpenRequests,
  onOpenInfo,
  activeScreen,
  onChangeScreen,
  children,
  isAdmin,
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const displayName = userData?.fullName || "Guest User";
  const userEmail = currentUser?.email || "No email";

  const confirmLogout = () => {
    setMenuVisible(false);

    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: handleLogout },
    ]);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={30} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>H&K Hotel and Home Kafe</Text>
        </View>
      </View>

      <View style={styles.pageContent}>{children}</View>

      <View style={styles.bottomNav}>
        {!isAdmin && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onChangeScreen("Landing")}
          >
            <Ionicons
              name="home-outline"
              size={23}
              color={activeScreen === "Landing" ? "#ffd37a" : "#fff"}
            />
            <Text
              style={[
                styles.navText,
                activeScreen === "Landing" && styles.activeNavText,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onChangeScreen("Rooms")}
        >
          <MaterialCommunityIcons
            name="bed-king-outline"
            size={23}
            color={activeScreen === "Rooms" ? "#ffd37a" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Rooms" && styles.activeNavText,
            ]}
          >
            Rooms
          </Text>
        </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isAdmin && styles.disabledNavItem]}
            disabled={isAdmin}
            onPress={() => onChangeScreen("FoodMenu")}
          >
            <Ionicons
              name="restaurant-outline"
              size={23}
              color={isAdmin ? "rgba(255,255,255,0.45)" : activeScreen === "FoodMenu" ? "#ffd37a" : "#fff"}
            />
            <Text
              style={[
                styles.navText,
                activeScreen === "FoodMenu" && styles.activeNavText,
                isAdmin && styles.disabledNavText,
              ]}
            >
              Food
            </Text>
          </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onChangeScreen("Request")}
        >
          <Feather
            name="edit"
            size={21}
            color={activeScreen === "Request" ? "#ffd37a" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Request" && styles.activeNavText,
            ]}
          >
            Request
          </Text>
        </TouchableOpacity>
      </View>

      <View pointerEvents={menuVisible ? "auto" : "none"} style={StyleSheet.absoluteFill}>
        {menuVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.sideMenu}>
              <View style={styles.userCard}>
                <Ionicons name="person-circle-outline" size={54} color="#4b3a2f" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userEmail}>{userEmail}</Text>
                </View>
              </View>

              <Text style={styles.sideMenuTitle}>Menu</Text>

              <TouchableOpacity
                style={[styles.menuItem, isAdmin && styles.disabledMenuItem]}
                disabled={isAdmin}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenOrders();
                }}
              >
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color={isAdmin ? "#9ca3af" : "#030303"}
                />
                <Text style={[styles.menuText, isAdmin && styles.disabledMenuText]}>
                  Orders
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, isAdmin && styles.disabledMenuItem]}
                disabled={isAdmin}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenReservedRooms();
                }}
              >
                <MaterialCommunityIcons
                  name="bed-outline"
                  size={22}
                  color={isAdmin ? "#9ca3af" : "#4b3a2f"}
                />
                <Text style={[styles.menuText, isAdmin && styles.disabledMenuText]}>
                  Reserved Room
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, isAdmin && styles.disabledMenuItem]}
                disabled={isAdmin}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenRequests();
                }}
              >
                <Feather
                  name="file-text"
                  size={20}
                  color={isAdmin ? "#9ca3af" : "#4b3a2f"}
                />
                <Text style={[styles.menuText, isAdmin && styles.disabledMenuText]}>
                  Requests
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenInfo();
                }}
              >
                <Ionicons name="information-circle-outline" size={22} color="#4b3a2f" />
                <Text style={styles.menuText}>Hotel Info</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function MainShell({
  navigation,
  currentUser,
  userData,
  onBookRoom,
  onOpenOrders,
  onOpenReservedRooms,
  onOpenRequests,
  onOpenInfo,
  roomStatusRefreshKey,
}) {
  const isAdmin = userData?.role === "admin";
  const [activeScreen, setActiveScreen] = useState("Landing");

  useEffect(() => {
    if (isAdmin && activeScreen === "Landing") {
      setActiveScreen("Rooms");
    }
  }, [isAdmin, activeScreen]);

  const renderContent = () => {
    if (isAdmin) {
      switch (activeScreen) {
        case "Request":
          return <AdminRequestScreen />;

        case "Rooms":
        default:
          return <AdminRoomScreen />;
      }
    }

    switch (activeScreen) {
      case "Rooms":
        return (
          <HotelHomeScreen
            onBookRoom={onBookRoom}
            roomStatusRefreshKey={roomStatusRefreshKey}
          />
        );
      case "FoodMenu":
        return <FoodMenuScreen />;
      case "Request":
        return <RequestScreen />;
      case "Landing":
      default:
        return (
          <LandingPageScreen
            onGoRooms={() => setActiveScreen("Rooms")}
            onGoFoodMenu={() => setActiveScreen("FoodMenu")}
          />
        );
    }
  };

  return (
    <MainLayout
      navigation={navigation}
      currentUser={currentUser}
      userData={userData}
      onOpenOrders={onOpenOrders}
      onOpenReservedRooms={onOpenReservedRooms}
      onOpenRequests={onOpenRequests}
      onOpenInfo={onOpenInfo}
      activeScreen={activeScreen}
      onChangeScreen={setActiveScreen}
      isAdmin={isAdmin}
    >
      {renderContent()}
    </MainLayout>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Pacifico: require("./assets/font/pacifico.ttf"),
  });

  const [initialRoute, setInitialRoute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [reservedRoomsModalVisible, setReservedRoomsModalVisible] = useState(false);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingReservedRooms, setLoadingReservedRooms] = useState(false);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);

  const [userOrders, setUserOrders] = useState([]);
  const [reservedRooms, setReservedRooms] = useState([]);
  const [userRequests, setUserRequests] = useState([]);

  const [cancellingRoomId, setCancellingRoomId] = useState(null);

  const [roomStatusRefreshKey, setRoomStatusRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        setInitialRoute("Main");

        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            setUserData(null);
            console.log("User document not found");
          }
        } catch (error) {
          console.log("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
        setReservedRooms([]);
        setInitialRoute("Login");
      }
    });

    return unsubscribe;
  }, []);

  const fetchReservedRooms = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setLoadingReservedRooms(true);

      const bookingsRef = collection(db, "roomBookings");
      const q = query(
        bookingsRef,
        where("userId", "==", user.uid),
        where("status", "==", "booked")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      data.sort((a, b) => {
        const aTime = a.reservedAt?.seconds || 0;
        const bTime = b.reservedAt?.seconds || 0;
        return bTime - aTime;
      });

      setReservedRooms(data);
    } catch (error) {
      console.log("Error fetching reserved rooms:", error);
      Alert.alert("Error", "Failed to load reserved rooms.");
    } finally {
      setLoadingReservedRooms(false);
    }
  };

  const fetchUserOrders = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setLoadingOrders(true);

      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const cancellableOrders = data.filter(
        (order) => order.status === "pending" || order.status === "confirmed"
      );

      cancellableOrders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setUserOrders(cancellableOrders);
    } catch (error) {
      console.log("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchUserRequests = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setLoadingRequests(true);

      const requestsRef = collection(db, "requests");
      const q = query(requestsRef, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const cancellableRequests = data.filter(
        (request) => request.status === "pending" || request.status === "confirmed"
      );

      cancellableRequests.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setUserRequests(cancellableRequests);
    } catch (error) {
      console.log("Error fetching requests:", error);
      Alert.alert("Error", "Failed to load requests.");
    } finally {
      setLoadingRequests(false);
    }
  };

  const openOrdersModal = async () => {
    setOrdersModalVisible(true);
    await fetchUserOrders();
  };

  const openRequestsModal = async () => {
    setRequestsModalVisible(true);
    await fetchUserRequests();
  };

  const openReservedRoomsModal = async () => {
    setReservedRoomsModalVisible(true);
    await fetchReservedRooms();
  };

  const handleBookRoom = async (roomOrBookingDetails) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return false;
    }

    const cleanUndefined = (value) => {
      if (Array.isArray(value)) {
        return value.map(cleanUndefined);
      }

      if (value && typeof value === "object") {
        const prototype = Object.getPrototypeOf(value);
        const isPlainObject = prototype === Object.prototype || prototype === null;

        if (!isPlainObject) {
          return value;
        }

        const cleaned = {};

        Object.keys(value).forEach((key) => {
          if (value[key] !== undefined) {
            cleaned[key] = cleanUndefined(value[key]);
          }
        });

        return cleaned;
      }

      return value;
    };

    const datesOverlap = (startA, endA, startB, endB) => {
      if (!startA || !endA || !startB || !endB) return true;

      // Date strings are saved as YYYY-MM-DD, so string comparison works.
      return startA < endB && endA > startB;
    };

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert("Error", "User profile not found.");
        return false;
      }

      const userProfile = userSnap.data();

      const roomId = roomOrBookingDetails?.roomId || roomOrBookingDetails?.id;

      if (!roomId) {
        Alert.alert(
          "Booking Error",
          "Room ID is missing. Please reopen the room and try again."
        );
        return false;
      }

      const isDateRangeBooking =
        !!roomOrBookingDetails?.checkInDate &&
        !!roomOrBookingDetails?.checkOutDate;

      const bookingsRef = collection(db, "roomBookings");

      const existingBookedQuery = query(
        bookingsRef,
        where("roomId", "==", roomId),
        where("status", "==", "booked")
      );

      const existingCheckedInQuery = query(
        bookingsRef,
        where("roomId", "==", roomId),
        where("status", "==", "checked-in")
      );

      const [existingBookedSnapshot, existingCheckedInSnapshot] =
        await Promise.all([
          getDocs(existingBookedQuery),
          getDocs(existingCheckedInQuery),
        ]);

      const existingActiveBookings = [
        ...existingBookedSnapshot.docs,
        ...existingCheckedInSnapshot.docs,
      ].map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      if (isDateRangeBooking) {
        const hasOverlappingBooking = existingActiveBookings.some((booking) => {
          if (!booking.checkInDate || !booking.checkOutDate) {
            return true;
          }

          return datesOverlap(
            roomOrBookingDetails.checkInDate,
            roomOrBookingDetails.checkOutDate,
            booking.checkInDate,
            booking.checkOutDate
          );
        });

        if (hasOverlappingBooking) {
          Alert.alert(
            "Unavailable",
            "This room is already booked or occupied for the selected dates."
          );
          return false;
        }
      } else if (existingActiveBookings.length > 0) {
        Alert.alert("Unavailable", "This room is already booked or occupied.");
        return false;
      }

      const roomName =
        roomOrBookingDetails?.roomName ||
        roomOrBookingDetails?.name ||
        "Unnamed Room";

      const roomPrice =
        roomOrBookingDetails?.price ||
        roomOrBookingDetails?.roomPrice ||
        "";

      const bookingPayload = {
        ...roomOrBookingDetails,

        userId: user.uid,
        userEmail: user.email || "",
        userFullName: userProfile.fullName || "",
        userPhone: userProfile.phone || "",

        roomId,
        roomName,
        name: roomName,
        price: roomPrice,

        image: roomOrBookingDetails?.image || "",
        imageKey: roomOrBookingDetails?.imageKey || "",
        amenities: roomOrBookingDetails?.amenities || [],
        roomNumber: roomOrBookingDetails?.roomNumber || "",

        guestName: userProfile.fullName || "",
        guestPhone: userProfile.phone || "",

        checkInAt: roomOrBookingDetails?.checkInAt || null,
        checkOutAt: roomOrBookingDetails?.checkOutAt || null,

        status: "booked",
        reservedAt: serverTimestamp(),
        createdAt: roomOrBookingDetails?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!isDateRangeBooking) {
        Alert.alert(
          "Select Stay Dates",
          "Please choose both check-in and checkout dates before booking."
        );
        return false;
      }

      const createdBooking = await createBookingWithNightLocks(
        cleanUndefined(bookingPayload)
      );

      await fetchReservedRooms();

      setRoomStatusRefreshKey((prev) => prev + 1);

      return createdBooking;
    } catch (error) {
      console.log("Error booking room:", error);

      if (error.code === "booking/date-conflict") {
        Alert.alert(
          "Room Just Booked",
          `Another guest reserved this room for ${error.conflictDate || "one of your selected dates"}. Please choose different dates.`
        );
      } else if (error.code === "booking/stay-too-long") {
        Alert.alert("Stay Too Long", error.message);
      } else if (
        error.code === "booking/invalid-date" ||
        error.code === "booking/invalid-range" ||
        error.code === "booking/missing-dates"
      ) {
        Alert.alert("Invalid Stay Dates", error.message);
      } else {
        Alert.alert("Error", "Failed to reserve room.");
      }

      return false;
    }
  };

  const handleCancelRoom = async (bookingId) => {
    const user = auth.currentUser;
    if (!user) return;

    if (cancellingRoomId) return;

    Alert.alert("Cancel Reserved Room", "Do you want to cancel this reserved room?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setCancellingRoomId(bookingId);

            await releaseBookingLocksAndUpdateStatus({
              bookingId,
              newStatus: "cancelled",
              actorId: user.uid,
              requireOwner: true,
              additionalFields: {
                cancelledAt: serverTimestamp(),
                cancelledBy: user.uid,
              },
            });

            setReservedRooms((prev) =>
              prev.filter((room) => room.id !== bookingId)
            );

            setRoomStatusRefreshKey((prev) => prev + 1);

            Alert.alert("Cancelled", "Your reserved room has been cancelled.");
          } catch (error) {
            console.log("Error cancelling reserved room:", error);
            Alert.alert("Error", "Failed to cancel reserved room.");
          } finally {
            setCancellingRoomId(null);
          }
        },
      },
    ]);
  };

  const handleCancelOrder = async (order) => {
    const user = auth.currentUser;
    if (!user || !order) return false;

    try {
      setCancellingOrderId(order.id);

      await updateDoc(doc(db, "orders", order.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      setUserOrders((prev) => prev.filter((item) => item.id !== order.id));

      Alert.alert("Order Cancelled", "Your order has been cancelled.");
      return true;
    } catch (error) {
      console.log("Error cancelling order:", error);
      Alert.alert("Error", "Failed to cancel order.");
      return false;
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCancelRequest = async (request) => {
    const user = auth.currentUser;
    if (!user || !request) return false;

    try {
      setCancellingRequestId(request.id);

      await updateDoc(doc(db, "requests", request.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      setUserRequests((prev) => prev.filter((item) => item.id !== request.id));

      Alert.alert("Request Cancelled", "Your request has been cancelled.");
      return true;
    } catch (error) {
      console.log("Error cancelling request:", error);
      Alert.alert("Error", "Failed to cancel request.");
      return false;
    } finally {
      setCancellingRequestId(null);
    }
  };

  const screenProps = useMemo(
    () => ({
      currentUser,
      userData,
      onBookRoom: handleBookRoom,
      onOpenOrders: openOrdersModal,
      onOpenReservedRooms: openReservedRoomsModal,
      onOpenRequests: openRequestsModal,
      onOpenInfo: () => setInfoModalVisible(true),
      roomStatusRefreshKey,
    }),
    [currentUser, userData, roomStatusRefreshKey]
  );

  if (!fontsLoaded || !initialRoute) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b3200" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main">
            {(props) => <MainShell {...props} {...screenProps} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      <OrdersModal
        visible={ordersModalVisible}
        onClose={() => setOrdersModalVisible(false)}
        loadingOrders={loadingOrders}
        userOrders={userOrders}
        onCancelOrder={handleCancelOrder}
        cancellingOrderId={cancellingOrderId}
      />

      <ReservedRoomsModal
        visible={reservedRoomsModalVisible}
        onClose={() => setReservedRoomsModalVisible(false)}
        reservedRooms={reservedRooms}
        onCancelRoom={handleCancelRoom}
        loadingReservedRooms={loadingReservedRooms}
        cancellingRoomId={cancellingRoomId}
      />

      <RequestsModal
        visible={requestsModalVisible}
        onClose={() => setRequestsModalVisible(false)}
        loadingRequests={loadingRequests}
        userRequests={userRequests}
        onCancelRequest={handleCancelRequest}
        cancellingRequestId={cancellingRequestId}
      />

      <InfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
      />
    </>
  );
}

const SECONDARY = "#6b3200";
const BG = "#FFF8E7";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },
  header: {
    backgroundColor: SECONDARY,
    paddingLeft: 12,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 23,
    fontFamily: "Pacifico",
    flexShrink: 1,
    marginLeft: 10,
  },
  pageContent: {
    flex: 1,
  },
  bottomNav: {
    backgroundColor: SECONDARY,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
  },
  navText: {
    color: "#fff",
    fontSize: 11,
    marginTop: 4,
  },
  activeNavText: {
    color: "#ffd37a",
    fontWeight: "800",
  },
  disabledNavItem: {
    opacity: 0.45,
  },
  disabledNavText: {
    color: "rgba(255,255,255,0.45)",
  },
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sideMenu: {
    width: 285,
    backgroundColor: "#fff",
    paddingTop: 58,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f2ed",
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f241d",
  },
  userEmail: {
    fontSize: 12,
    color: "#7b6c60",
    marginTop: 2,
  },
  sideMenuTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6b3200",
    marginBottom: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#222",
    fontWeight: "500",
  },
  disabledMenuItem: {
    opacity: 0.45,
  },
  disabledMenuText: {
    color: "#9ca3af",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 10,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#b91c1c",
    fontWeight: "600",
  },
});
