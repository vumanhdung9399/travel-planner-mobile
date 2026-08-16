import { AppToastContainer } from "@/src/components/AppToast";
import CustomDrawer from "@/src/components/layout/CustomDrawer";
import { usePushNotification } from "@/src/hook/usePushNotification";
import { getNotificationRedirect } from "@/src/utils/helper";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useSocket } from "@src/hook/useSocket";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { createPaperTheme } from "@/constants/paper-theme";
import { useSettingsStore } from "@/src/store/settings.store";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";
import * as SystemUI from "expo-system-ui";
import IncomingCallListener from "@/src/components/group/IncomingCallListener";
import {
  MESSAGE_NOTIFICATION_CHANNEL_ID,
  MESSAGE_NOTIFICATION_SOUND,
  MESSAGE_VIBRATION_PATTERN,
} from "@/src/constants/notificationAudio";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const initNotification = async () => {
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "notification.mp3",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(
      MESSAGE_NOTIFICATION_CHANNEL_ID,
      {
        name: "Tin nhắn và bong bóng chat",
        importance: Notifications.AndroidImportance.HIGH,
        sound: MESSAGE_NOTIFICATION_SOUND,
        vibrationPattern: [...MESSAGE_VIBRATION_PATTERN],
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      },
    );
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
  const hasHydrated = useSettingsStore((state) => state.hasHydrated);
  const hasHiddenSplash = useRef(false);
  const paperTheme = useMemo(() => createPaperTheme(darkMode), [darkMode]);
  const navigationTheme = useMemo(() => {
    const base = darkMode ? NavigationDarkTheme : NavigationDefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outline,
        notification: paperTheme.colors.error,
      },
    };
  }, [darkMode, paperTheme]);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    const applySystemTheme = async () => {
      try {
        Appearance.setColorScheme(darkMode ? "dark" : "light");
        await SystemUI.setBackgroundColorAsync(paperTheme.colors.background);
      } catch (error) {
        console.warn("[Theme] Could not set the system background color:", error);
      } finally {
        if (!cancelled && !hasHiddenSplash.current) {
          hasHiddenSplash.current = true;
          await SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    };

    void applySystemTheme();

    return () => {
      cancelled = true;
    };
  }, [darkMode, hasHydrated, paperTheme.colors.background]);

  usePushNotification();

  useSocket();

  useEffect(() => {
    if (!hasHydrated) return;

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
  }, [hasHydrated, notificationsEnabled]);

  useEffect(() => {
    if (!hasHydrated || !notificationsEnabled) return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        const route = getNotificationRedirect(data);
        if (route) router.push(route as any);
      },
    );
    return () => sub.remove();
  }, [hasHydrated, notificationsEnabled, router]);

  if (!hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <NavigationThemeProvider value={navigationTheme}>
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

          <IncomingCallListener />
          <AppToastContainer />
        </PaperProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}
