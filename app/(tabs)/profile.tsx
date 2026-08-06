import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@store/user.store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/src/services/api";
import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettingsStore } from "@/src/store/settings.store";
import { useMemo } from "react";

export default function ProfileScreen() {
  const { user } = useUserStore();
  const { logout } = useAuthStore();
  const router = useRouter();
  const { notificationsEnabled, darkMode, setNotificationsEnabled, setDarkMode } = useSettingsStore();
  const colors = useMemo(() => getAppColors(darkMode), [darkMode]);

  const handleLogout = async () => {
    try {
      await removeCurrentDeviceToken();
      await api.post("/auth/logout");
    } finally {
      logout();
      router.replace("/login");
    }
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Tài khoản</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}> 
        <ImageBackground
          source={require("@/assets/images/trip-hero-cao-bang.png")}
          style={styles.cover}
          imageStyle={styles.coverImage}
        >
          <LinearGradient
            colors={["rgba(7,94,158,.28)", "rgba(3,22,38,.58)"]}
            style={styles.coverOverlay}
          >
            <Ionicons name="airplane" size={28} color="rgba(255,255,255,.88)" />
          </LinearGradient>
        </ImageBackground>

        <View style={styles.identity}>
          <Image
            source={
              user.avatar
                ? { uri: user.avatar }
                : require("@/assets/avatar-default.svg")
            }
            style={styles.avatar}
          />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user.name}</Text>
        </View>
      </View>

      <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <StatItem
            icon="airplane-outline"
            label="Chuyến đi"
            value={user.stats?.trips}
          />
          <StatItem
            icon="people-outline"
            label="Nhóm"
            value={user.stats?.groups}
          />
          <StatItem
            icon="wallet-outline"
            label="Khoản chi"
            value={user.stats?.expenses}
          />
      </View>

      <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <MenuItem
          icon="create-outline"
          text="Chỉnh sửa"
          onPress={() => router.push("/change-profile/edit")}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          text="Cài đặt & bảo mật"
          onPress={() => router.push("/change-profile/change-password")}
          last
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TUỲ CHỌN ỨNG DỤNG</Text>
      <View style={[styles.menuCard, styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <SettingItem
          icon="notifications-outline"
          text="Thông báo"
          description="Âm thanh và thông báo mới"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <SettingItem
          icon="moon-outline"
          text="Chế độ tối"
          description="Dịu mắt hơn khi dùng ban đêm"
          value={darkMode}
          onValueChange={setDarkMode}
          last
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: number;
}) {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const colors = getAppColors(darkMode);
  return (
    <View style={styles.statItem}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={COLORS.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value || 0}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  text,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  last?: boolean;
}) {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const colors = getAppColors(darkMode);
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }, last && styles.menuItemLast]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={[styles.menuText, { color: colors.textPrimary }]}>{text}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function SettingItem({ icon, text, description, value, onValueChange, last }: {
  icon: keyof typeof Ionicons.glyphMap; text: string; description: string;
  value: boolean; onValueChange: (value: boolean) => void; last?: boolean;
}) {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const colors = getAppColors(darkMode);
  return (
    <View style={[styles.menuItem, { borderBottomColor: colors.border }, last && styles.menuItemLast]}>
      <View style={styles.menuIcon}><Ionicons name={icon} size={20} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuText, { color: colors.textPrimary }]}>{text}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: COLORS.primary }} thumbColor="#FFFFFF" />
    </View>
  );
}

const getAppColors = (darkMode: boolean) => ({
  background: darkMode ? "#0B1220" : COLORS.surface,
  surface: darkMode ? "#141E2E" : COLORS.surface,
  border: darkMode ? "#2A384C" : COLORS.border,
  textPrimary: darkMode ? "#F2F6FC" : COLORS.textPrimary,
  textSecondary: darkMode ? "#A9B7CA" : COLORS.textSecondary,
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: 36 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.textPrimary },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileCard: { backgroundColor: COLORS.surface },
  cover: {
    height: 188,
    overflow: "hidden",
  },
  coverImage: {},
  coverOverlay: { flex: 1, padding: 18, alignItems: "flex-end" },
  sun: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    left: 28,
    top: 18,
    backgroundColor: "rgba(255,245,223,.42)",
  },
  wave: {
    position: "absolute",
    width: "125%",
    height: 80,
    borderRadius: 80,
    left: -20,
    bottom: -55,
    backgroundColor: "rgba(255,255,255,.18)",
  },
  identity: { alignItems: "center", paddingHorizontal: 16 },
  avatar: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 4,
    borderColor: COLORS.surface,
    marginTop: -49,
    backgroundColor: COLORS.surfaceMuted,
  },
  name: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  email: { marginTop: 3, fontSize: 13, color: COLORS.textSecondary },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    marginBottom: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  statLabel: { marginTop: 2, fontSize: 11, color: COLORS.textSecondary },
  actions: { flexDirection: "row", gap: 10, padding: 16 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI_RADIUS.control,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  outlineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI_RADIUS.control,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { color: COLORS.primary, fontWeight: "700" },
  menuCard: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: UI_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsCard: { marginTop: 6 },
  sectionLabel: { marginTop: 18, marginHorizontal: 20, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  menuItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  logoutButton: {
    minHeight: 50,
    marginTop: 16,
    borderRadius: UI_RADIUS.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.errorLight,
  },
  logoutText: { color: COLORS.error, fontWeight: "700" },
});
