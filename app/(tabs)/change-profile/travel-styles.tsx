import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { useUserStore } from "@/src/store/user.store";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { TRAVEL_STYLE_OPTIONS } from "@/src/utils/travelOptions";
import { api } from "@/src/services/api";
import { AppToast } from "@/src/components/AppToast";
import type { UserProfile } from "@/src/type/user";

export default function TravelStylesScreen() {
  const { user, setUser } = useUserStore();
  const palette = useAppPalette();
  const [selected, setSelected] = useState<string[]>(user?.travelStyles || []);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(selected) !== JSON.stringify(user?.travelStyles || []);
  const toggle = (value: string) => {
    if (selected.includes(value)) setSelected(selected.filter((item) => item !== value));
    else if (selected.length < 6) setSelected([...selected, value]);
    else AppToast.show({ type: "info", title: "Giới hạn lựa chọn", message: "Bạn có thể chọn tối đa 6 phong cách" });
  };
  const save = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const response = await api.patch<{ data: UserProfile }>("/users/me", { travelStyles: selected });
      setUser({ ...user, ...response.data.data, travelStyles: selected });
      AppToast.show({ type: "success", title: "Thành công", message: "Đã cập nhật phong cách du lịch" });
    } catch { /* The API interceptor displays request errors. */ }
    finally { setSaving(false); }
  };
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <CommonHeader title="Phong cách du lịch" />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={{ padding: 16, backgroundColor: palette.primaryLight, borderRadius: 16, marginBottom: 12 }}><Text style={{ fontSize: 16, fontWeight: "800" }}>Bạn thích chuyến đi như thế nào?</Text><Text style={{ fontSize: 11.5, lineHeight: 18, marginTop: 4, color: palette.textSecondary }}>Chọn tối đa 6 phong cách. AI sẽ kết hợp lựa chọn của từng thành viên để tạo lịch trình cân bằng hơn.</Text></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{TRAVEL_STYLE_OPTIONS.map((option) => <Pressable key={option.value} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(option.value), disabled: saving }} accessibilityLabel={option.label} onPress={() => toggle(option.value)} style={{ width: "48%", flexGrow: 1, minHeight: 86, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: selected.includes(option.value) ? "#176B59" : palette.border, backgroundColor: selected.includes(option.value) ? palette.primaryLight : palette.surface }}><Text style={{ fontSize: 23 }}>{option.icon}</Text><Text style={{ fontWeight: "800", fontSize: 12, marginTop: 6 }}>{option.label}{selected.includes(option.value) ? " ✓" : ""}</Text></Pressable>)}</View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 }}><Text>Đã chọn {selected.length}/6</Text><Button disabled={saving || !selected.length} onPress={() => setSelected([])}>Bỏ chọn tất cả</Button></View>
      <Button mode="contained" loading={saving} disabled={!dirty || saving || !user} onPress={save}>Lưu phong cách du lịch</Button>
    </ScrollView>
  </View>;
}
