import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ChatMessage, MessagePage } from "@/src/type/chat";
import { getSocket } from "@/src/utils/socket";
import { COLORS } from "@/src/utils/constants";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function GroupChatPanel({ groupId }: { groupId: string }) {
  const userId = useAuthStore((state) => state.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readers, setReaders] = useState<MessagePage["readers"]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const palette = useAppPalette();

  const load = useCallback(
    async (markAsRead = false) => {
      try {
        const page = await api.get<MessagePage>(
          `/chat/groups/${groupId}/messages`,
          { params: { limit: 100 } },
        );
        setMessages(page.data.data || []);
        setReaders(page.data.readers || []);
        setLoadError(null);
        if (markAsRead) {
          await api.patch(`/chat/groups/${groupId}/read`).catch(() => undefined);
        }
      } catch {
        setLoadError("Không thể tải tin nhắn. Vui lòng kiểm tra mạng và thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    void load(true);
    const socket = getSocket();
    const refresh = () => void load(false);
    socket?.on("chat:message", refresh);
    socket?.on("chat:reaction", refresh);
    socket?.on("chat:pin", refresh);
    socket?.on("chat:read", refresh);
    return () => {
      socket?.off("chat:message", refresh);
      socket?.off("chat:reaction", refresh);
      socket?.off("chat:pin", refresh);
      socket?.off("chat:read", refresh);
    };
  }, [load]);

  const pinned = useMemo(
    () => messages.filter((message) => message.isPinned),
    [messages],
  );
  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    await api.post(`/chat/groups/${groupId}/messages`, { content });
    await load(true);
  };
  const react = async (emoji: string) => {
    if (!selected) return;
    await api.post(`/chat/messages/${selected.id}/reactions`, { emoji });
    setSelected(null);
    await load(false);
  };
  const pin = async () => {
    if (!selected) return;
    await api.patch(`/chat/messages/${selected.id}/pin`);
    setSelected(null);
    await load(false);
  };
  const status = (message: ChatMessage) =>
    message.sender.id === userId &&
    readers.some(
      (reader) =>
        reader.user.id !== userId &&
        reader.lastReadAt &&
        new Date(reader.lastReadAt) >= new Date(message.createdAt),
    )
      ? "Đã xem"
      : message.sender.id === userId
        ? "Đã gửi"
        : "";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {pinned.length > 0 && (
        <View style={[styles.pinned, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
          <View style={styles.pinnedIcon}>
            <Ionicons name="pin" size={13} color={COLORS.primary} />
          </View>
          <Text numberOfLines={1} style={[styles.pinnedText, { color: palette.textPrimary }]}>
            {pinned[pinned.length - 1].content}
          </Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ backgroundColor: palette.background }}
          contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                <Ionicons name="chatbubbles-outline" size={26} color={COLORS.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
                {loadError ? "Không tải được tin nhắn" : "Chưa có tin nhắn"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
                {loadError || "Bắt đầu trò chuyện với nhóm."}
              </Text>
              {loadError && (
                <Pressable
                  onPress={() => {
                    setLoading(true);
                    void load(true);
                  }}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.sender.id === userId;
            return (
              <Pressable
                onLongPress={() => setSelected(item)}
                style={[styles.row, mine && styles.rowMine]}
              >
                {!mine &&
                  (item.sender.avatar ? (
                    <Avatar.Image size={28} source={{ uri: item.sender.avatar }} />
                  ) : (
                    <Avatar.Text size={28} label={item.sender.name?.[0] || "?"} />
                  ))}
                <View style={[styles.messageWrap, mine && styles.messageWrapMine]}>
                  {!mine && <Text style={[styles.sender, { color: palette.textSecondary }]}>{item.sender.name}</Text>}
                  <View style={[styles.bubble, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }, mine && styles.bubbleMine]}>
                    <Text style={[styles.messageText, { color: palette.textPrimary }, mine && styles.mineText]}>
                      {item.isPinned ? "📌 " : ""}
                      {item.content}
                    </Text>
                  </View>
                  {!!item.reactions?.length && (
                    <View style={[styles.reactions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                      <Text style={styles.reactionText}>{item.reactions.map((reaction) => reaction.emoji).join(" ")}</Text>
                    </View>
                  )}
                  <Text style={[styles.meta, { color: palette.textSecondary }, mine && styles.metaMine]}>
                    {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {status(item) ? ` · ${status(item)}` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {selected && (
        <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => void react(emoji)} style={styles.emojiButton}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => void pin()} style={styles.emojiButton}>
            <Ionicons name="pin" size={19} color={COLORS.primary} />
          </Pressable>
          <Pressable onPress={() => setSelected(null)} style={styles.emojiButton}>
            <Ionicons name="close" size={19} color={palette.textSecondary} />
          </Pressable>
        </View>
      )}
      <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={palette.textSecondary}
          selectionColor={COLORS.primary}
          multiline
          style={[styles.input, { color: palette.textPrimary, backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
        />
        <Pressable
          disabled={!text.trim()}
          onPress={() => void send()}
          style={[
            styles.send,
            {
              backgroundColor: text.trim() ? COLORS.primary : palette.surfaceMuted,
              borderColor: text.trim() ? COLORS.primary : palette.border,
            },
          ]}
        >
          <Ionicons name="send" size={18} color={text.trim() ? "#FFFFFF" : palette.textSecondary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  pinned: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 9, marginTop: 8, paddingHorizontal: 9, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  pinnedIcon: { width: 25, height: 25, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(22,135,248,.14)" },
  pinnedText: { flex: 1, fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 16, gap: 9 },
  listEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  emptyTitle: { fontSize: 14, fontWeight: "800" },
  emptySubtitle: { fontSize: 11, marginTop: 4, textAlign: "center" },
  retryButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.primary },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  rowMine: { flexDirection: "row-reverse" },
  messageWrap: { maxWidth: "80%" },
  messageWrapMine: { alignItems: "flex-end" },
  sender: { fontSize: 10, marginLeft: 8, marginBottom: 3, fontWeight: "600" },
  bubble: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, borderBottomLeftRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderBottomLeftRadius: 17, borderBottomRightRadius: 6 },
  messageText: { fontSize: 14, lineHeight: 19 },
  mineText: { color: "#FFFFFF" },
  reactions: { alignSelf: "flex-start", marginTop: -4, marginHorizontal: 7, paddingHorizontal: 6, paddingVertical: 2, borderWidth: StyleSheet.hairlineWidth, borderRadius: 9 },
  reactionText: { fontSize: 12 },
  meta: { fontSize: 9, marginHorizontal: 8, marginTop: 3 },
  metaMine: { textAlign: "right" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 8, marginBottom: 6, paddingHorizontal: 6, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  emojiButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 7, paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 39, maxHeight: 90, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8, fontSize: 14 },
  send: { width: 39, height: 39, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
