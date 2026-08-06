import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useUserStore } from "@/src/store/user.store";
import { UserProfile } from "@/src/type/user";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs, useFocusEffect, useSegments } from "expo-router";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/src/utils/constants";
import { useSettingsStore } from "@/src/store/settings.store";

export default function TabLayout() {
  const navigation = useNavigation();
  const { setUser } = useUserStore();
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

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        await getProfile();
        if (notificationsEnabled) await fetchNotifications();
      };
      init();
    }, [notificationsEnabled]),
  );

  const getProfile = async () => {
    try {
      const res = await api.get<UserProfile>("users/me");
      setUser(res.data);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
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
                height: 68,
                paddingTop: 7,
                paddingBottom: 7,
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
