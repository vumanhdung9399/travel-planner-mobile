import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@/src/store/user.store";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Href, router, usePathname } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import { api } from "@/src/services/api";
import { useAppPalette } from "@/src/hook/useAppPalette";

export default function CustomDrawer(props: any) {
  const pathname = usePathname();
  const { user } = useUserStore();
  const { logout } = useAuthStore();
  const palette = useAppPalette();

  const menu: {
    label: string;
    path: Href;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Nhóm của tôi", path: "/", icon: "people-outline" },
    { label: "Chuyến đi", path: "/trips", icon: "airplane-outline" },
    { label: "Cá nhân", path: "/profile", icon: "person-outline" },
    {
      label: "Thông báo",
      path: "/notification",
      icon: "notifications-outline",
    },
  ];

  const handleNavigate = (path: Href) => {
    props.navigation.closeDrawer();
    router.push(path);
  };

  const handleLogout = async () => {
    props.navigation.closeDrawer();
    try {
      await removeCurrentDeviceToken();
    } catch {}

    try {
      await api.post("/auth/logout");
    } finally {
      logout();
      router.replace("/login");
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={[props.style, { backgroundColor: palette.surface }]}
    >
      {/* User */}
      <View style={{ padding: 16, flexDirection: "row", gap: 10 }}>
        <Image
          source={{ uri: user?.avatar ?? "" }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
        <View>
          <Text style={{ fontWeight: "600", color: palette.textPrimary }}>{user?.name}</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={{ padding: 16 }}>
        {menu.map((item) => {
          const isActive = pathname === item.path;

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => handleNavigate(item.path)}
              style={{
                padding: 12,
                borderRadius: UI_RADIUS.control,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: isActive ? palette.primaryLight : "transparent",
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? COLORS.primary : palette.textSecondary}
              />
              <Text
                style={{
                  color: isActive ? COLORS.primary : palette.textPrimary,
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={{
          marginHorizontal: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <TouchableOpacity
          onPress={() => void handleLogout()}
          style={{
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={{ color: COLORS.error }}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}
