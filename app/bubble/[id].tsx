import GroupChatPanel from "@/src/components/group/GroupChatPanel";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { useAuthStore } from "@/src/store/auth.store";
import { COLORS } from "@/src/utils/constants";
import { initSocket } from "@/src/utils/socket";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function BubbleChatScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const groupId = firstParam(params.id);
  const groupName = firstParam(params.name) || "Trò chuyện nhóm";
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const palette = useAppPalette();
  const navigation = useNavigation();
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    navigation.setOptions({ swipeEnabled: false });
  }, [navigation]);

  useEffect(() => {
    if (!accessToken || !userId) return;
    initSocket(String(userId), accessToken);
    setSocketReady(true);
  }, [accessToken, userId]);

  if (!hasHydrated) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!accessToken || !userId) return <Redirect href="/(auth)/login" />;

  if (!groupId) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.textSecondary }}>Không thể mở cuộc trò chuyện.</Text>
      </SafeAreaView>
    );
  }

  if (!socketReady) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.avatar}>
          <Ionicons name="people" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.title, { color: palette.textPrimary }]}>
            {groupName}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Tin nhắn nhóm</Text>
        </View>
        <Pressable
          accessibilityLabel="Đóng bong bóng trò chuyện"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => BackHandler.exitApp()}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={palette.textSecondary} />
        </Pressable>
      </View>

      <GroupChatPanel groupId={groupId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, marginLeft: 10 },
  title: { fontSize: 15, fontWeight: "800" },
  subtitle: { fontSize: 10, marginTop: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.55 },
});
