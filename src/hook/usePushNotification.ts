import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth.store";
import { ANDROID, IOS } from "../utils/constants";
import { useSettingsStore } from "../store/settings.store";

export const getCurrentDeviceId = async () => {
  if (Platform.OS === ANDROID) {
    return await Application.getAndroidId();
  }

  if (Platform.OS === IOS) {
    return await Application.getIosIdForVendorAsync();
  }

  return "unknown";
};

export const removeCurrentDeviceToken = async () => {
  const deviceId = await getCurrentDeviceId();
  if (!deviceId || deviceId === "unknown") return;
  await api.delete("/device-token/remove-device-token", {
    data: { deviceId },
  });
};

export const usePushNotification = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const hasRegistered = useRef(false);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  useEffect(() => {
    if (!notificationsEnabled) {
      hasRegistered.current = false;
      if (token && user?.id) void removeCurrentDeviceToken().catch(() => undefined);
      return;
    }
    if (!token || !user?.id) return;
    if (hasRegistered.current) return;
    register();
    hasRegistered.current = true;
  }, [notificationsEnabled, user?.id, token]);

  const getPlatform = async () => {
    if (Platform.OS === ANDROID) {
      return ANDROID;
    }

    if (Platform.OS === IOS) {
      return IOS;
    }

    return "unknown";
  };

  const register = async () => {
    try {
      if (!Device.isDevice) return;
      const isExpoGo = Constants.appOwnership === "expo";
      if (isExpoGo) {
        console.log("⚠️ Expo Go không hỗ trợ push notification");
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      const deviceId = await getCurrentDeviceId();
      const platform = await getPlatform();
      console.log("📱 Push token:", token);
      await api.post("/device-token/save-device-token", {
        token: token,
        deviceId,
        platform,
      });
    } catch (err) {
      console.log("❌ Register push error:", err);
    }
  };
};
