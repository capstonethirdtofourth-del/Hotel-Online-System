import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";
import StatusTimeline from "../components/StatusTimeline";
import {
  REQUEST_STATUS_FLOW,
  REQUEST_STATUS_LABELS,
  getDefaultStatusMessage,
  updateActivityStatus,
} from "../../services/activityStatusService";
import { createRequestStatusNotification } from "../../services/notificationService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "finished", label: "Finished" },
];

const ESTIMATE_OPTIONS = [5, 10, 15, 20, 30, 45];
const STATUS_OPTIONS = [
  ...REQUEST_STATUS_FLOW,
  "unable_to_complete",
  "cancelled",
];

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
}

function formatDateTime(value) {
  const date = timestampToDate(value);
  if (!date) return "No date";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeValue(item) {
  return item.createdAt?.seconds || item.updatedAt?.seconds || 0;
}

function normalizeStatus(status) {
  if (status === "fulfilled") return "completed";
  if (status === "confirmed") return "acknowledged";
  return status || "pending";
}

function matchesFilter(request, filter) {
  const status = normalizeStatus(request.status);

  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "active") return ["acknowledged", "ongoing"].includes(status);
  if (filter === "finished") {
    return ["completed", "unable_to_complete", "cancelled"].includes(status);
  }

  return true;
}

export default function AdminRequestScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "requests"),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        data.sort((a, b) => getTimeValue(b) - getTimeValue(a));
        setRequests(data);
        setSelectedRequest((current) =>
          current
            ? data.find((request) => request.id === current.id) || null
            : null
        );
        setLoading(false);
      },
      (error) => {
        console.log("Admin request listener error:", error);
        setLoading(false);
        Alert.alert("Error", "Failed to load service requests.");
      }
    );

    return unsubscribe;
  }, []);

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesFilter(request, activeFilter)),
    [requests, activeFilter]
  );

  const openRequest = (request) => {
    const status = normalizeStatus(request.status);
    setSelectedRequest(request);
    setSelectedStatus(status);
    setEstimatedMinutes(
      Number(request.estimatedMinutes) > 0
        ? String(request.estimatedMinutes)
        : ""
    );
    setStatusMessage(
      request.statusMessage || getDefaultStatusMessage("requests", status)
    );
  };

  const closeRequest = () => {
    if (saving) return;
    setSelectedRequest(null);
    setEstimatedMinutes("");
    setStatusMessage("");
  };

  const chooseStatus = (status) => {
    setSelectedStatus(status);
    setStatusMessage(getDefaultStatusMessage("requests", status));

    if (["completed", "unable_to_complete", "cancelled"].includes(status)) {
      setEstimatedMinutes("");
    }
  };

  const respondToCancellation = async (approve) => {
    if (
      !selectedRequest ||
      selectedRequest.cancellationRequestStatus !== "pending" ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      if (approve) {
        await updateActivityStatus({
          collectionName: "requests",
          documentId: selectedRequest.id,
          status: "cancelled",
          statusMessage:
            "The admin approved your cancellation request. The service request was cancelled.",
          actorId: auth.currentUser?.uid || "admin",
        });

        await updateDoc(doc(db, "requests", selectedRequest.id), {
          cancellationRequested: false,
          cancellationRequestStatus: "approved",
          cancellationDecisionAt: serverTimestamp(),
          cancellationDecisionBy: auth.currentUser?.uid || "admin",
          cancellationDecisionMessage: "Cancellation approved by admin.",
          updatedAt: serverTimestamp(),
        });

        await createRequestStatusNotification({
          request: selectedRequest,
          status: "cancelled",
          type: "request_cancellation_approved",
          title: "Request cancellation approved",
          message:
            "The admin approved your cancellation request. The service request was cancelled.",
        });

        Alert.alert(
          "Cancellation Approved",
          "The guest request has been cancelled."
        );
      } else {
        await updateDoc(doc(db, "requests", selectedRequest.id), {
          cancellationRequested: false,
          cancellationRequestStatus: "rejected",
          cancellationDecisionAt: serverTimestamp(),
          cancellationDecisionBy: auth.currentUser?.uid || "admin",
          cancellationDecisionMessage: "Cancellation declined by admin.",
          statusMessage:
            "The admin declined your cancellation request. Staff will continue handling the request.",
          updatedAt: serverTimestamp(),
        });

        await createRequestStatusNotification({
          request: selectedRequest,
          status: "ongoing",
          type: "request_cancellation_declined",
          title: "Request cancellation declined",
          message:
            "The admin declined your cancellation request. Staff will continue handling the request.",
        });

        Alert.alert(
          "Cancellation Declined",
          "The request remains in Ongoing status."
        );
      }

      setSelectedRequest(null);
    } catch (error) {
      console.log("Request cancellation decision error:", error);
      Alert.alert("Error", "Failed to process the cancellation request.");
    } finally {
      setSaving(false);
    }
  };

  const saveUpdate = async () => {
    if (!selectedRequest || saving) return;

    if (selectedRequest.cancellationRequestStatus === "pending") {
      Alert.alert(
        "Resolve Cancellation First",
        "Approve or decline the guest's cancellation request before changing the service status."
      );
      return;
    }

    const numericEstimate = estimatedMinutes.trim()
      ? Number(estimatedMinutes)
      : null;

    if (
      estimatedMinutes.trim() &&
      (!Number.isFinite(numericEstimate) || numericEstimate <= 0)
    ) {
      Alert.alert("Invalid Estimate", "Enter a valid number of minutes.");
      return;
    }

    try {
      setSaving(true);

      await updateActivityStatus({
        collectionName: "requests",
        documentId: selectedRequest.id,
        status: selectedStatus,
        estimatedMinutes: numericEstimate,
        statusMessage,
        actorId: auth.currentUser?.uid || "admin",
      });

      await createRequestStatusNotification({
        request: selectedRequest,
        status: selectedStatus,
        message:
          statusMessage?.trim() ||
          `Your request is now ${
            REQUEST_STATUS_LABELS[selectedStatus] || selectedStatus
          }.`,
      });

      Alert.alert(
        "Request Updated",
        "The guest can now see the new request status."
      );
      setSelectedRequest(null);
      setEstimatedMinutes("");
      setStatusMessage("");
    } catch (error) {
      console.log("Request status update error:", error);
      Alert.alert("Error", "Failed to update the request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#6b3200" />
        <Text style={styles.loadingText}>Loading service requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guest Request Management</Text>
        <Text style={styles.headerSubtitle}>
          Acknowledge, estimate, process, and complete requests
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          const count = requests.filter((request) =>
            matchesFilter(request, filter.key)
          ).length;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {filter.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="clipboard-outline" size={42} color="#9a8a7d" />
            <Text style={styles.emptyTitle}>No requests in this section</Text>
          </View>
        ) : (
          filteredRequests.map((request) => {
            const status = normalizeStatus(request.status);

            return (
              <TouchableOpacity
                key={request.id}
                style={styles.card}
                onPress={() => openRequest(request)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBox}>
                    <Text style={styles.cardTitle}>
                      {request.requestTypeLabels?.join(", ") || "Service Request"}
                    </Text>
                    <Text style={styles.requestText}>
                      {request.requestText || "No details"}
                    </Text>
                    <Text style={styles.metaText}>
                      Guest: {request.userFullName || request.userEmail || "Unknown"}
                    </Text>
                    <Text style={styles.metaText}>
                      Room: {request.roomName || "Not assigned"}
                    </Text>
                    <Text style={styles.metaText}>
                      Submitted: {formatDateTime(request.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {REQUEST_STATUS_LABELS[status] || status}
                    </Text>
                  </View>
                </View>

                {request.cancellationRequestStatus === "pending" ? (
                  <View style={styles.cancellationCardNotice}>
                    <Ionicons name="warning-outline" size={16} color="#9A5B00" />
                    <Text style={styles.cancellationCardNoticeText}>
                      Guest requested cancellation
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {request.statusMessage || "Request submitted."}
                  </Text>
                  <Text style={styles.openText}>Manage ›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={closeRequest}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Update Guest Request</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRequest?.requestTypeLabels?.join(", ") || "Service Request"}
                </Text>
              </View>
              <TouchableOpacity onPress={closeRequest} disabled={saving}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRequest ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Guest: {selectedRequest.userFullName || selectedRequest.userEmail || "Unknown"}
                  </Text>
                  <Text style={styles.infoText}>
                    Room: {selectedRequest.roomName || "Not assigned"}
                  </Text>
                  <Text style={styles.infoRequestText}>
                    {selectedRequest.requestText || "No details"}
                  </Text>
                </View>

                {selectedRequest.cancellationRequestStatus === "pending" ? (
                  <View style={styles.cancellationDecisionBox}>
                    <View style={styles.cancellationDecisionHeader}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={21}
                        color="#8A5B25"
                      />
                      <View style={styles.cancellationDecisionHeading}>
                        <Text style={styles.cancellationDecisionTitle}>
                          Cancellation Requested
                        </Text>
                        <Text style={styles.cancellationDecisionText}>
                          The guest wants to cancel this ongoing service request.
                          Resolve it before updating the request status.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cancellationDecisionActions}>
                      <TouchableOpacity
                        style={styles.declineCancellationButton}
                        onPress={() => respondToCancellation(false)}
                        disabled={saving}
                      >
                        <Text style={styles.declineCancellationText}>
                          Decline
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveCancellationButton}
                        onPress={() => respondToCancellation(true)}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.approveCancellationText}>
                            Approve Cancellation
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <StatusTimeline
                  type="requests"
                  status={normalizeStatus(selectedRequest.status)}
                />

                <Text style={styles.sectionTitle}>New Status</Text>
                <View style={styles.chipWrap}>
                  {STATUS_OPTIONS.map((status) => {
                    const active = selectedStatus === status;

                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusChip,
                          active && styles.statusChipActive,
                        ]}
                        onPress={() => chooseStatus(status)}
                        disabled={
                          saving ||
                          selectedRequest.cancellationRequestStatus === "pending"
                        }
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            active && styles.statusChipTextActive,
                          ]}
                        >
                          {REQUEST_STATUS_LABELS[status] || status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sectionTitle}>Estimated Time</Text>
                <View style={styles.chipWrap}>
                  {ESTIMATE_OPTIONS.map((minutes) => {
                    const active = estimatedMinutes === String(minutes);

                    return (
                      <TouchableOpacity
                        key={minutes}
                        style={[
                          styles.estimateChip,
                          active && styles.estimateChipActive,
                        ]}
                        onPress={() => setEstimatedMinutes(String(minutes))}
                        disabled={
                          saving ||
                          selectedRequest.cancellationRequestStatus === "pending"
                        }
                      >
                        <Text
                          style={[
                            styles.estimateChipText,
                            active && styles.estimateChipTextActive,
                          ]}
                        >
                          {minutes} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.input}
                  value={estimatedMinutes}
                  onChangeText={(value) =>
                    setEstimatedMinutes(value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Custom minutes (optional)"
                  keyboardType="number-pad"
                  editable={
                    !saving &&
                    selectedRequest.cancellationRequestStatus !== "pending"
                  }
                />

                <Text style={styles.sectionTitle}>Message to Guest</Text>
                <TextInput
                  style={styles.textArea}
                  value={statusMessage}
                  onChangeText={setStatusMessage}
                  placeholder="Example: Housekeeping is on the way."
                  multiline
                  textAlignVertical="top"
                  editable={
                    !saving &&
                    selectedRequest.cancellationRequestStatus !== "pending"
                  }
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (saving ||
                      selectedRequest.cancellationRequestStatus === "pending") &&
                      styles.disabledButton,
                  ]}
                  onPress={saveUpdate}
                  disabled={
                    saving ||
                    selectedRequest.cancellationRequestStatus === "pending"
                  }
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      Save Status Update
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#3d2b1f",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#7a6a5f",
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 55,
    marginVertical: 10,
  },
  filterChip: {
    backgroundColor: "#ece7e2",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#6b4f3a",
  },
  filterText: {
    color: "#5f5248",
    fontWeight: "700",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee3db",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardTitleBox: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2f241d",
  },
  requestText: {
    fontSize: 13,
    color: "#51473f",
    lineHeight: 18,
    marginTop: 5,
  },
  metaText: {
    fontSize: 11,
    color: "#7d6d61",
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#f2e5d8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 115,
  },
  statusBadgeText: {
    color: "#6b3200",
    fontWeight: "800",
    fontSize: 10,
    textAlign: "center",
  },
  cancellationCardNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0CE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  cancellationCardNoticeText: {
    color: "#81510F",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 11,
  },
  messagePreview: {
    flex: 1,
    fontSize: 12,
    color: "#66584d",
    marginRight: 12,
  },
  openText: {
    fontSize: 12,
    color: "#6b3200",
    fontWeight: "700",
  },
  loaderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CREAM,
  },
  loadingText: {
    color: "#7a6a5f",
    marginTop: 10,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 70,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#66584d",
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  modalCard: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f241d",
  },
  modalSubtitle: {
    marginTop: 3,
    color: "#7d6d61",
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
  },
  infoText: {
    color: "#51473f",
    fontSize: 13,
    marginBottom: 4,
  },
  infoRequestText: {
    color: "#3e342d",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  cancellationDecisionBox: {
    backgroundColor: "#FFF6DF",
    borderWidth: 1,
    borderColor: "#E5C37C",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  cancellationDecisionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cancellationDecisionHeading: {
    flex: 1,
    marginLeft: 8,
  },
  cancellationDecisionTitle: {
    color: "#6B3F0C",
    fontSize: 14,
    fontWeight: "900",
  },
  cancellationDecisionText: {
    color: "#725B3D",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  cancellationDecisionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  declineCancellationButton: {
    borderWidth: 1,
    borderColor: "#B84040",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  declineCancellationText: {
    color: "#B84040",
    fontSize: 12,
    fontWeight: "800",
  },
  approveCancellationButton: {
    minWidth: 145,
    backgroundColor: "#B84040",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  approveCancellationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3d2b1f",
    marginTop: 18,
    marginBottom: 9,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  statusChipActive: {
    backgroundColor: "#6b4f3a",
    borderColor: "#6b4f3a",
  },
  statusChipText: {
    color: "#5d5046",
    fontSize: 12,
    fontWeight: "700",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  estimateChip: {
    borderWidth: 1,
    borderColor: "#e0c7ad",
    backgroundColor: "#fffaf2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
  },
  estimateChipActive: {
    backgroundColor: "#8b5e34",
    borderColor: "#8b5e34",
  },
  estimateChipText: {
    color: "#6b4f3a",
    fontSize: 12,
    fontWeight: "700",
  },
  estimateChipTextActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 13,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8ccc2",
    borderRadius: 12,
    minHeight: 100,
    padding: 13,
  },
  saveButton: {
    backgroundColor: "#6b4f3a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    marginBottom: 15,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
