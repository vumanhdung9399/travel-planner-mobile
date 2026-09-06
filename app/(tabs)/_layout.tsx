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
} from "expo-router/react-navigation";
import { Redirect, Tabs, useFocusEffect, usePathname, useSegments } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View, type ColorValue } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/src/utils/constants";
import { useSettingsStore } from "@/src/store/settings.store";
import OfflineBanner from '@/src/components/OfflineBanner';
import { useAppPalette } from "@/src/hook/useAppPalette";
import TabHeader from "@/src/components/layout/TabHeader";

function NavIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  focused: boolean;
}) {
  const palette = useAppPalette();

  return (
    <View
      style={[
        styles.navIcon,
        focused && { backgroundColor: palette.primaryLight },
      ]}
    >
      <Ionicons name={name} size={21} color={color} />
    </View>
  );
}

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
  const palette = useAppPalette();
  const background = palette.background;
  const surface = palette.surface;
  const border = palette.border;
  const muted = palette.textSecondary;
  const primary = darkMode ? "#69C7AA" : COLORS.primary;

  const hideTab =
    segments.includes("groups") ||
    (segments.includes("trips") && segments.length > 2) ||
    segments.includes("change-profile");
  const showTripDetailTabBar = /^\/(trips|groups)\/[^/]+\/?$/.test(pathname);
  const immersiveDetail =
    /^\/groups\/[^/]+\/?$/.test(pathname) ||
    /^\/groups\/[^/]+\/polls\/?$/.test(pathname) ||
    /^\/trips\/[^/]+\/?$/.test(pathname) ||
    /^\/trips\/[^/]+\/documents\/?$/.test(pathname);
  const usesAppBackgroundHeader =
    pathname === "/" ||
    pathname === "/trips" ||
    pathname === "/profile" ||
    pathname === "/notification";

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
          backgroundColor: background,
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
      style={{
        flex: 1,
        backgroundColor: usesAppBackgroundHeader ? background : surface,
      }}
      edges={immersiveDetail ? [] : ["top"]}
    >
      <OfflineBanner />
      {!hideTab && <TabHeader title={pathname === "/overview" ? "Trang chủ" : pathname === "/trips" ? "Chuyến đi" : pathname === "/maps" ? "Bản đồ" : pathname === "/profile" ? "Cá nhân" : pathname === "/notification" ? "Thông báo" : "Nhóm của tôi"} />}
      <Tabs
        initialRouteName="overview"
        backBehavior="initialRoute"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: muted,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "700",
            lineHeight: 13,
          },
          tabBarStyle: hideTab && !showTripDetailTabBar
            ? { display: "none" }
            : {
                height: 68 + Math.max(6, insets.bottom),
                paddingTop: 6,
                paddingBottom: Math.max(6, insets.bottom),
                backgroundColor: surface,
                borderTopColor: border,
                borderTopWidth: StyleSheet.hairlineWidth,
                elevation: 12,
              },
        }}
      >
        <Tabs.Screen name="overview" options={{ title: "Tổng quan", tabBarIcon: ({ color, focused }) => <NavIcon name="home-outline" color={color} focused={focused} /> }} />
        <Tabs.Screen
          name="index"
          options={{
            title: "Nhóm",
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="people-outline" color={color} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="trips"
          options={{
            title: "Chuyến đi",
            headerShown: false,
            popToTopOnBlur: true,
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="airplane-outline" color={color} focused={focused} />
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

        <Tabs.Screen name="maps" options={{ title: "Bản đồ", tabBarIcon: ({ color, focused }) => <NavIcon name="map-outline" color={color} focused={focused} /> }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Cá nhân",
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="person-outline" color={color} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="notification"
          options={{
            title: "Thông báo",
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="notifications-outline" color={color} focused={focused} />
            ),
            tabBarBadge: notificationsEnabled && count > 0 ? count : undefined,
            tabBarBadgeStyle: {
              backgroundColor: COLORS.error,
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
            href: null,
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="menu-outline" color={color} focused={focused} />
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

const styles = StyleSheet.create({
  navIcon: {
    width: 34,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
