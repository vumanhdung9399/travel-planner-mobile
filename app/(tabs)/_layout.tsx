import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@/src/store/user.store";
import { UserProfile } from "@/src/type/user";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerActions,
  StackActions,
  useNavigation,
} from "@react-navigation/native";
import { Redirect, Tabs, useFocusEffect, usePathname, useSegments } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/src/utils/constants";
import { useSettingsStore } from "@/src/store/settings.store";

export default function TabLayout() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { setUser } = useUserStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const segments = useSegments() as string[];
  const { fetchNotifications, count } = useNotificationStore();
  const darkMode = useSettingsStore((state) => state.darkMode);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const surface = darkMode ? "#141E2E" : COLORS.surface;
  const border = darkMode ? "#2A384C" : COLORS.border;
  const muted = darkMode ? "#A9B7CA" : COLORS.textSecondary;

  const hideTab =
    segments.includes("groups") ||
    (segments.includes("trips") && segments.length > 2) ||
    segments.includes("change-profile");
  const immersiveDetail =
    /^\/groups\/[^/]+\/?$/.test(pathname) ||
    /^\/trips\/[^/]+\/?$/.test(pathname);

  const getProfile = useCallback(async () => {
    try {
      const res = await api.get<UserProfile>("users/me");
      setUser(res.data);
    } catch {}
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHydrated || !accessToken) return;
      const init = async () => {
        await getProfile();
        await fetchNotifications(true);
      };
      void init();
    }, [accessToken, fetchNotifications, getProfile, hasHydrated]),
  );

  if (!hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: darkMode ? "#0B1220" : COLORS.background,
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: surface }}
      edges={immersiveDetail ? [] : ["top"]}
    >
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarStyle: hideTab
            ? { display: "none" }
            : {
                height: 61 + Math.max(7, insets.bottom),
                paddingTop: 7,
                paddingBottom: Math.max(7, insets.bottom),
                backgroundColor: surface,
                borderTopColor: border,
              },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Nhóm",
            tabBarIcon: ({ color }) => (
              <Ionicons name="people-outline" size={20} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="trips"
          options={{
            title: "Chuyến đi",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="airplane-outline" size={22} color={color} />
            ),
          }}
          listeners={({ navigation: tabsNavigation, route }) => ({
            tabPress: () => {
              const tripsState = tabsNavigation
                .getState()
                .routes.find(
                  (tabRoute: { key: string }) => tabRoute.key === route.key,
                )?.state;

              if (tripsState?.type === "stack" && tripsState.key) {
                tabsNavigation.dispatch({
                  ...StackActions.popToTop(),
                  target: tripsState.key,
                });
              }
            },
          })}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Cá nhân",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={20} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="notification"
          options={{
            title: "Thông báo",
            tabBarIcon: ({ color }) => (
              <Ionicons name="notifications-outline" size={20} color={color} />
            ),
            tabBarBadge: notificationsEnabled && count > 0 ? count : undefined,
            tabBarBadgeStyle: {
              backgroundColor: "#FF3B30",
              color: "white",
              fontSize: 10,
              lineHeight: 14,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              alignSelf: "center",
            },
          }}
        />

        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="menu" size={22} color={color} />
            ),
          }}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              navigation.dispatch(DrawerActions.openDrawer());
            },
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="change-profile"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
