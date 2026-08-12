const fs = require("fs");
const path = require("path");

/**
 * H&K Home Kafe Expo configuration
 *
 * IMPORTANT:
 * The Nitro Google Sign-In config plugin is only enabled after BOTH Firebase
 * native config files exist:
 *
 *   ./google-services.json
 *   ./GoogleService-Info.plist
 *
 * This lets `npx expo config --type public` run before Firebase native apps
 * have been configured.
 */
module.exports = ({ config }) => {
  const existingPlugins = Array.isArray(config.plugins)
    ? config.plugins
    : [];

  const pluginName = (plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin;

  // Remove prior copies so we can add them back in a controlled way.
  const filteredPlugins = existingPlugins.filter((plugin) => {
    const name = pluginName(plugin);

    return (
      name !== "expo-splash-screen" &&
      name !== "react-native-nitro-google-signin"
    );
  });

  const androidGoogleServicesFile = "./google-services.json";
  const iosGoogleServicesFile = "./GoogleService-Info.plist";

  const hasAndroidGoogleServices = fs.existsSync(
    path.resolve(__dirname, "google-services.json")
  );

  const hasIosGoogleServices = fs.existsSync(
    path.resolve(__dirname, "GoogleService-Info.plist")
  );

  // For the Firebase configuration of react-native-nitro-google-signin,
  // enable the plugin only when both files are ready.
  const googleSignInReady =
    hasAndroidGoogleServices && hasIosGoogleServices;

  const plugins = [...filteredPlugins];

  if (googleSignInReady) {
    plugins.push("react-native-nitro-google-signin");
  }

  plugins.push([
    "expo-splash-screen",
    {
      image: "./assets/images/splash-icon_v2.png",
      imageWidth: 220,
      resizeMode: "contain",
      backgroundColor: "#FFF8E7",
    },
  ]);

  return {
    ...config,

    name: "H&K Home Kafe",
    scheme: "hnkhomekafe",
    icon: "./assets/images/app-icon_v3.png",

    android: {
      ...(config.android || {}),

      ...(hasAndroidGoogleServices
        ? {
            googleServicesFile: androidGoogleServicesFile,
          }
        : {}),

      adaptiveIcon: {
        ...((config.android &&
          config.android.adaptiveIcon) ||
          {}),
        foregroundImage:
          "./assets/images/adaptive-icon_v2.png",
        backgroundColor: "#FFF8E7",
      },
    },

    ios: {
      ...(config.ios || {}),
      supportsTablet: true,
      bundleIdentifier:
        "com.anonymous.OnlineHotelManagementSystem",
      googleServicesFile:
        "./GoogleService-Info.plist",
    },

    plugins,
  };
};
