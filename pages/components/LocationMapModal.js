import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

const BROWN = "#6B3200";
const DEEP_BROWN = "#351706";
const CREAM = "#FFF8E7";
const GOLD = "#D8B26A";

export const HOTEL_NAME = "H&K Hotel and Home Kafe";
export const HOTEL_ADDRESS =
  "3102 Diversion Road, Maharlika Highway, San Leonardo, Nueva Ecija";

const MAP_QUERY = `${HOTEL_NAME}, ${HOTEL_ADDRESS}, Philippines`;
const ENCODED_QUERY = encodeURIComponent(MAP_QUERY);

// This URL must be placed inside an iframe. Loading it directly in the
// WebView produces: “The Google Maps Embed API must be used in an iframe.”
export const HOTEL_MAP_EMBED_URL =
  `https://www.google.com/maps?q=${ENCODED_QUERY}&z=16&output=embed`;

const HOTEL_MAP_EXTERNAL_URL =
  `https://www.google.com/maps/search/?api=1&query=${ENCODED_QUERY}`;

// Google Maps can send Android WebViews to an `intent://` address when the
// user taps the embedded map. WebView cannot load that scheme by itself, so
// extract Google's HTTPS fallback and open it outside the WebView instead.
const getIntentFallbackUrl = (intentUrl) => {
  const match = intentUrl.match(/S\.browser_fallback_url=([^;]+)/i);

  if (!match?.[1]) {
    return HOTEL_MAP_EXTERNAL_URL;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return HOTEL_MAP_EXTERNAL_URL;
  }
};

export default function LocationMapModal({ visible, onClose }) {
  const [mapFailed, setMapFailed] = useState(false);

  const mapHtml = useMemo(() => {
    const safeMapUrl = JSON.stringify(HOTEL_MAP_EMBED_URL);
    const safeTitle = JSON.stringify(`${HOTEL_NAME} location map`);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
          <style>
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #ede7dd;
            }

            .map-frame {
              width: 100%;
              height: 100%;
              border: 0;
              display: block;
            }
          </style>
        </head>
        <body>
          <iframe
            class="map-frame"
            title=${safeTitle}
            src=${safeMapUrl}
            loading="eager"
            allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </body>
      </html>
    `;
  }, []);

  const openExternalMap = async () => {
    try {
      // Open the HTTPS link directly. On some Android builds, canOpenURL()
      // incorrectly reports false even though Google Maps or a browser can
      // handle the link.
      await Linking.openURL(HOTEL_MAP_EXTERNAL_URL);
    } catch (error) {
      console.log("Unable to open map:", error);
      Alert.alert(
        "Unable to Open Maps",
        "Google Maps could not be opened. Please check your connection and try again."
      );
    }
  };

  const handleMapNavigation = (request) => {
    const requestedUrl = request?.url ?? "";

    if (requestedUrl.startsWith("intent://")) {
      Linking.openURL(getIntentFallbackUrl(requestedUrl)).catch((error) => {
        console.log("Unable to open Google Maps intent:", error);
        Alert.alert("Unable to Open Maps", "Please try again.");
      });

      return false;
    }

    if (
      requestedUrl.startsWith("geo:") ||
      requestedUrl.startsWith("google.navigation:") ||
      requestedUrl.startsWith("comgooglemaps:")
    ) {
      Linking.openURL(requestedUrl).catch(() => {
        Linking.openURL(HOTEL_MAP_EXTERNAL_URL).catch((error) => {
          console.log("Unable to open map:", error);
          Alert.alert("Unable to Open Maps", "Please try again.");
        });
      });

      return false;
    }

    return true;
  };

  const handleClose = () => {
    setMapFailed(false);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>FIND US</Text>
            <Text style={styles.title}>{HOTEL_NAME}</Text>
            <Text style={styles.address} numberOfLines={2}>
              {HOTEL_ADDRESS}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.85}
            accessibilityLabel="Close map"
          >
            <Ionicons name="close" size={26} color={CREAM} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapArea}>
          {mapFailed ? (
            <View style={styles.errorBox}>
              <Ionicons name="map-outline" size={52} color={BROWN} />
              <Text style={styles.errorTitle}>Map preview unavailable</Text>
              <Text style={styles.errorText}>
                Check your internet connection or open the location in your map app.
              </Text>

              <TouchableOpacity
                style={styles.errorMapButton}
                onPress={openExternalMap}
                activeOpacity={0.88}
              >
                <Text style={styles.errorMapButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              source={{
                html: mapHtml,
                baseUrl: "https://www.google.com",
              }}
              style={styles.webView}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              setSupportMultipleWindows={false}
              mixedContentMode="compatibility"
              onShouldStartLoadWithRequest={handleMapNavigation}
              onError={(event) => {
                console.log("Map WebView error:", event.nativeEvent);
                setMapFailed(true);
              }}
              onHttpError={(event) => {
                console.log("Map HTTP error:", event.nativeEvent.statusCode);
                setMapFailed(true);
              }}
              renderLoading={() => (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={BROWN} />
                  <Text style={styles.loadingText}>Loading map…</Text>
                </View>
              )}
            />
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCopy}>
            <Ionicons name="navigate-circle-outline" size={25} color={BROWN} />
            <View style={styles.footerTextBlock}>
              <Text style={styles.footerTitle}>Plan your visit</Text>
              <Text style={styles.footerText}>
                Open the location in your preferred map application.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.directionsButton}
            onPress={openExternalMap}
            activeOpacity={0.88}
          >
            <Ionicons name="navigate" size={18} color={CREAM} />
            <Text style={styles.directionsText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    backgroundColor: BROWN,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    color: CREAM,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3,
  },
  address: {
    color: "#F1D8B5",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DEEP_BROWN,
    borderWidth: 1,
    borderColor: "rgba(255,248,231,0.2)",
  },
  mapArea: {
    flex: 1,
    backgroundColor: "#EDE7DD",
  },
  webView: {
    flex: 1,
    backgroundColor: "#EDE7DD",
  },
  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  loadingText: {
    marginTop: 10,
    color: BROWN,
    fontSize: 14,
    fontWeight: "700",
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  errorTitle: {
    color: DEEP_BROWN,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  errorText: {
    color: "#7B604D",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  errorMapButton: {
    backgroundColor: BROWN,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 18,
  },
  errorMapButtonText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "900",
  },
  footer: {
    backgroundColor: CREAM,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(107,50,0,0.18)",
  },
  footerCopy: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerTextBlock: {
    flex: 1,
    marginLeft: 9,
  },
  footerTitle: {
    color: DEEP_BROWN,
    fontSize: 15,
    fontWeight: "900",
  },
  footerText: {
    color: "#7B604D",
    fontSize: 12,
    marginTop: 2,
  },
  directionsButton: {
    minHeight: 48,
    backgroundColor: BROWN,
    borderRadius: 14,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  directionsText: {
    color: CREAM,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});
