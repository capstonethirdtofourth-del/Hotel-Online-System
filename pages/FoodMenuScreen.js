import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

import CartModal from "../pages/components/CartModal";
import OrdersModal from "../pages/components/OrdersModal";
import ItemOptionsModal from "../pages/components/ItemOptionsModal";

export default function FoodMenuScreen() {
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
  const [ordersVisible, setOrdersVisible] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

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

  const openOrdersModal = async () => {
    setOrdersVisible(true);
    await fetchUserOrders();
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

  const cancelOrder = async (order) => {
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

      // remove from UI immediately
      setUserOrders((prev) =>
        prev.filter((item) => item.id !== order.id)
      );

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

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email || "",
        items: orderItems,
        total: cartTotal,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const cartSnapshot = await getDocs(collection(db, "users", user.uid, "cartItems"));
      await Promise.all(cartSnapshot.docs.map((cartDoc) => deleteDoc(cartDoc.ref)));

      setCart([]);
      setCartVisible(false);

      Alert.alert("Order placed", "Your order has been added successfully.");
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

  const renderMenuItem = ({ item }) => {
    return (
      <View style={styles.card}>
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

      <TouchableOpacity
        style={styles.floatingOrders}
        onPress={openOrdersModal}
      >
        <Ionicons name="receipt-outline" size={22} color="#fff" />
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

      <OrdersModal
        visible={ordersVisible}
        onClose={() => setOrdersVisible(false)}
        loadingOrders={loadingOrders}
        userOrders={userOrders}
        onCancelOrder={cancelOrder}
        cancellingOrderId={cancellingOrderId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8f6f3",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#3d2b1f",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7a6a5f",
    marginTop: 4,
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
    paddingBottom: 8,
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
    paddingBottom: 120,
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
  floatingOrders: {
    position: "absolute",
    right: 90,
    top: 10,
    backgroundColor: "#8b5e34",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});