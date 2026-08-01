/**
 * H&K Home Kafe branding configuration.
 *
 * The icon assets contain their own safe padding. Native splash positioning is
 * handled by expo-splash-screen, so no React Native CSS is required.
 */
module.exports = ({ config }) => {
  const existingPlugins = Array.isArray(config.plugins) ? config.plugins : [];

  const pluginsWithoutOldSplash = existingPlugins.filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== "expo-splash-screen";
  });

  return {
    ...config,
    name: "H&K Home Kafe",
    icon: "./assets/images/app-icon_v2.png",

    android: {
      ...(config.android || {}),
      icon: "./assets/images/app-icon_v2.png",
      adaptiveIcon: {
        ...((config.android && config.android.adaptiveIcon) || {}),
        foregroundImage: "./assets/images/adaptive-icon_v2.png",
        backgroundColor: "#ffe7e7",
        marginTop: 290,
      },
    },

    plugins: [
      ...pluginsWithoutOldSplash,
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon_v2.png",
          imageWidth: 190,
          resizeMode: "contain",
          backgroundColor: "#FFF8E7",
        },
      ],
    ],
  };
};
