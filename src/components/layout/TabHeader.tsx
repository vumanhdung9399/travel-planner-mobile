import { View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { DrawerActions, useNavigation } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import { useAppPalette } from "@/src/hook/useAppPalette";

export default function TabHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  const router = useRouter();
  const palette = useAppPalette();
  return <View style={{ height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }}>
    <IconButton icon="menu" accessibilityLabel="Mở menu" size={20} style={{ backgroundColor: palette.surfaceMuted }} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
    <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", marginLeft: 8 }}>{title}</Text>
    <IconButton icon="bell-outline" accessibilityLabel="Mở thông báo" size={20} style={{ backgroundColor: palette.surfaceMuted }} onPress={() => router.push("/notification")} />
  </View>;
}
