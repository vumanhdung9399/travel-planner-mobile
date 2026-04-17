import { useNotificationStore } from "@/src/store/notification.store";
import { useUserStore } from "@/src/store/user.store";
import { initSocket } from "@/src/utils/socket";
import { AppToast } from "@src/components/AppToast";
import type { Notification } from "@src/type/notification";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";

export const useSocket = () => {
  const addOneNotification = useNotificationStore((s) => s.addOneNotification);
  const token = useAuthStore.getState().accessToken;
  const userId = useUserStore((s) => s.user?.id);

  useEffect(() => {
    if (!token) return;

    const socket = initSocket(String(userId), token);

    const handleNotification = (data: Notification) => {
      addOneNotification(data);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 👉 toast
      AppToast.show({
        type: "success",
        title: data.title,
        message: data.content,
      });

      // 👉 push local
      Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.content,
          sound: "notification.mp3",
          data: { ...data },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          repeats: false,
          channelId: "default",
        },
      });
    };

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [token]);
};
