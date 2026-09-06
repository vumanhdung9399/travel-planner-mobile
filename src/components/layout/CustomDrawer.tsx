import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@/src/store/user.store";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView } from "expo-router/drawer";
import { type Href, router, usePathname } from "expo-router";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const menu: {
  label: string;
  path: Href;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "Tổng quan", path: "/overview", icon: "home-outline" },
  { label: "Nhóm của tôi", path: "/", icon: "people-outline" },
  { label: "Chuyến đi", path: "/trips", icon: "airplane-outline" },
  { label: "Bản đồ", path: "/maps", icon: "map-outline" },
  { label: "Hồ sơ & cài đặt", path: "/profile", icon: "person-outline" },
  {
    label: "Thông báo",
    path: "/notification",
    icon: "notifications-outline",
  },
];

export default function CustomDrawer(props: any) {
  const pathname = usePathname();
  const { user } = useUserStore();
  const { logout } = useAuthStore();
  const palette = useAppPalette();
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "T";

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
      contentContainerStyle={styles.scrollContent}
      style={[props.style, { backgroundColor: palette.surface }]}
    >
      <View style={styles.brandPanel}>
        <View style={styles.brandOrb} />
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandName}>Travel Planner</Text>
            <Text style={styles.brandTagline}>Plan less. Go more.</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Đóng menu"
            onPress={() => props.navigation.closeDrawer()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.userRow}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userCopy}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Tài khoản của bạn"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || "Khám phá hành trình mới"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.navigation}>
        <Text style={styles.kicker}>Điều hướng</Text>
        {menu.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(String(item.path)));

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => handleNavigate(item.path)}
              style={[
                styles.menuItem,
                isActive && {
                  backgroundColor: palette.primaryLight,
                  borderColor: palette.primaryLight,
                },
              ]}
            >
              <View
                style={[
                  styles.menuIcon,
                  isActive && { backgroundColor: palette.surface },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={isActive ? COLORS.primary : palette.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.menuLabel,
                  { color: palette.textPrimary },
                  isActive && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <TouchableOpacity
          onPress={() => void handleLogout()}
          style={[styles.logout, { backgroundColor: palette.errorLight }]}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutLabel}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  brandPanel: {
    minHeight: 222,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#153F35",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  brandOrb: {
    position: "absolute",
    width: 170,
    height: 170,
    right: -62,
    bottom: -88,
    borderRadius: 85,
    backgroundColor: "rgba(159,220,192,.14)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandName: {
    color: "#FFFFFF",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    fontSize: 25,
    lineHeight: 29,
  },
  brandTagline: {
    marginTop: 4,
    color: "rgba(255,255,255,.62)",
    fontSize: 10.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.1)",
  },
  userRow: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.72)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFF3E9",
  },
  avatarText: { color: COLORS.primaryDark, fontSize: 18, fontWeight: "800" },
  userCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  userName: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  userEmail: { marginTop: 4, color: "rgba(255,255,255,.62)", fontSize: 10 },
  navigation: { flex: 1, paddingHorizontal: 16, paddingTop: 22 },
  kicker: {
    marginHorizontal: 8,
    marginBottom: 10,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  menuItem: {
    minHeight: 50,
    marginBottom: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: UI_RADIUS.control,
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 12.5, fontWeight: "600" },
  menuLabelActive: { color: COLORS.primary, fontWeight: "800" },
  footer: { margin: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  logout: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: UI_RADIUS.control,
    flexDirection: "row",
    alignItems: "center",
  },
  logoutLabel: { marginLeft: 10, color: COLORS.error, fontSize: 13, fontWeight: "700" },
});
