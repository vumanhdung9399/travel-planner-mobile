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

const getPlatform = async () => {
  if (Platform.OS === ANDROID) return ANDROID;
  if (Platform.OS === IOS) return IOS;
  return "unknown";
};

const registerCurrentDevice = async (): Promise<boolean> => {
  try {
    if (!Device.isDevice) return false;
    const isExpoGo = Constants.appOwnership === "expo";
    if (isExpoGo) {
      console.log("⚠️ Expo Go không hỗ trợ push notification");
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;

    const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
    const deviceId = await getCurrentDeviceId();
    const platform = await getPlatform();
    console.log("📱 Push token:", pushToken);
    await api.post("/device-token/save-device-token", {
      token: pushToken,
      deviceId,
      platform,
    });
    return true;
  } catch (err) {
    console.log("❌ Register push error:", err);
    return false;
  }
};

export const usePushNotification = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const hasRegistered = useRef(false);
  const registeredUserId = useRef<string | null>(null);
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled,
  );

  useEffect(() => {
    const userId = user?.id ? String(user.id) : null;

    if (!notificationsEnabled) {
      hasRegistered.current = false;
      registeredUserId.current = null;
      if (token && userId) {
        void removeCurrentDeviceToken().catch(() => undefined);
      }
      return;
    }

    if (!token || !userId) {
      hasRegistered.current = false;
      registeredUserId.current = null;
      return;
    }

    if (registeredUserId.current !== userId) {
      hasRegistered.current = false;
      registeredUserId.current = userId;
    }

    if (hasRegistered.current) return;

    hasRegistered.current = true;
    void registerCurrentDevice().then((registered) => {
      if (registeredUserId.current === userId) {
        hasRegistered.current = registered;
      }
    });
  }, [notificationsEnabled, token, user?.id]);
};
