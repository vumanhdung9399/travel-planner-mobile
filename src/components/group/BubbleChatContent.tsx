import { useAppPalette } from "@/src/hook/useAppPalette";
import { useChatBubblePermissions } from "@/src/hook/useChatBubblePermissions";
import { useAuthStore } from "@/src/store/auth.store";
import { initSocket } from "@/src/utils/socket";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupChatPanel from "./GroupChatPanel";

type Props = {
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
};

export default function BubbleChatContent({
  groupId,
  groupName = "Trò chuyện nhóm",
  groupAvatar,
}: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const palette = useAppPalette();
  const [socketReady, setSocketReady] = useState(false);

  useChatBubblePermissions();

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

  if (!accessToken || !userId) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <Ionicons name="lock-closed-outline" size={30} color={COLORS.primary} />
        <Text style={[styles.stateTitle, { color: palette.textPrimary }]}>Phiên đăng nhập đã hết hạn</Text>
        <Text style={[styles.stateText, { color: palette.textSecondary }]}>
          Mở ứng dụng và đăng nhập lại để xem tin nhắn.
        </Text>
      </SafeAreaView>
    );
  }

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
        {groupAvatar ? (
          <Avatar.Image size={36} source={{ uri: groupAvatar }} />
        ) : (
          <View style={styles.avatar}>
            <Ionicons name="people" size={18} color="#FFFFFF" />
          </View>
        )}
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
  stateTitle: { marginTop: 12, fontSize: 16, fontWeight: "800" },
  stateText: { maxWidth: 300, marginTop: 6, textAlign: "center", fontSize: 13 },
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
