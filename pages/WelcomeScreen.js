import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import LocationMapModal, {
  HOTEL_ADDRESS,
  HOTEL_MAP_EMBED_URL,
} from "./components/LocationMapModal";

const STAY_POSTER = require("../assets/images/welcome-stay.png");
const FOOD_POSTER = require("../assets/images/welcome-food.png");
const MAP_PREVIEW = require("../assets/images/location-preview.png");

const BROWN = "#6B3200";
const DEEP_BROWN = "#351706";
const CREAM = "#FFF8E7";
const GOLD = "#D8B26A";
const SOFT_GOLD = "#F0D8A5";

const SLIDES = [
  {
    id: "stay",
    title: "Stay",
    subtitle: "Comfortable rooms and a relaxing local stay",
    icon: "bed-outline",
    image: STAY_POSTER,
  },
  {
    id: "dine",
    title: "Dine",
    subtitle: "Fresh meals prepared and served with heart",
    icon: "restaurant-outline",
    image: FOOD_POSTER,
  },
];

export default function WelcomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const isTablet = width >= 700;
  const isLandscape = width > height;

  const layout = useMemo(() => {
    const horizontalPadding = isTablet ? 34 : 14;
    const headerHeight = isTablet ? 70 : 58;
    const locationHeight = isTablet ? 116 : 98;
    const footerHeight = isTablet ? 66 : 58;
    const availableHeight = Math.max(
      310,
      height - headerHeight - locationHeight - footerHeight - (isTablet ? 30 : 18)
    );

    const cardWidth = isTablet
      ? Math.min(width * (isLandscape ? 0.58 : 0.78), 760)
      : width - horizontalPadding * 2;

    const cardHeight = isTablet
      ? Math.min(availableHeight, 900)
      : availableHeight;

    return {
      horizontalPadding,
      headerHeight,
      locationHeight,
      footerHeight,
      cardWidth,
      cardHeight,
    };
  }, [height, isLandscape, isTablet, width]);

  useEffect(() => {
    if (userInteracting || mapVisible || SLIDES.length < 2) return undefined;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % SLIDES.length;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5500);

    return () => clearInterval(timer);
  }, [activeIndex, mapVisible, userInteracting]);

  const handleMomentumEnd = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, SLIDES.length - 1)));
    setUserInteracting(false);
  };

  const goToSlide = (index) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.65, 1, 0.65],
      extrapolate: "clamp",
    });

    return (
      <View style={[styles.slide, { width }]}> 
        <Animated.View
          style={[
            styles.posterCard,
            {
              width: layout.cardWidth,
              height: layout.cardHeight,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.posterHeader}>
            <View style={styles.posterLabel}>
              <Ionicons name={item.icon} size={17} color={BROWN} />
              <Text style={styles.posterLabelText}>{item.title}</Text>
            </View>

            <Text style={styles.posterSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          <View style={styles.imageStage}>
            <Image
              source={item.image}
              style={styles.posterImage}
              resizeMode="contain"
              accessibilityLabel={`${item.title} promotional poster`}
            />
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={BROWN} barStyle="light-content" />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View
          style={[
            styles.header,
            {
              minHeight: layout.headerHeight,
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>H&K</Text>
            </View>

            <View style={styles.brandTextBlock}>
              <Text style={styles.brandTitle}>Hotel & Home Kafe</Text>
              {isTablet ? (
                <Text style={styles.brandCaption}>Stay · Dine · Connect</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.authActions}>
            <TouchableOpacity
              style={[styles.authButton, styles.loginButton]}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.85}
            >
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authButton, styles.registerButton]}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.85}
            >
              <Text style={styles.registerText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.carouselArea}>
          <Animated.FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.id}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setUserInteracting(true)}
            onMomentumScrollEnd={handleMomentumEnd}
          />
        </View>

        <View
          style={[
            styles.locationSection,
            {
              minHeight: layout.locationHeight,
              paddingHorizontal: isTablet ? 28 : 14,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.locationCard,
              isTablet && { width: Math.min(layout.cardWidth, 760) },
            ]}
            onPress={() => setMapVisible(true)}
            activeOpacity={0.9}
            accessibilityLabel="Open hotel location map"
          >
            <View style={styles.mapPreviewBox} pointerEvents="none">
              <Image
                source={MAP_PREVIEW}
                style={styles.mapPreview}
                resizeMode="cover"
                accessibilityLabel="Hotel location preview"
              />
              <View style={styles.mapPreviewShade} />
              <View style={styles.mapPinBadge}>
                <Ionicons name="location" size={19} color={CREAM} />
              </View>
            </View>

            <View style={styles.locationCopy}>
              <Text style={styles.locationEyebrow}>VISIT H&K</Text>
              <Text style={styles.locationTitle}>View our location</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {HOTEL_ADDRESS}
              </Text>
            </View>

            <View style={styles.locationArrow}>
              <Ionicons name="expand-outline" size={20} color={BROWN} />
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.footer,
            {
              minHeight: layout.footerHeight,
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}
        >
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, index) => {
              const active = index === activeIndex;

              return (
                <TouchableOpacity
                  key={slide.id}
                  onPress={() => goToSlide(index)}
                  style={[styles.dotButton, active && styles.dotButtonActive]}
                  activeOpacity={0.8}
                  accessibilityLabel={`Open ${slide.title} slide`}
                >
                  <View style={[styles.dot, active && styles.dotActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.swipeHint}>
            <Ionicons name="swap-horizontal" size={17} color={SOFT_GOLD} />
            <Text style={styles.swipeHintText}>Swipe to explore</Text>
          </View>
        </View>
      </SafeAreaView>

      <LocationMapModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BROWN,
  },
  safeArea: {
    flex: 1,
    backgroundColor: BROWN,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,248,231,0.18)",
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GOLD,
  },
  brandMarkText: {
    color: BROWN,
    fontSize: 13,
    fontWeight: "900",
  },
  brandTextBlock: {
    marginLeft: 9,
    flexShrink: 1,
  },
  brandTitle: {
    color: CREAM,
    fontSize: 15,
    fontWeight: "800",
  },
  brandCaption: {
    marginTop: 2,
    color: SOFT_GOLD,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  authActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  authButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: DEEP_BROWN,
    marginRight: 8,
  },
  registerButton: {
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: CREAM,
  },
  loginText: {
    color: CREAM,
    fontSize: 12,
    fontWeight: "800",
  },
  registerText: {
    color: BROWN,
    fontSize: 12,
    fontWeight: "800",
  },
  carouselArea: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  posterCard: {
    backgroundColor: CREAM,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(216,178,106,0.75)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  posterHeader: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(107,50,0,0.16)",
  },
  posterLabel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5E4BF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  posterLabelText: {
    marginLeft: 6,
    color: BROWN,
    fontSize: 12,
    fontWeight: "800",
  },
  posterSubtitle: {
    flex: 1,
    marginLeft: 10,
    color: "#7B604D",
    textAlign: "right",
    fontSize: 11,
  },
  imageStage: {
    flex: 1,
    backgroundColor: "#F9F0DF",
    padding: 5,
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  locationSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  locationCard: {
    width: "100%",
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(216,178,106,0.8)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  mapPreviewBox: {
    alignSelf: "stretch",
    width: 112,
    backgroundColor: "#DED8CF",
    overflow: "hidden",
  },
  mapPreview: {
    flex: 1,
    backgroundColor: "#DED8CF",
  },
  mapPreviewShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(53,23,6,0.08)",
  },
  mapPinBadge: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: CREAM,
  },
  locationCopy: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationEyebrow: {
    color: "#A6722C",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  locationTitle: {
    color: DEEP_BROWN,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  locationAddress: {
    color: "#7B604D",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  locationArrow: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,248,231,0.18)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotButton: {
    width: 24,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dotButtonActive: {
    width: 34,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,248,231,0.38)",
  },
  dotActive: {
    width: 24,
    backgroundColor: GOLD,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  swipeHintText: {
    marginLeft: 6,
    color: SOFT_GOLD,
    fontSize: 12,
    fontWeight: "600",
  },
});
