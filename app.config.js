const SPLASH_BACKGROUND = "#FFF8E7";

module.exports = ({ config }) => {
  const existingPlugins = Array.isArray(config.plugins)
    ? config.plugins
    : [];

  const pluginsWithoutOldSplash = existingPlugins.filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== "expo-splash-screen";
  });

  return {
    ...config,

    name: "H&K Home Kafe",

    // Replace with the current filename you renamed your icon to.
    icon: "./assets/images/app-icon_v3.png",

    android: {
      ...(config.android || {}),

      icon: "./assets/images/app-icon_v3.png",

      adaptiveIcon: {
        foregroundImage:
          "./assets/images/adaptive-icon_v2.png",
        backgroundColor: SPLASH_BACKGROUND,
      },
    },

    plugins: [
      ...pluginsWithoutOldSplash,
      [
        "expo-splash-screen",
        {
          image: "./assets/images/app-icon_v3.png",
          imageWidth: 190,
          resizeMode: "contain",
          backgroundColor: SPLASH_BACKGROUND,
        },
      ],
    ],
  };
};