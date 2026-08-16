import { useNotificationStore } from "@/src/store/notification.store";
import { initSocket } from "@/src/utils/socket";
import { AppToast } from "@src/components/AppToast";
import type { Notification } from "@src/type/notification";
import type { ChatMessage } from "@/src/type/chat";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState, NativeModules, Platform } from "react-native";
import { useAuthStore } from "../store/auth.store";
import { useSettingsStore } from "../store/settings.store";
import {
  MESSAGE_NOTIFICATION_CHANNEL_ID,
  MESSAGE_NOTIFICATION_SOUND,
} from "../constants/notificationAudio";

type ChatNotification = {
  groupId: string;
  message?: ChatMessage;
};

const playMessageAlert = async (data: ChatNotification) => {
  const nativeAudio = NativeModules.TravelCallAudio as
    | { playMessageAlert?: () => Promise<boolean> }
    | undefined;
  if (Platform.OS === "android" && nativeAudio?.playMessageAlert) {
    await nativeAudio.playMessageAlert();
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.message?.sender?.name || "Tin nhắn mới",
      body: data.message?.content || "Bạn có tin nhắn mới",
      sound: MESSAGE_NOTIFICATION_SOUND,
      data: { type: "chat_message", groupId: data.groupId },
    },
    trigger: null,
  });
};

export const useSocket = () => {
  const addOneNotification = useNotificationStore((s) => s.addOneNotification);
  const token = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!token || !userId) return;

    const socket = initSocket(String(userId), token);

    const handleNotification = (data: Notification) => {
      if (!useSettingsStore.getState().notificationsEnabled) return;

      addOneNotification(data);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 👉 toast
      AppToast.show({
        type: "success",
        title: data.title,
        message: data.content,
      });

      const appState = AppState.currentState;
      if (appState !== "active") {
        // 👉 push local
        Notifications.scheduleNotificationAsync({
          content: {
            title: data.title,
            body: data.content,
            sound: MESSAGE_NOTIFICATION_SOUND,
            data: { ...data },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 5,
            repeats: false,
            channelId: MESSAGE_NOTIFICATION_CHANNEL_ID,
          },
        });
      }
    };

    const handleChatNotification = (data: ChatNotification) => {
      if (
        !useSettingsStore.getState().notificationsEnabled ||
        AppState.currentState !== "active"
      ) {
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AppToast.show({
        type: "success",
        title: data.message?.sender?.name || "Tin nhắn mới",
        message: data.message?.content || "Bạn có tin nhắn mới",
      });
      void playMessageAlert(data).catch(() => undefined);
    };

    const handleConnect = () => {
      console.log("✅ Connected:", socket.id);
    };

    socket.on("connect", handleConnect);
    socket.on("notification", handleNotification);
    socket.on("chat:notification", handleChatNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification", handleNotification);
      socket.off("chat:notification", handleChatNotification);
    };
  }, [addOneNotification, token, userId]);
};
