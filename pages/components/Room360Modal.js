import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const PRIMARY = "#6b3200";
const DARK = "#1a120d";
const CREAM = "#FFF8E7";

export default function Room360Modal({ visible, onClose, room }) {
  const [viewerError, setViewerError] = useState("");

  const panoramaUrl = room?.panoramaUrl || "";
  const roomName = room?.name || room?.roomName || "Room Preview";

  const panoramaHtml = useMemo(() => {
    const safePanoramaUrl = JSON.stringify(panoramaUrl);
    const safeRoomName = JSON.stringify(roomName);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          />

          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
          />
          <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>

          <style>
            html,
            body,
            #panorama {
              width: 100%;
              height: 100%;
              margin: 0;
              overflow: hidden;
              background: ${DARK};
            }

            .pnlm-container {
              font-family: Arial, sans-serif;
            }

            .pnlm-title-box,
            .pnlm-author-box {
              background: rgba(61, 35, 19, 0.78) !important;
            }

            .pnlm-load-box {
              background: rgba(61, 35, 19, 0.85) !important;
            }
          </style>
        </head>

        <body>
          <div id="panorama"></div>

          <script>
            window.addEventListener("load", function () {
              try {
                if (!window.pannellum) {
                  throw new Error("The 360 viewer library could not be loaded.");
                }

                pannellum.viewer("panorama", {
                  type: "equirectangular",
                  panorama: ${safePanoramaUrl},
                  title: ${safeRoomName},
                  autoLoad: true,
                  autoRotate: 0,
                  pitch: -4,
                  yaw: 0,
                  hfov: 100,
                  minHfov: 45,
                  maxHfov: 120,
                  draggable: true,
                  mouseZoom: true,
                  showControls: true,
                  showZoomCtrl: true,
                  showFullscreenCtrl: false,
                  keyboardZoom: true,
                  compass: false,
                  orientationOnByDefault: false,
                  escapeHTML: true,
                  crossOrigin: "anonymous"
                });
              } catch (error) {
                window.ReactNativeWebView?.postMessage(
                  JSON.stringify({ type: "viewer-error", message: error.message })
                );
              }
            });
          </script>
        </body>
      </html>
    `;
  }, [panoramaUrl, roomName]);

  const handleClose = () => {
    setViewerError("");
    onClose?.();
  };

  const handleMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "viewer-error") {
        setViewerError(payload.message || "Unable to open the 360° preview.");
      }
    } catch {
      // Ignore unrelated WebView messages.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>360° Room Preview</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {roomName}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {panoramaUrl && !viewerError ? (
          <WebView
            key={panoramaUrl}
            style={styles.webView}
            originWhitelist={["*"]}
            source={{ html: panoramaHtml, baseUrl: "https://cdn.jsdelivr.net" }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            allowFileAccess
            mixedContentMode="always"
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#f1c98e" />
                <Text style={styles.loadingText}>Loading room preview...</Text>
              </View>
            )}
            onMessage={handleMessage}
            onError={() =>
              setViewerError(
                "The 360° preview could not be loaded. Check your connection and panorama URL."
              )
            }
            onHttpError={() =>
              setViewerError(
                "The panorama image could not be downloaded. Check its public URL."
              )
            }
          />
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="panorama-outline" size={64} color="#d7b58d" />
            <Text style={styles.emptyTitle}>Preview unavailable</Text>
            <Text style={styles.emptyText}>
              {viewerError ||
                "This room does not have a public panoramaUrl in Firestore yet."}
            </Text>
          </View>
        )}

        <View style={styles.instructionBox}>
          <Ionicons name="move-outline" size={19} color={PRIMARY} />
          <Text style={styles.instructionText}>
            Drag to look around. Pinch to zoom.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK,
  },
  header: {
    minHeight: 70,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextBox: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#f2d9bd",
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  webView: {
    flex: 1,
    backgroundColor: DARK,
  },
  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
  },
  emptyBox: {
    flex: 1,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 14,
  },
  emptyText: {
    color: "#d8c9bc",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  instructionBox: {
    backgroundColor: CREAM,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
});
