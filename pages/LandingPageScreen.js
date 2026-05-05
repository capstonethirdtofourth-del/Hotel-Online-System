import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const LANDING_MAIN_IMAGE = require("../assets/images/landing.png");
const LANDING_PROMO_IMAGE = require("../assets/images/landing-promo.png");

const SECONDARY = "#6b3200";
const BG = "#FFF8E7";

export default function LandingPageScreen({ onGoRooms, onGoFoodMenu }) {
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
          <Ionicons name="location" size={20} color={SECONDARY} />
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
            <Ionicons name="restaurant-outline" size={20} color={SECONDARY} />
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

const styles = StyleSheet.create({
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
});