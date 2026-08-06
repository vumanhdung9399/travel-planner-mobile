import { AppToastContainer } from "@/src/components/AppToast";
import CustomDrawer from "@/src/components/layout/CustomDrawer";
import { usePushNotification } from "@/src/hook/usePushNotification";
import { getNotificationRedirect } from "@/src/utils/helper";
import { useSocket } from "@src/hook/useSocket";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { createPaperTheme } from "@/constants/paper-theme";
import { useSettingsStore } from "@/src/store/settings.store";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";
import * as SystemUI from "expo-system-ui";

const initNotification = async () => {
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "notification.mp3",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  } catch (error) {
    console.warn("[Notifications] Could not create channel:", error);
  }
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
  const darkMode = useSettingsStore((state) => state.darkMode);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const paperTheme = useMemo(() => createPaperTheme(darkMode), [darkMode]);

  useEffect(() => {
    Appearance.setColorScheme(darkMode ? "dark" : "light");
    void SystemUI.setBackgroundColorAsync(darkMode ? "#0B1220" : "#F5F8FC");
  }, [darkMode]);

  usePushNotification();

  useSocket();

  useEffect(() => {
    if (notificationsEnabled) {
      void initNotification();
      return;
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      }),
    });
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        const route = getNotificationRedirect(data);
        if (route) router.push(route as any);
      },
    );
    return () => sub.remove();
  }, [notificationsEnabled, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <PaperProvider theme={paperTheme}>
        <Drawer
          drawerContent={(props) => <CustomDrawer {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: {
              width: 280,
              backgroundColor: paperTheme.colors.surface,
            },
            sceneStyle: { backgroundColor: paperTheme.colors.background },
          }}
        >
          <Drawer.Screen name="(tabs)" />
        </Drawer>

        <AppToastContainer />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
