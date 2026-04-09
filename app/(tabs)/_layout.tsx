import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useUserStore } from "@/src/store/user.store";
import { UserProfile } from "@/src/type/user";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabLayout() {
  const navigation = useNavigation();
  const { setUser } = useUserStore();
  const { fetchNotifications, count } = useNotificationStore();

  useEffect(() => {
    getProfile();
    fetchNotifications();
  }, []);

  const getProfile = async () => {
    try {
      const res = await api.get<UserProfile>("users/me");
      setUser(res.data);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <Tabs
        screenOptions={{
          headerShown: false,
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
      </Tabs>
    </SafeAreaView>
  );
}
