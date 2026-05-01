import { useState } from "react";
import {
  ScrollView,
  Text,
  FlatList,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { auth, db } from "../FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const requestCategories = [
  { label: "Bathroom", value: "bathroom" },
  { label: "Food", value: "food" },
  { label: "Bed", value: "bed" },
  { label: "Communication & Connectivity", value: "communication_connectivity" },
  { label: "Lights & Power", value: "lights_power" },
  { label: "Room", value: "room" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Aircon", value: "aircon" },
];

export default function RequestScreen() {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [requestText, setRequestText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (category) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((item) => item.value === category.value);

      if (exists) {
        return prev.filter((item) => item.value !== category.value);
      }

      return [...prev, category];
    });
  };

  const removeCategory = (categoryValue) => {
    setSelectedCategories((prev) =>
      prev.filter((item) => item.value !== categoryValue)
    );
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert(
        "Select Category",
        "Please choose at least one request category first."
      );
      return;
    }

    if (!requestText.trim()) {
      Alert.alert("Empty Request", "Please enter your request first.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return;
    }

    try {
      setSubmitting(true);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userFullName = "";
      let userPhone = "";

      if (userSnap.exists()) {
        const userData = userSnap.data();
        userFullName = userData.fullName || "";
        userPhone = userData.phone || "";
      }

      const roomBookingsRef = collection(db, "roomBookings");

      const bookedQuery = query(
        roomBookingsRef,
        where("userId", "==", user.uid),
        where("status", "==", "booked")
      );

      const checkedInQuery = query(
        roomBookingsRef,
        where("userId", "==", user.uid),
        where("status", "==", "checked-in")
      );

      const [bookedSnap, checkedInSnap] = await Promise.all([
        getDocs(bookedQuery),
        getDocs(checkedInQuery),
      ]);

      let roomId = "";
      let roomName = "";

      const activeRoomDoc =
        !checkedInSnap.empty
          ? checkedInSnap.docs[0]
          : !bookedSnap.empty
          ? bookedSnap.docs[0]
          : null;

      if (!activeRoomDoc) {
        Alert.alert(
          "No Room Assigned",
          "You must book or occupy a room to make a request."
        );
        setSubmitting(false);
        return;
      }

      const roomData = activeRoomDoc.data();
      roomId = roomData.roomId || "";
      roomName = roomData.name || "";

      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        userEmail: user.email || "",
        userFullName,
        userPhone,
        roomId,
        roomName,
        requestTypeValues: selectedCategories.map((item) => item.value),
        requestTypeLabels: selectedCategories.map((item) => item.label),
        requestText: requestText.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Request Sent", "Your request has been submitted to the hotel.");

      setSelectedCategories([]);
      setRequestText("");
    } catch (error) {
      console.error("Error saving request:", error);
      Alert.alert("Error", "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Guest Request</Text>

        </View>
        <Text style={styles.sectionLabel}>Select Request Type</Text>
        <FlatList
          data={requestCategories}
          keyExtractor={(item) => item.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipListContainer}
          renderItem={({ item }) => {
            const isSelected = selectedCategories.some(
              (category) => category.value === item.value
            );

            return (
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.selectedChip]}
                onPress={() => toggleCategory(item)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.selectedChipText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={styles.sectionLabel}>Request Details</Text>

        <View style={styles.inputWrapper}>
          {selectedCategories.length > 0 && (
            <View style={styles.selectedTagsWrapper}>
              {selectedCategories.map((category) => (
                <View key={category.value} style={styles.selectedTagInside}>
                  <Text style={styles.selectedTagText}>{category.label}</Text>
                  <TouchableOpacity onPress={() => removeCategory(category.value)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput
            style={styles.textAreaInside}
            placeholder="Type your request here..."
            placeholderTextColor="#777"
            multiline
            numberOfLines={6}
            value={requestText}
            onChangeText={setRequestText}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a2500",
    marginBottom: 10,
  },
  header: {

  },
  headerTitle: {
    fontSize: 28,
    paddingBottom: 4,
    color: "#3d2b1f",
    fontFamily: "Roboto",
  },
  chipListContainer: {
    paddingBottom: 10,
    paddingRight: 10,
    marginBottom: 15,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c9a27a",
    marginRight: 10,
  },
  selectedChip: {
    backgroundColor: "#6b3300",
    borderColor: "#6b3300",
  },
  chipText: {
    color: "#6b3300",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedChipText: {
    color: "#fff",
  },
  inputWrapper: {
    backgroundColor: "#fff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#d6c2a8",
    padding: 12,
    marginBottom: 20,
  },
  selectedTagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  selectedTagInside: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6b3300",
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
  },
  textAreaInside: {
    minHeight: 140,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6b3200",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});