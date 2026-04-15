export default {
  expo: {
    name: "Travel Planner",
    slug: "travel-planner",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    scheme: "travelplannermobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      icon: "./assets/logo.png",
      bundleIdentifier: "com.anonymous.travelplanner",
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/logo.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["VIBRATE", "RECEIVE_BOOT_COMPLETED", "POST_NOTIFICATIONS"],
      package: "com.anonymous.travelplanner",
      useNextNotificationsApi: true,
      googleServicesFile: "./google-services.json",
      notification: {
        icon: "./assets/logo.png",
        color: "#4CAF50",
        defaultChannel: {
          name: "default",
          importance: 5,
          vibrationPattern: [0, 500, 500, 500],
          enableVibration: true,
          sound: "notification.mp3",
          bypassDnd: false,
          lockscreen: true,
        },
      },
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/logo.png",
          color: "#ffffff",
          defaultChannel: "default",
          sounds: ["./assets/notification.mp3"],
          enableBackgroundRemoteNotifications: false,
        },
      ],
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/logo-text.png",
          imageWidth: 200,
          resizeMode: "contain",

          android: {
            backgroundColor: "#ffffff",
            image: "./assets/logo-text.png",
          },
          ios: {
            backgroundColor: "#ffffff",
            image: "./assets/logo-text.png",
            resizeMode: "cover",
          },
        },
      ],
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      API_URL: process.env.API_URL || "http://10.225.202.4:3000/api",
      SOCKET_URL: process.env.SOCKET_URL || "http://localhost:3000",
      eas: {
        projectId: "833e807d-7197-4ae9-8c52-b8c1e7257e3e",
      },
    },
  },
};
