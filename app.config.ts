export default {
  expo: {
    name: "travel-planner",
    slug: "travel-planner",
    android: {
      package: "com.anonymous.travelplanner",
      googleServicesFile: "./google-services.json",
    },
    ios: {
      bundleIdentifier: "com.anonymous.travelplanner",
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
