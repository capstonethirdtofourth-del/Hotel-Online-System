import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
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
  addDoc,
} from "firebase/firestore";
import { auth, db } from "./FirebaseConfig";
import { useFonts } from "expo-font";

import HotelHomeScreen from "./pages/HotelHomeScreen";
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

const LANDING_MAIN_IMAGE = require("./assets/images/landing.png");
const LANDING_PROMO_IMAGE = require("./assets/images/landing-promo.png");
function LandingPageScreen({ onGoRooms, onGoFoodMenu }) {
  const { width } = useWindowDimensions();

  const mainImageSize = Image.resolveAssetSource(LANDING_MAIN_IMAGE);
  const promoImageSize = Image.resolveAssetSource(LANDING_PROMO_IMAGE);

  const mainImageHeight = width * (mainImageSize.height / mainImageSize.width);
  const promoImageHeight = width * (promoImageSize.height / promoImageSize.width);

  return (
    <ScrollView
      style={styles.landingScroll}
      contentContainerStyle={styles.landingContent}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={LANDING_MAIN_IMAGE}
        style={[
          styles.fullLandingImage,
          {
            width: width,
            height: mainImageHeight,
          },
        ]}
        resizeMode="contain"
      />

      <View style={styles.landingWelcomeCard}>
        <Text style={styles.landingSmallText}>Welcome to</Text>
        <Text style={styles.landingTitle}>H&K Home Kafe</Text>

        <Text style={styles.landingDescription}>
          Comfortable stay, cozy rooms, and relaxing ambiance.
        </Text>

        <View style={styles.landingLocationBox}>
          <Ionicons name="location" size={20} color="#6b3200" />
          <Text style={styles.landingLocationText}>
            Diversion Road, San Leonardo, beside San Leonardo Municipal Hall
          </Text>
        </View>

        <View style={styles.landingButtonRow}>
          <TouchableOpacity style={styles.landingPrimaryButton} onPress={onGoRooms}>
            <Ionicons name="bed-outline" size={20} color="#fff" />
            <Text style={styles.landingPrimaryButtonText}>View Rooms</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.landingSecondaryButton} onPress={onGoFoodMenu}>
            <Ionicons name="restaurant-outline" size={20} color="#6b3200" />
            <Text style={styles.landingSecondaryButtonText}>Food Menu</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Image
        source={LANDING_PROMO_IMAGE}
        style={[
          styles.fullPromoImage,
          {
            width: width,
            height: promoImageHeight,
          },
        ]}
        resizeMode="contain"
      />

      <View style={styles.landingFooter}>
        <View style={styles.footerHomeIcon}>
          <Ionicons name="home-outline" size={24} color="#d6a447" />
        </View>

        <Text style={styles.footerTitle}>Your home away from home.</Text>
        <Text style={styles.footerText}>
          Perfect for business, family, or leisure stays.
        </Text>
      </View>
    </ScrollView>
  );
}

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
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onChangeScreen("Landing");
                }}
              >
                <Ionicons name="home-outline" size={22} color="#4b3a2f" />
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onChangeScreen("Rooms");
                }}
              >
                <MaterialCommunityIcons name="bed-king-outline" size={22} color="#4b3a2f" />
                <Text style={styles.menuText}>Rooms</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenOrders();
                }}
              >
                <Ionicons name="receipt-outline" size={22} color="#030303" />
                <Text style={styles.menuText}>Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenReservedRooms();
                }}
              >
                <MaterialCommunityIcons name="bed-outline" size={22} color="#4b3a2f" />
                <Text style={styles.menuText}>Reserved Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onOpenRequests();
                }}
              >
                <Feather name="file-text" size={20} color="#4b3a2f" />
                <Text style={styles.menuText}>Requests</Text>
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
  const [activeScreen, setActiveScreen] = useState("Landing");

  const isAdmin = userData?.role === "admin";

  const renderContent = () => {
    if (isAdmin) {
      switch (activeScreen) {
        case "Request":
          return <AdminRequestScreen />;
        case "Landing":
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

  const handleBookRoom = async (room) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return false;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert("Error", "User profile not found.");
        return false;
      }

      const userProfile = userSnap.data();

      const bookingsRef = collection(db, "roomBookings");

      const existingBookedQuery = query(
        bookingsRef,
        where("roomId", "==", room.id),
        where("status", "==", "booked")
      );

      const existingCheckedInQuery = query(
        bookingsRef,
        where("roomId", "==", room.id),
        where("status", "==", "checked-in")
      );

      const [existingBookedSnapshot, existingCheckedInSnapshot] =
        await Promise.all([
          getDocs(existingBookedQuery),
          getDocs(existingCheckedInQuery),
        ]);

      if (!existingBookedSnapshot.empty || !existingCheckedInSnapshot.empty) {
        Alert.alert("Unavailable", "This room is already booked or occupied.");
        return false;
      }

      await addDoc(bookingsRef, {
        userId: user.uid,
        userEmail: user.email || "",
        userFullName: userProfile.fullName || "",
        userPhone: userProfile.phone || "",
        roomId: room.id,
        name: room.name,
        price: room.price,
        image: room.image || "",
        imageKey: room.imageKey || "",
        amenities: room.amenities || [],
        roomNumber: room.roomNumber || "",
        guestName: userProfile.fullName || "",
        guestPhone: userProfile.phone || "",
        checkInAt: null,
        checkOutAt: null,
        status: "booked",
        reservedAt: serverTimestamp(),
      });

      await fetchReservedRooms();

      setRoomStatusRefreshKey((prev) => prev + 1);

      Alert.alert("Room Booked", `${room.name} has been reserved.`);
      return true;
    } catch (error) {
      console.log("Error booking room:", error);
      Alert.alert("Error", "Failed to reserve room.");
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

            await updateDoc(doc(db, "roomBookings", bookingId), {
              status: "cancelled",
              cancelledAt: serverTimestamp(),
              cancelledBy: user.uid,
              updatedAt: serverTimestamp(),
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

  landingScroll: {
    flex: 1,
    backgroundColor: BG,
  },
  landingContent: {
    padding: 14,
    paddingBottom: 24,
  },
  landingHeroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d6a447",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  landingMainImage: {
    width: "100%",
    height: 650,
    backgroundColor: "#fff8e7",
  },
  landingWelcomeCard: {
    marginTop: 16,
    backgroundColor: "#fffaf0",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2c17c",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  landingSmallText: {
    textAlign: "center",
    color: "#9d6a1f",
    fontSize: 15,
    fontStyle: "italic",
  },
  landingTitle: {
    textAlign: "center",
    color: "#2b1d13",
    fontSize: 33,
    fontWeight: "900",
    marginTop: 2,
  },
  landingDescription: {
    textAlign: "center",
    color: "#4b3a2f",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  landingLocationBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1d28a",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  landingLocationText: {
    flex: 1,
    marginLeft: 8,
    color: "#3b291b",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  landingButtonRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  landingPrimaryButton: {
    flex: 1,
    backgroundColor: SECONDARY,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d6a447",
  },
  landingPrimaryButtonText: {
    marginLeft: 7,
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  landingSecondaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d6a447",
  },
  landingSecondaryButtonText: {
    marginLeft: 7,
    color: SECONDARY,
    fontSize: 14,
    fontWeight: "800",
  },
  landingPromoCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d6a447",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  landingPromoImage: {
    width: "100%",
    height: 580,
    backgroundColor: "#fff8e7",
  },
  landingFooter: {
    marginTop: 16,
    backgroundColor: "#2a170d",
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d6a447",
  },
  footerHomeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#d6a447",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  footerTitle: {
    color: "#d6a447",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  footerText: {
    color: "#fff8e7",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
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
 landingScroll: {
  flex: 1,
  backgroundColor: BG,
},

landingContent: {
  paddingTop: 0,
  paddingBottom: 0,
  alignItems: "center",
},

fullLandingImage: {
  marginTop: 0,
  marginHorizontal: 0,
  backgroundColor: BG,
},

fullPromoImage: {
  marginTop: 0,
  marginHorizontal: 0,
  backgroundColor: BG,
},
landingWelcomeCard: {
  marginHorizontal: 16,
  marginVertical: 14,
  backgroundColor: "#fffaf0",
  borderRadius: 22,
  padding: 18,
  borderWidth: 1,
  borderColor: "#e2c17c",
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
},

landingFooter: {
  marginHorizontal: 16,
  marginTop: 16,
  marginBottom: 20,
  backgroundColor: "#2a170d",
  borderRadius: 22,
  paddingVertical: 22,
  paddingHorizontal: 16,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#d6a447",
},
});