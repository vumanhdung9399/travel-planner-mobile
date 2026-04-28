import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useUserStore } from "@/src/store/user.store";
import { UserProfile } from "@/src/type/user";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs, useFocusEffect, useSegments } from "expo-router";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabLayout() {
  const navigation = useNavigation();
  const { setUser } = useUserStore();
  const segments = useSegments() as string[];
  const { fetchNotifications, count } = useNotificationStore();

  const hideTab =
    segments.includes("groups") ||
    (segments.includes("trips") && segments.length > 2) ||
    segments.includes("change-profile");

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        await getProfile();
        await fetchNotifications();
      };
      init();
    }, []),
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
          tabBarStyle: hideTab ? { display: "none" } : {},
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
            tabBarBadge: count > 0 ? count : undefined,
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
            tabPress: (e) => {
              e.preventDefault();
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
