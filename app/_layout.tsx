import { AppToastContainer } from "@/src/components/AppToast";
import CustomDrawer from "@/src/components/layout/CustomDrawer";
import { usePushNotification } from "@/src/hook/usePushNotification";
import { getNotificationRedirect } from "@/src/utils/helper";
import { useSocket } from "@src/hook/useSocket";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const initNotification = async () => {
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "notification.mp3",
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export default function RootLayout() {
  const router = useRouter();

  usePushNotification();

  useSocket();

  useEffect(() => {
    initNotification();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        const route = getNotificationRedirect(data);
        if (route) router.push(route as any);
      },
    );
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: { width: 280 },
        }}
      >
        <Drawer.Screen name="(tabs)" />
      </Drawer>

      <AppToastContainer />
    </GestureHandlerRootView>
  );
}
