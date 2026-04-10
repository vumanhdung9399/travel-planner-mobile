import { AppToastContainer } from "@/src/components/AppToast";
import CustomDrawer from "@/src/components/layout/CustomDrawer";
import { usePushNotification } from "@/src/hook/usePushNotification";
import { useSocket } from "@src/hook/useSocket";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,

    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const initNotification = async () => {
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
  });

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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
        const data = response.notification.request.content.data;
        if (data?.type === "chat") {
          router.push(`/chat/${data.conversationId}`);
        }
        if (data?.type === "trip") {
          router.push(`/trip/${data.tripId}`);
        }
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
