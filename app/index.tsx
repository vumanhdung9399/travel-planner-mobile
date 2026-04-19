import { useAuthStore } from "@/src/store/auth.store";
import { Redirect } from "expo-router";

export default function Index() {
  const { user } = useAuthStore();
  // Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: "Tiêu đề thông báo 🔔",
  //     body: "Đây là nội dung hiển thị khi app đã tắt.",
  //     sound: "notification.mp3",
  //     data: { screen: "Settings" },
  //   },
  //   trigger: {
  //     type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  //     seconds: 5,
  //     repeats: false,
  //     channelId: "default",
  //   },
  // });
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
