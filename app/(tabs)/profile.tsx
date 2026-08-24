import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@store/user.store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/src/services/api";
import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker, PageTitle, SectionTitle } from "@/src/components/ui/AppTypography";
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

export default function ProfileScreen() {
  const { user } = useUserStore();
  const { logout } = useAuthStore();
  const router = useRouter();
  const { notificationsEnabled, darkMode, setNotificationsEnabled, setDarkMode } = useSettingsStore();
  const palette = useAppPalette();

  const handleLogout = async () => {
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

  if (!user) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <View>
          <PageKicker>Không gian của bạn</PageKicker>
          <PageTitle style={styles.pageTitle}>Hồ sơ & cài đặt</PageTitle>
        </View>
      </View>

      <View
        style={[
          styles.profileCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <ImageBackground
          source={require("@/assets/images/trip-hero-cao-bang.png")}
          style={styles.cover}
          imageStyle={styles.coverImage}
        >
          <LinearGradient
            colors={["rgba(15,81,68,.88)", "rgba(23,107,89,.5)"]}
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
            style={[
              styles.avatar,
              {
                borderColor: palette.surface,
                backgroundColor: palette.surfaceMuted,
              },
            ]}
          />
          <View style={styles.identityCopy}>
            <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>{user.name}</Text>
            <Text style={[styles.email, { color: palette.textSecondary }]} numberOfLines={1}>{user.email}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Chỉnh sửa hồ sơ"
            onPress={() => router.push("/change-profile/edit")}
            style={[styles.editButton, { backgroundColor: palette.surfaceMuted }]}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.stats,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
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

      <View
        style={[
          styles.menuCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
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

      <View style={styles.sectionHeading}>
        <PageKicker>Trải nghiệm</PageKicker>
        <SectionTitle style={styles.sectionTitle}>Tuỳ chọn ứng dụng</SectionTitle>
      </View>
      <View
        style={[
          styles.menuCard,
          styles.settingsCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
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

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: palette.errorLight }]}
        onPress={handleLogout}
      >
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
  const palette = useAppPalette();
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: palette.primaryLight }]}>
        <Ionicons name={icon} size={17} color={COLORS.primary} />
      </View>
      <Text style={[styles.statValue, { color: palette.textPrimary }]}>{value || 0}</Text>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
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
  const palette = useAppPalette();
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: palette.border },
        last && styles.menuItemLast,
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: palette.primaryLight }]}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={[styles.menuText, { color: palette.textPrimary }]}>{text}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={palette.textSecondary}
      />
    </TouchableOpacity>
  );
}

function SettingItem({ icon, text, description, value, onValueChange, last }: {
  icon: keyof typeof Ionicons.glyphMap; text: string; description: string;
  value: boolean; onValueChange: (value: boolean) => void; last?: boolean;
}) {
  const palette = useAppPalette();
  return (
    <View
      style={[
        styles.menuItem,
        styles.settingItem,
        { borderBottomColor: palette.border },
        last && styles.menuItemLast,
      ]}
    >
      <View
        style={[styles.menuIcon, { backgroundColor: palette.primaryLight }]}
      >
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuText, { color: palette.textPrimary }]}>{text}</Text>
        <Text
          style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: COLORS.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

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
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pageTitle: { marginTop: 4 },
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
  profileCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: UI_RADIUS.card,
  },
  cover: {
    height: 86,
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
  identity: {
    minHeight: 102,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.surface,
    marginTop: -30,
    backgroundColor: COLORS.surfaceMuted,
  },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 12, paddingTop: 10 },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  email: { marginTop: 3, fontSize: 10.5, color: COLORS.textSecondary },
  editButton: {
    width: 38,
    height: 38,
    marginTop: 10,
    marginLeft: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
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
  sectionHeading: { marginTop: 24, marginHorizontal: 20 },
  sectionTitle: { marginTop: 3 },
  menuItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  settingItem: { paddingVertical: 10 },
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
    marginHorizontal: 16,
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
