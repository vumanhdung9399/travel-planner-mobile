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
      permissions: [
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "POST_NOTIFICATIONS",
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "USE_FULL_SCREEN_INTENT",
      ],
      package: "com.anonymous.travelplanner",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      useNextNotificationsApi: true,
      googleServicesFile: "./google-services.json",
      notification: {
        icon: "./assets/logo.png",
        color: "#ffffff",
        defaultChannel: {
          name: "default",
          importance: 5,
          vibrationPattern: [0, 500, 500, 500],
          enableVibration: true,
          sound: "messenger.mp3",
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
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission: "Cho phép Travel Planner sử dụng camera để gọi video nhóm.",
          microphonePermission: "Cho phép Travel Planner sử dụng micro để gọi thoại và video nhóm.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/logo.png",
          color: "#ffffff",
          defaultChannel: "default",
          sounds: [
            "./assets/notification.mp3",
            "./assets/messenger.mp3",
            "./assets/call.mp3",
          ],
          enableBackgroundRemoteNotifications: true,
        },
      ],
      "./plugins/withTravelNative",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Cho phép Travel Planner sử dụng vị trí để theo dõi thành viên trên tuyến đường.",
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
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            buildArchs: ["arm64-v8a"],
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      API_URL: process.env.API_URL || "https://api-travel.vmdung.vn/api",
      SOCKET_URL: process.env.SOCKET_URL || "https://api-travel.vmdung.vn",
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
      eas: {
        projectId: "833e807d-7197-4ae9-8c52-b8c1e7257e3e",
      },
    },
    updates: {
      url: "https://u.expo.dev/833e807d-7197-4ae9-8c52-b8c1e7257e3e",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
};
