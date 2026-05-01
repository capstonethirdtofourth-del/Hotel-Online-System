import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function AdminRequestScreen() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [fulfilledRequests, setFulfilledRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingRequestId, setFulfillingRequestId] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const requestsRef = collection(db, "requests");

      const pendingQuery = query(
        requestsRef,
        where("status", "==", "pending")
      );

      const fulfilledQuery = query(
        requestsRef,
        where("status", "==", "fulfilled")
      );

      const [pendingSnap, fulfilledSnap] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(fulfilledQuery),
      ]);

      const mapData = (snap) =>
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

      setPendingRequests(mapData(pendingSnap));
      setFulfilledRequests(mapData(fulfilledSnap));
    } catch (error) {
      console.log("Error fetching requests:", error);
      Alert.alert("Error", "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "No date";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const handleFulfill = (request) => {
    if (fulfillingRequestId) return;

    Alert.alert("Mark as Fulfilled", "Complete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
            setFulfillingRequestId(request.id);

            await updateDoc(doc(db, "requests", request.id), {
              status: "fulfilled",
              fulfilledAt: serverTimestamp(),
            });

            await fetchRequests();
            Alert.alert("Success", "Request fulfilled.");
          } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to update request.");
          } finally {
            setFulfillingRequestId(null);
          }
        },
      },
    ]);
  };

  const renderRow = (item, isFulfilled = false) => {
    const isProcessing = fulfillingRequestId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => setSelectedRequest(item)}
        activeOpacity={0.9}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.requestText}</Text>

          <Text style={styles.meta}>
            Types: {item.requestTypeLabels?.join(", ")}
          </Text>

          <Text style={styles.meta}>Guest Name: {item.userFullName}</Text>
          <Text style={styles.meta}>Email: {item.userEmail}</Text>
          <Text style={styles.meta}>Room: {item.roomName}</Text>

          <Text style={styles.meta}>
            Created: {formatDate(item.createdAt)}
          </Text>

          {!isFulfilled && (
            <TouchableOpacity
              style={[
                styles.button,
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={() => handleFulfill(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonTextLoading}>Fulfilling...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Fulfilled</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6b3200" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Pending Requests</Text>

        {pendingRequests.length === 0 ? (
          <Text style={styles.empty}>No pending requests</Text>
        ) : (
          pendingRequests.map((item) => renderRow(item))
        )}

        <Text style={styles.section}>Fulfilled Requests</Text>

        {fulfilledRequests.length === 0 ? (
          <Text style={styles.empty}>No fulfilled requests</Text>
        ) : (
          fulfilledRequests.map((item) => renderRow(item, true))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView>
                <Text style={styles.detail}>
                  Message: {selectedRequest.requestText}
                </Text>

                <Text style={styles.detail}>
                  Types: {selectedRequest.requestTypeLabels?.join(", ")}
                </Text>

                <Text style={styles.detail}>
                  Guest Name: {selectedRequest.userFullName}
                </Text>
                <Text style={styles.detail}>
                  Email: {selectedRequest.userEmail}
                </Text>
                <Text style={styles.detail}>
                  Room Name: {selectedRequest.roomName }
                </Text>

                <Text style={styles.detail}>
                  Created: {formatDate(selectedRequest.createdAt)}
                </Text>

                <Text style={styles.detail}>
                  Status: {selectedRequest.status}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
const CREAM = "#FFF8E7";
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  content: { padding: 16 },

  section: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 16,
    color: "#6b3200",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },

  title: {
    fontWeight: "700",
    fontSize: 15,
    color: "#2f241d",
  },

  meta: {
    fontSize: 12,
    marginTop: 4,
    color: "#6b5a4a",
  },

  button: {
    backgroundColor: "#6b3200",
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },

  buttonTextLoading: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
  },

  empty: {
    color: "#777",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  detail: {
    fontSize: 14,
    marginBottom: 8,
  },
});