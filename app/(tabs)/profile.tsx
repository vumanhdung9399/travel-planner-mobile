import { useState } from "react";
import { ImageBackground, ScrollView, View } from "react-native";
import { Avatar, Button, Chip, Dialog, IconButton, List, Portal, Switch, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { useSettingsStore } from "@/src/store/settings.store";
import { useUserStore } from "@/src/store/user.store";
import { useAuthStore } from "@/src/store/auth.store";
import { api } from "@/src/services/api";
import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import { PageKicker, PageTitle, SectionTitle } from "@/src/components/ui/AppTypography";
import { TRAVEL_STYLE_OPTIONS } from "@/src/utils/travelOptions";

export default function ProfileScreen() {
  const palette = useAppPalette();
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSettingsStore();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await removeCurrentDeviceToken(); } catch { /* Continue local logout. */ }
    try { await api.post("/auth/logout"); } finally { logout(); router.replace("/login"); setLoggingOut(false); }
  };
  const card = { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 12, overflow: "hidden" as const };
  const listItemStyle = { paddingHorizontal: 16, paddingVertical: 6 };
  const row = (icon: string, title: string, description: string, onPress?: () => void, danger = false) => <List.Item title={title} description={description} onPress={onPress} titleStyle={{ fontSize: 12, fontWeight: "800", color: danger ? palette.error : palette.textPrimary }} descriptionStyle={{ fontSize: 9.5, marginTop: 2 }} style={[listItemStyle, { borderBottomWidth: 0.5, borderBottomColor: palette.border }]} left={() => <List.Icon icon={icon} color={danger ? palette.error : palette.primary} />} right={() => <List.Icon icon="chevron-right" color={palette.textLight} />} />;
  const section = (kicker: string, title: string) => <View style={{ marginTop: 22, marginBottom: 8 }}><PageKicker>{kicker}</PageKicker><SectionTitle style={{ marginTop: 3 }}>{title}</SectionTitle></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}>
    <PageKicker>Không gian của bạn</PageKicker><PageTitle style={{ marginTop: 6 }}>Hồ sơ & cài đặt</PageTitle>
    <View style={[card, { padding: 16, marginTop: 18, borderRadius: 16 }]}>
      <ImageBackground source={require("@/assets/images/trip-hero-cao-bang.webp")} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 85 }} imageStyle={{ opacity: 0.3 }} />
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 64, gap: 12 }}>
        <View style={{ borderWidth: 4, borderColor: palette.surface, borderRadius: 42 }}>{user?.avatar ? <Avatar.Image size={68} source={{ uri: user.avatar }} /> : <Avatar.Text size={68} label={user?.name?.[0] || "?"} />}</View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text numberOfLines={1} style={{ fontSize: 18, lineHeight: 24, fontWeight: "800" }}>{user?.name || "Tài khoản của bạn"}</Text><Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 18, color: palette.textSecondary }}>{user?.email}</Text></View>
        <IconButton icon="pencil-outline" accessibilityLabel="Chỉnh sửa hồ sơ" onPress={() => router.push("/change-profile/edit")} style={{ margin: 0, flexShrink: 0, backgroundColor: palette.surfaceMuted, borderRadius: 10 }} />
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: palette.border, marginTop: 14, paddingTop: 13 }}>{[{ label: "Chuyến đi", value: user?.stats?.trips }, { label: "Ngày khám phá", value: user?.stats?.timelines }, { label: "Nhóm", value: user?.stats?.groups }].map((item) => <View key={item.label} style={{ flex: 1, alignItems: "center" }}><Text style={{ fontSize: 20, fontWeight: "800" }}>{item.value ?? 0}</Text><Text style={{ fontSize: 10, color: palette.textSecondary }}>{item.label}</Text></View>)}</View>
    </View>
    <View style={[card, { padding: 12, marginTop: 10 }]}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><PageKicker>Phong cách du lịch</PageKicker><Button compact icon="pencil-outline" onPress={() => router.push("/change-profile/travel-styles")}>Chỉnh sửa</Button></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{user?.travelStyles?.length ? user.travelStyles.map((style) => { const option = TRAVEL_STYLE_OPTIONS.find((item) => item.value === style); return <Chip key={style} style={{ backgroundColor: palette.primaryLight }} textStyle={{ fontSize: 10.5 }}>{option?.icon || "✦"} {option?.label || style}</Chip>; }) : <Text style={{ fontSize: 11.5, color: palette.textSecondary }}>Chưa chọn phong cách. Cập nhật để AI gợi ý lịch trình phù hợp hơn.</Text>}</View></View>
    {section("Tài khoản", "Thông tin cá nhân")}
    <View style={card}>
      {row("account-outline", "Hồ sơ cá nhân", "Tên, số điện thoại và tài khoản ngân hàng", () => router.push("/change-profile/edit"))}
      {row("compass-outline", "Phong cách du lịch", "Sở thích dùng để cá nhân hoá lịch trình AI", () => router.push("/change-profile/travel-styles"))}
      {row("lock-outline", "Mật khẩu & bảo mật", "Cập nhật mật khẩu của bạn", () => router.push("/change-profile/change-password"))}
    </View>
    {section("Trải nghiệm", "Tuỳ chọn ứng dụng")}
    <View style={card}>
      <List.Item style={listItemStyle} title="Thông báo đẩy" description="Nhắc lịch trình, công việc và chi phí" titleStyle={{ fontSize: 12, fontWeight: "800" }} descriptionStyle={{ fontSize: 9.5 }} left={() => <List.Icon icon="bell-outline" color={palette.primary} />} right={() => <Switch value={settings.notificationsEnabled} onValueChange={settings.setNotificationsEnabled} />} />
      <List.Item style={listItemStyle} title="Giao diện tối" description={settings.darkMode ? "Đang dùng giao diện tối" : "Theo giao diện sáng"} titleStyle={{ fontSize: 12, fontWeight: "800" }} descriptionStyle={{ fontSize: 9.5 }} left={() => <List.Icon icon="weather-night" color={palette.primary} />} right={() => <Switch value={settings.darkMode} onValueChange={settings.setDarkMode} />} />
      {row("cloud-download-outline", "Dữ liệu offline", "Quản lý chuyến đi đã tải xuống")}
    </View>
    {section("Hỗ trợ", "Thông tin & trợ giúp")}
    <View style={card}>
      {row("information-outline", "Về Travel Planner", "Phiên bản 2.0 · Điều khoản & chính sách", () => setAboutOpen(true))}
      {row("help-circle-outline", "Trung tâm trợ giúp", "Câu hỏi thường gặp và liên hệ hỗ trợ")}
      {row("logout", loggingOut ? "Đang đăng xuất..." : "Đăng xuất", "Rời khỏi tài khoản trên thiết bị này", () => { void handleLogout(); }, true)}
    </View>
    <Portal><Dialog visible={aboutOpen} onDismiss={() => setAboutOpen(false)} style={{ backgroundColor: palette.surface }}><Dialog.Title>Travel Planner</Dialog.Title><Dialog.Content><PageKicker>Plan less · Go more</PageKicker><Text style={{ fontFamily: "DMSerifDisplay", fontSize: 30, marginVertical: 12 }}>Mọi hành trình, một nơi duy nhất.</Text><Text>Lên kế hoạch, chia sẻ lịch trình và cân đối chi phí cho mọi chuyến đi trong một nơi.</Text><Text style={{ marginTop: 16 }}>Lập nhóm · Lịch trình · Chia chi phí</Text></Dialog.Content><Dialog.Actions><Button onPress={() => setAboutOpen(false)}>Đóng</Button></Dialog.Actions></Dialog></Portal>
  </ScrollView>;
}