import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

import CartModal from "../pages/components/CartModal";
import ItemOptionsModal from "../pages/components/ItemOptionsModal";
import { useFonts } from "expo-font";

export default function FoodMenuScreen() {
  const [fontsLoaded] = useFonts({
      Roboto: require("../assets/font/roboto.ttf"),
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    fetchMenu();
    fetchUserCart();
  }, []);

  const fetchUserCart = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const cartRef = collection(db, "users", user.uid, "cartItems");
      const snapshot = await getDocs(cartRef);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setCart(data);
    } catch (error) {
      console.log("Error loading cart:", error);
    }
  };


  const fetchMenu = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "menuCategories"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCategories(data);
    } catch (error) {
      console.log("Error fetching menu:", error);
      Alert.alert("Error", "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  const allItems = useMemo(() => {
    let items = [];

    categories.forEach((category) => {
      const mappedItems = (category.items || []).map((item, index) => ({
        ...item,
        localId: `${category.id}-${index}-${item.name}`,
        categoryId: category.id,
        categoryTitle: category.title,
      }));
      items.push(...mappedItems);
    });

    return items;
  }, [categories]);

  const filteredItems = useMemo(() => {
    let items = selectedCategory === "all"
      ? allItems
      : allItems.filter((item) => item.categoryId === selectedCategory);

    if (search.trim()) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return items;
  }, [allItems, selectedCategory, search]);

  const getDisplayPrice = (item) => {
    if (typeof item.price === "number") return item.price;

    if (item.prices) {
      const values = Object.values(item.prices).filter(
        (v) => typeof v === "number"
      );
      if (values.length > 0) return Math.min(...values);
    }

    if (item.sizes) {
      const values = Object.values(item.sizes)
        .map((s) => s?.price)
        .filter((v) => typeof v === "number");
      if (values.length > 0) return Math.min(...values);
    }

    return 0;
  };

  const getPriceLabel = (item) => {
    if (typeof item.price === "number") return `₱${item.price}`;

    if (item.prices) {
      const entries = Object.entries(item.prices)
        .filter(([, value]) => typeof value === "number")
        .map(([key, value]) => `${key}: ₱${value}`);
      return entries.join(" • ");
    }

    if (item.sizes) {
      const entries = Object.entries(item.sizes)
        .map(([key, value]) =>
          `${key.toUpperCase()}: ₱${value.price}`
        );
      return entries.join(" • ");
    }

    return "Price unavailable";
  };

  const getItemVariants = (item) => {
    if (item.prices) {
      return Object.entries(item.prices)
        .filter(([, value]) => typeof value === "number")
        .map(([key, value]) => ({
          key,
          label: key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase()),
          price: value,
        }));
    }

    if (item.sizes) {
      return Object.entries(item.sizes)
        .filter(([, value]) => value?.price != null)
        .map(([key, value]) => ({
          key,
          label: value.label || key.toUpperCase(),
          price: value.price,
        }));
    }

    if (typeof item.price === "number") {
      return [
        {
          key: "default",
          label: "Regular",
          price: item.price,
        },
      ];
    }

    return [];
  };

  const openItemModal = (item) => {
    const variants = getItemVariants(item);

    setSelectedItem(item);
    setSelectedVariant(variants.length > 0 ? variants[0] : null);
    setSelectedQty(1);
    setItemModalVisible(true);
  };




  const addToCart = async (item, variant, quantity) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return false;
    }

    const finalVariant = variant || {
      key: "default",
      label: "Regular",
      price: getDisplayPrice(item),
    };

    const finalQty = quantity || 1;
    const cartKey = `${item.localId}-${finalVariant.key}`;

    try {
      const cartRef = collection(db, "users", user.uid, "cartItems");
      const existingQuery = query(cartRef, where("cartKey", "==", cartKey));
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingData = existingDoc.data();

        await updateDoc(existingDoc.ref, {
          quantity: existingData.quantity + finalQty,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(cartRef, {
          cartKey,
          localId: item.localId,
          name: item.name,
          categoryTitle: item.categoryTitle,
          variantKey: finalVariant.key,
          variantLabel: finalVariant.label,
          price: finalVariant.price,
          quantity: finalQty,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await fetchUserCart();
      return true;
    } catch (error) {
      console.log("Error adding to cart:", error);
      Alert.alert("Error", "Failed to add item to cart.");
      return false;
    }
  };

  const confirmAddToCart = async () => {
    if (!selectedItem || !selectedVariant || addingToCart) return;

    try {
      setAddingToCart(true);

      const added = await addToCart(selectedItem, selectedVariant, selectedQty);

      if (!added) return;

      setItemModalVisible(false);
      setSelectedItem(null);
      setSelectedVariant(null);
      setSelectedQty(1);
    } finally {
      setAddingToCart(false);
    }
  };

  const decreaseQty = async (cartItem) => {
    const user = auth.currentUser;
    if (!user) return;

    const oldQuantity = cartItem.quantity;

    if (oldQuantity <= 1) {
      // instant UI remove
      setCart((prev) => prev.filter((item) => item.id !== cartItem.id));

      try {
        await deleteDoc(doc(db, "users", user.uid, "cartItems", cartItem.id));
      } catch (error) {
        setCart((prev) => [...prev, cartItem]);
        Alert.alert("Error", "Failed to update quantity.");
      }

      return;
    }

    const newQuantity = oldQuantity - 1;

    // instant UI update
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItem.id
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    try {
      await updateDoc(
        doc(db, "users", user.uid, "cartItems", cartItem.id),
        {
          quantity: newQuantity,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === cartItem.id
            ? { ...item, quantity: oldQuantity }
            : item
        )
      );

      Alert.alert("Error", "Failed to update quantity.");
    }
  };


  const increaseQty = async (cartItem) => {
    const user = auth.currentUser;
    if (!user) return;

    const oldQuantity = cartItem.quantity;
    const newQuantity = oldQuantity + 1;

    // instant UI update
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItem.id
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    try {
      await updateDoc(
        doc(db, "users", user.uid, "cartItems", cartItem.id),
        {
          quantity: newQuantity,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      // rollback if failed
      setCart((prev) =>
        prev.map((item) =>
          item.id === cartItem.id
            ? { ...item, quantity: oldQuantity }
            : item
        )
      );

      Alert.alert("Error", "Failed to update quantity.");
    }
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const placeOrder = async () => {
    if (cart.length === 0 || placingOrder) {
      if (cart.length === 0) {
        Alert.alert("Cart is empty", "Please add food first.");
      }
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return;
    }

    try {
      setPlacingOrder(true);

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userProfile = userSnap.exists() ? userSnap.data() : {};

      const roomBookingsRef = collection(db, "roomBookings");
      const [checkedInSnap, bookedSnap] = await Promise.all([
        getDocs(
          query(
            roomBookingsRef,
            where("userId", "==", user.uid),
            where("status", "==", "checked-in")
          )
        ),
        getDocs(
          query(
            roomBookingsRef,
            where("userId", "==", user.uid),
            where("status", "==", "booked")
          )
        ),
      ]);

      const activeBookingDoc = !checkedInSnap.empty
        ? checkedInSnap.docs[0]
        : !bookedSnap.empty
        ? bookedSnap.docs[0]
        : null;
      const activeBooking = activeBookingDoc?.data() || {};

      const orderItems = cart.map((item) => ({
        localId: item.localId,
        name: item.name,
        categoryTitle: item.categoryTitle,
        variantKey: item.variantKey || "default",
        variantLabel: item.variantLabel || "",
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const cartSnapshot = await getDocs(
        collection(db, "users", user.uid, "cartItems")
      );
      const orderRef = doc(collection(db, "orders"));
      const batch = writeBatch(db);

      batch.set(orderRef, {
        userId: user.uid,
        userEmail: user.email || "",
        userFullName: userProfile.fullName || "",
        guestName: userProfile.fullName || "",
        guestPhone: userProfile.phone || "",
        bookingId: activeBookingDoc?.id || "",
        roomId: activeBooking.roomId || "",
        roomName: activeBooking.roomName || activeBooking.name || "",
        roomNumber: activeBooking.roomNumber || "",
        items: orderItems,
        total: cartTotal,
        status: "pending",
        statusMessage: "Your food order has been submitted.",
        estimatedMinutes: null,
        estimatedCompletionAt: null,
        statusHistory: [
          {
            status: "pending",
            message: "Your food order has been submitted.",
            changedAt: Timestamp.now(),
            changedBy: user.uid,
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      cartSnapshot.docs.forEach((cartDoc) => batch.delete(cartDoc.ref));
      await batch.commit();

      setCart([]);
      setCartVisible(false);

      Alert.alert(
        "Order placed",
        activeBookingDoc
          ? "Your order was sent to the hotel. Track its progress from Status in the sidebar."
          : "Your order was sent, but no room is currently assigned. Track it from Status in the sidebar."
      );
    } catch (error) {
      console.log("Error placing order:", error);
      Alert.alert("Error", "Failed to place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderCategory = ({ item }) => {
    const active = selectedCategory === item.id;
    return (
      <View>
        <TouchableOpacity
          style={[styles.categoryChip, active && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(item.id)}
        >
          <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const openImagePreview = (item) => {
    if (!item?.image) return;

    setPreviewImage(item.image);
    setPreviewTitle(item.name || "Food Image");
    setImagePreviewVisible(true);
  };

  const closeImagePreview = () => {
    setImagePreviewVisible(false);
    setPreviewImage(null);
    setPreviewTitle("");
  };

  const renderMenuItem = ({ item }) => {
    return (
      <View style={styles.card}>
        {item.image ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => openImagePreview(item)}
            style={styles.imageTapBox}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.itemImage}
              resizeMode="cover"
            />

            <View style={styles.zoomBadge}>
              <Ionicons name="expand-outline" size={16} color="#fff" />
              <Text style={styles.zoomBadgeText}>Tap to view</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.categoryTitle}</Text>
          </View>
          <Text style={styles.priceText}>{`Starts at ₱${getDisplayPrice(item)}`}</Text>
        </View>

        {!!item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {!!item.choices && Array.isArray(item.choices) && (
          <View style={styles.choicesBox}>
            <Text style={styles.choicesTitle}>Includes:</Text>
            {item.choices.map((choice, index) => (
              <Text key={index} style={styles.choiceText}>
                • {choice}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.priceDetails}>{getPriceLabel(item)}</Text>

        <TouchableOpacity style={styles.addButton} onPress={() => openItemModal(item)}>
          <Ionicons name="cart-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add to Order</Text>
        </TouchableOpacity>
      </View>
    );
  };

   if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b3200" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Menu</Text>
        <Text style={styles.headerSubtitle}>Browse and order your favorite meals</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#777" />
        <TextInput
          placeholder="Search food..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={[{ id: "all", title: "All" }, ...categories]}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#6b4f3a" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.localId}
          renderItem={renderMenuItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuList}
          style={styles.menu}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No menu items found.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.floatingCart}
        onPress={() => setCartVisible(true)}
      >
        <Ionicons name="bag-handle" size={22} color="#fff" />
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartCount}</Text>
        </View>
      </TouchableOpacity>

      
      <ItemOptionsModal
        visible={itemModalVisible}
        onClose={() => setItemModalVisible(false)}
        selectedItem={selectedItem}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        selectedQty={selectedQty}
        setSelectedQty={setSelectedQty}
        getItemVariants={getItemVariants}
        addingToCart={addingToCart}
        onConfirmAddToCart={confirmAddToCart}
      />

      <CartModal
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        cart={cart}
        cartTotal={cartTotal}
        onDecreaseQty={decreaseQty}
        onIncreaseQty={increaseQty}
        onPlaceOrder={placeOrder}
        placingOrder={placingOrder}
        styles={styles}
      />

      <Modal
        visible={imagePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={closeImagePreview}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.imagePreviewTitle}>{previewTitle}</Text>

          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.imagePreviewImage}
              resizeMode="contain"
            />
          ) : null}

          <Text style={styles.imagePreviewHint}>Full food image preview</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CREAM,
    paddingTop: -15,
  },
  menu: {
    marginBottom: -50,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    paddingBottom: 8,
    color: "#3d2b1f",
    fontFamily: "Roboto",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7a6a5f",
    marginTop: 4,
  },
  itemImage: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    backgroundColor: "#eee3db",
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5ddd6",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    backgroundColor: "#ece7e2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 20,
    height: 40,
  },
  categoryChipActive: {
    backgroundColor: "#6b4f3a",
  },
  categoryText: {
    color: "#5f5248",
    fontWeight: "600",
    fontSize: 13,
  },
  categoryTextActive: {
    color: "#fff",
  },
  menuList: {
    padding: 16,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eee3db",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2f241d",
  },
  itemCategory: {
    marginTop: 4,
    fontSize: 12,
    color: "#8b7e74",
  },
  description: {
    marginTop: 10,
    color: "#5f5a55",
    fontSize: 14,
    lineHeight: 20,
  },
  choicesBox: {
    marginTop: 10,
    backgroundColor: "#faf7f4",
    padding: 10,
    borderRadius: 12,
  },
  choicesTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#4b3a2f",
  },
  choiceText: {
    color: "#5f5a55",
    fontSize: 13,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b5e34",
  },
  priceDetails: {
    marginTop: 10,
    fontSize: 12,
    color: "#8b7e74",
  },
  addButton: {
    marginTop: 14,
    backgroundColor: "#6b4f3a",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  floatingCart: {
    position: "absolute",
    right: 20,
    top: 10,
    backgroundColor: "#6b4f3a",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  cartBadge: {
    position: "absolute",
    top: 6,
    right: 4,
    backgroundColor: "#d9534f",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
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
  emptyBox: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#888",
    fontSize: 15,
  },


  imageTapBox: {
    position: "relative",
    marginBottom: 12,
  },
  zoomBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  zoomBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  imagePreviewClose: {
    position: "absolute",
    top: 45,
    right: 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imagePreviewTitle: {
    position: "absolute",
    top: 95,
    left: 20,
    right: 20,
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  imagePreviewImage: {
    width: "100%",
    height: "72%",
    borderRadius: 18,
  },
  imagePreviewHint: {
    color: "#ddd",
    fontSize: 13,
    marginTop: 10,
  },
});