import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as {
  API_URL: string;
  SOCKET_URL: string;
};

export const ENV = {
  API_URL: extra.API_URL,
  SOCKET_URL: extra.SOCKET_URL,
};
