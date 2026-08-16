import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState, NativeModules, Platform } from "react-native";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth.store";
import { ANDROID, IOS } from "../utils/constants";
import { useSettingsStore } from "../store/settings.store";

const FULL_SCREEN_CALL_PERMISSION_PROMPTED =
  "travel-planner-full-screen-call-permission-prompted";
const PUSH_REGISTRATION_RETRY_DELAYS_MS = [2_000, 5_000, 15_000];

type TravelCallAudioModule = {
  canUseFullScreenIntent?: () => Promise<boolean>;
  openFullScreenIntentSettings?: () => Promise<boolean>;
};

const requestFullScreenCallPermissionOnce = async () => {
  if (Platform.OS !== ANDROID) return;
  const callModule = NativeModules.TravelCallAudio as
    | TravelCallAudioModule
    | undefined;
  if (
    !callModule?.canUseFullScreenIntent ||
    !callModule.openFullScreenIntentSettings
  ) {
    return;
  }

  const allowed = await callModule.canUseFullScreenIntent();
  if (allowed) return;
  const alreadyPrompted = await AsyncStorage.getItem(
    FULL_SCREEN_CALL_PERMISSION_PROMPTED,
  );
  if (alreadyPrompted === "true") return;

  // Android 14+ exposes full-screen incoming calls as special app access,
  // separate from POST_NOTIFICATIONS. Open the system screen only once.
  await AsyncStorage.setItem(FULL_SCREEN_CALL_PERMISSION_PROMPTED, "true");
  await callModule.openFullScreenIntentSettings();
};

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

const saveCurrentDeviceToken = async (pushToken: string) => {
  if (!pushToken) throw new Error("Push token is empty");

  const deviceId = await getCurrentDeviceId();
  const platform = await getPlatform();
  await api.post("/device-token/save-device-token", {
    token: pushToken,
    deviceId,
    platform,
  });
};

const registerCurrentDevice = async (): Promise<boolean> => {
  try {
    // Android emulators backed by Google Play Services can receive native FCM.
    // iOS simulators cannot receive APNs, so only keep the device guard there.
    if (!Device.isDevice && Platform.OS !== ANDROID) return false;
    const isExpoGo = Constants.appOwnership === "expo";
    if (isExpoGo) {
      console.log("⚠️ Expo Go không hỗ trợ push notification");
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;

    await requestFullScreenCallPermissionOnce().catch((error) => {
      console.warn("[Notifications] Could not request full-screen call access:", error);
    });

    const pushToken =
      Platform.OS === ANDROID
        ? String((await Notifications.getDevicePushTokenAsync()).data)
        : (await Notifications.getExpoPushTokenAsync()).data;
    await saveCurrentDeviceToken(pushToken);
    console.log("[Notifications] Push token registered.");
    return true;
  } catch (err) {
    console.warn("[Notifications] Push registration failed:", err);
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
    let cancelled = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

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

    const scheduleRegistration = () => {
      if (
        cancelled ||
        hasRegistered.current ||
        registeredUserId.current !== userId
      ) {
        return;
      }

      hasRegistered.current = true;
      void registerCurrentDevice().then((registered) => {
        if (cancelled || registeredUserId.current !== userId) return;

        hasRegistered.current = registered;
        if (!registered && retryAttempt < PUSH_REGISTRATION_RETRY_DELAYS_MS.length) {
          const retryDelay = PUSH_REGISTRATION_RETRY_DELAYS_MS[retryAttempt];
          retryAttempt += 1;
          retryTimer = setTimeout(scheduleRegistration, retryDelay);
        }
      });
    };

    scheduleRegistration();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !hasRegistered.current) {
        retryAttempt = 0;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        scheduleRegistration();
      }
    });

    const pushTokenSubscription =
      Platform.OS === ANDROID
        ? Notifications.addPushTokenListener((nextToken) => {
            if (cancelled || registeredUserId.current !== userId) return;

            void saveCurrentDeviceToken(String(nextToken.data))
              .then(() => {
                if (!cancelled && registeredUserId.current === userId) {
                  hasRegistered.current = true;
                }
              })
              .catch((error) => {
                console.warn(
                  "[Notifications] Could not update rotated push token:",
                  error,
                );
              });
          })
        : null;

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      appStateSubscription.remove();
      pushTokenSubscription?.remove();
    };
  }, [notificationsEnabled, token, user?.id]);
};
