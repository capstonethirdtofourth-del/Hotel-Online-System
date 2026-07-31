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
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "./FirebaseConfig";
import { useFonts } from "expo-font";
import {
  createBookingWithNightLocks,
  releaseBookingLocksAndUpdateStatus,
} from "./services/bookingLockService";
import { updateActivityStatus } from "./services/activityStatusService";

import HotelHomeScreen from "./pages/HotelHomeScreen";
import LandingPageScreen from "./pages/LandingPageScreen";
import FoodMenuScreen from "./pages/FoodMenuScreen";
import RequestScreen from "./pages/RequestScreen";
import RegisterScreen from "./pages/RegisterScreen";
import LoginScreen from "./pages/LoginScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import ReservedRoomsModal from "./AppComponent/ReservedRoomsModal";
import InfoModal from "./AppComponent/InfoModal";
import ActivityStatusModal from "./AppComponent/ActivityStatusModal";

import AdminRoomScreen from "./pages/admin/AdminRoomScreen";
import AdminRequestScreen from "./pages/admin/AdminRequestScreen";
import AdminFoodOrderScreen from "./pages/admin/AdminFoodOrderScreen";
import AdminDashboardScreen from "./pages/admin/AdminDashboardScreen";

const Stack = createNativeStackNavigator();

function MainLayout({
  navigation,
  currentUser,
  userData,
  onOpenStatus,
  onOpenReservedRooms,
  onOpenInfo,
  activeScreen,
  onChangeScreen,
  children,
  isAdmin,
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const displayName = userData?.fullName || (isAdmin ? "Hotel Administrator" : "Guest User");
  const userEmail = currentUser?.email || "No email";

  const adminScreenTitles = {
    AdminDashboard: "Admin Dashboard",
    Rooms: "Room Management",
    FoodMenu: "Food Order Management",
    Request: "Guest Request Management",
  };

  const headerTitle = isAdmin
    ? adminScreenTitles[activeScreen] || "H&K Admin"
    : "H&K Hotel and Home Kafe";

  const changeScreenFromMenu = (screenName) => {
    setMenuVisible(false);
    onChangeScreen(screenName);
  };

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
      navigation.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      });
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="Open navigation menu"
          >
            <Ionicons name="menu-outline" size={30} color="#fff" />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              isAdmin && styles.adminHeaderTitle,
            ]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
        </View>
      </View>

      <View style={styles.pageContent}>{children}</View>

      {!isAdmin && (
        <View style={styles.bottomNav}>
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
            style={styles.navItem}
            onPress={() => onChangeScreen("FoodMenu")}
          >
            <Ionicons
              name="restaurant-outline"
              size={23}
              color={activeScreen === "FoodMenu" ? "#ffd37a" : "#fff"}
            />
            <Text
              style={[
                styles.navText,
                activeScreen === "FoodMenu" && styles.activeNavText,
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
      )}

      <View
        pointerEvents={menuVisible ? "auto" : "none"}
        style={StyleSheet.absoluteFill}
      >
        {menuVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.sideMenu}>
              <View style={styles.userCard}>
                <Ionicons
                  name={isAdmin ? "shield-checkmark-outline" : "person-circle-outline"}
                  size={54}
                  color="#4b3a2f"
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userEmail}>{userEmail}</Text>
                  {isAdmin && <Text style={styles.adminRoleLabel}>ADMIN ACCOUNT</Text>}
                </View>
              </View>

              <Text style={styles.sideMenuTitle}>
                {isAdmin ? "Admin Navigation" : "Menu"}
              </Text>

              {isAdmin ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      activeScreen === "AdminDashboard" && styles.activeMenuItem,
                    ]}
                    onPress={() => changeScreenFromMenu("AdminDashboard")}
                  >
                    <Ionicons name="grid-outline" size={22} color="#4b3a2f" />
                    <Text style={styles.menuText}>Dashboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      activeScreen === "Rooms" && styles.activeMenuItem,
                    ]}
                    onPress={() => changeScreenFromMenu("Rooms")}
                  >
                    <MaterialCommunityIcons
                      name="bed-king-outline"
                      size={22}
                      color="#4b3a2f"
                    />
                    <Text style={styles.menuText}>Rooms</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      activeScreen === "FoodMenu" && styles.activeMenuItem,
                    ]}
                    onPress={() => changeScreenFromMenu("FoodMenu")}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={22}
                      color="#4b3a2f"
                    />
                    <Text style={styles.menuText}>Food Orders</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      activeScreen === "Request" && styles.activeMenuItem,
                    ]}
                    onPress={() => changeScreenFromMenu("Request")}
                  >
                    <Feather name="file-text" size={21} color="#4b3a2f" />
                    <Text style={styles.menuText}>Guest Requests</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      onOpenStatus();
                    }}
                  >
                    <Ionicons name="pulse-outline" size={22} color="#4b3a2f" />
                    <Text style={styles.menuText}>Status</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      onOpenReservedRooms();
                    }}
                  >
                    <MaterialCommunityIcons
                      name="bed-outline"
                      size={22}
                      color="#4b3a2f"
                    />
                    <Text style={styles.menuText}>Reserved Room</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenInfo();
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color="#4b3a2f"
                />
                <Text style={styles.menuText}>Hotel Info</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <Pressable
              style={styles.backdrop}
              onPress={() => setMenuVisible(false)}
            />
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
  onOpenStatus,
  onOpenReservedRooms,
  onOpenInfo,
  roomStatusRefreshKey,
}) {
  const isAdmin = userData?.role === "admin";
  const [activeScreen, setActiveScreen] = useState("Landing");

  useEffect(() => {
    if (isAdmin) {
      if (!["AdminDashboard", "Rooms", "FoodMenu", "Request"].includes(activeScreen)) {
        setActiveScreen("AdminDashboard");
      }
      return;
    }

    if (activeScreen === "AdminDashboard") {
      setActiveScreen("Landing");
    }
  }, [isAdmin, activeScreen]);

  const renderContent = () => {
    if (isAdmin) {
      switch (activeScreen) {
        case "Rooms":
          return <AdminRoomScreen />;

        case "FoodMenu":
          return <AdminFoodOrderScreen />;

        case "Request":
          return <AdminRequestScreen />;

        case "AdminDashboard":
        default:
          return <AdminDashboardScreen onNavigate={setActiveScreen} />;
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
      onOpenStatus={onOpenStatus}
      onOpenReservedRooms={onOpenReservedRooms}
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

  const [activityStatusVisible, setActivityStatusVisible] = useState(false);
  const [reservedRoomsModalVisible, setReservedRoomsModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const [loadingActivity, setLoadingActivity] = useState(false);
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
        setUserOrders([]);
        setUserRequests([]);
        setInitialRoute("Welcome");
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

  useEffect(() => {
    if (!currentUser) {
      setUserOrders([]);
      setUserRequests([]);
      setLoadingActivity(false);
      return undefined;
    }

    setLoadingActivity(true);
    let ordersReady = false;
    let requestsReady = false;

    const finishInitialLoad = () => {
      if (ordersReady && requestsReady) {
        setLoadingActivity(false);
      }
    };

    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid)
    );
    const requestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setUserOrders(data);
        ordersReady = true;
        finishInitialLoad();
      },
      (error) => {
        console.log("Order status listener error:", error);
        ordersReady = true;
        finishInitialLoad();
      }
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setUserRequests(data);
        requestsReady = true;
        finishInitialLoad();
      },
      (error) => {
        console.log("Request status listener error:", error);
        requestsReady = true;
        finishInitialLoad();
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeRequests();
    };
  }, [currentUser]);

  const openActivityStatus = () => {
    setActivityStatusVisible(true);
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

      if (!["pending", "confirmed"].includes(order.status || "pending")) {
        Alert.alert("Cannot Cancel", "This order is already being processed.");
        return false;
      }

      await updateActivityStatus({
        collectionName: "orders",
        documentId: order.id,
        status: "cancelled",
        statusMessage: "The guest cancelled this food order.",
        actorId: user.uid,
      });

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

      const requestStatus =
        request.status === "fulfilled"
          ? "completed"
          : request.status === "confirmed"
          ? "acknowledged"
          : request.status || "pending";
      if (!["pending", "acknowledged"].includes(requestStatus)) {
        Alert.alert("Cannot Cancel", "This request is already being processed.");
        return false;
      }

      await updateActivityStatus({
        collectionName: "requests",
        documentId: request.id,
        status: "cancelled",
        statusMessage: "The guest cancelled this service request.",
        actorId: user.uid,
      });

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
      onOpenStatus: openActivityStatus,
      onOpenReservedRooms: openReservedRoomsModal,
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
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main">
            {(props) => <MainShell {...props} {...screenProps} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      <ActivityStatusModal
        visible={activityStatusVisible}
        onClose={() => setActivityStatusVisible(false)}
        orders={userOrders}
        requests={userRequests}
        loading={loadingActivity}
        onCancelOrder={handleCancelOrder}
        onCancelRequest={handleCancelRequest}
        cancellingOrderId={cancellingOrderId}
        cancellingRequestId={cancellingRequestId}
      />

      <ReservedRoomsModal
        visible={reservedRoomsModalVisible}
        onClose={() => setReservedRoomsModalVisible(false)}
        reservedRooms={reservedRooms}
        onCancelRoom={handleCancelRoom}
        loadingReservedRooms={loadingReservedRooms}
        cancellingRoomId={cancellingRoomId}
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
  headerMenuButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 23,
    fontFamily: "Pacifico",
    flexShrink: 1,
    marginLeft: 8,
  },
  adminHeaderTitle: {
    fontFamily: "Roboto",
    fontSize: 20,
    fontWeight: "800",
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
  adminRoleLabel: {
    color: "#8A5B25",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 5,
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
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: "#F3E5D3",
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
