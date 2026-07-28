import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  FOOD_STATUS_FLOW,
  FOOD_STATUS_LABELS,
  REQUEST_STATUS_FLOW,
  REQUEST_STATUS_LABELS,
} from "../../services/activityStatusService";

export default function StatusTimeline({ type, status }) {
  const isFood = type === "orders";
  const flow = isFood ? FOOD_STATUS_FLOW : REQUEST_STATUS_FLOW;
  const labels = isFood ? FOOD_STATUS_LABELS : REQUEST_STATUS_LABELS;
  const normalizedStatus = status === "fulfilled" ? "completed" : status;
  const terminalFailure = ["cancelled", "unable_to_complete"].includes(
    normalizedStatus
  );
  const activeIndex = flow.indexOf(normalizedStatus);

  if (terminalFailure) {
    return (
      <View style={styles.failureBox}>
        <View style={styles.failureDot} />
        <Text style={styles.failureText}>
          {labels[normalizedStatus] || normalizedStatus}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {flow.map((step, index) => {
        const complete = activeIndex >= 0 && index < activeIndex;
        const active = index === activeIndex;
        const pending = activeIndex < 0 || index > activeIndex;

        return (
          <View key={step} style={styles.row}>
            <View style={styles.markerColumn}>
              <View
                style={[
                  styles.dot,
                  complete && styles.completeDot,
                  active && styles.activeDot,
                  pending && styles.pendingDot,
                ]}
              >
                {complete ? <Text style={styles.check}>✓</Text> : null}
              </View>

              {index < flow.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    complete ? styles.completeLine : styles.pendingLine,
                  ]}
                />
              ) : null}
            </View>

            <Text
              style={[
                styles.label,
                complete && styles.completeLabel,
                active && styles.activeLabel,
              ]}
            >
              {labels[step] || step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  row: {
    minHeight: 34,
    flexDirection: "row",
  },
  markerColumn: {
    width: 26,
    alignItems: "center",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  completeDot: {
    backgroundColor: "#2f855a",
    borderColor: "#2f855a",
  },
  activeDot: {
    backgroundColor: "#fff",
    borderColor: "#8b5e34",
  },
  pendingDot: {
    backgroundColor: "#fff",
    borderColor: "#d6cec7",
  },
  check: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  completeLine: {
    backgroundColor: "#2f855a",
  },
  pendingLine: {
    backgroundColor: "#e5ddd6",
  },
  label: {
    flex: 1,
    color: "#8b7e74",
    fontSize: 13,
    paddingTop: 1,
    marginLeft: 7,
  },
  completeLabel: {
    color: "#436b52",
    fontWeight: "600",
  },
  activeLabel: {
    color: "#6b3200",
    fontWeight: "800",
  },
  failureBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff1f1",
    borderRadius: 12,
    padding: 12,
  },
  failureDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#b84040",
    marginRight: 9,
  },
  failureText: {
    color: "#9b2c2c",
    fontWeight: "800",
  },
});
