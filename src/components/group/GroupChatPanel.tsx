import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ChatMessage, MessagePage } from "@/src/type/chat";
import { getSocket } from "@/src/utils/socket";
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
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(
    async (markAsRead = false) => {
      const page = await api.get<MessagePage>(
        `/chat/groups/${groupId}/messages`,
        { params: { limit: 100 } },
      );
      setMessages(page.data.data || []);
      setReaders(page.data.readers || []);
      if (markAsRead) await api.patch(`/chat/groups/${groupId}/read`);
      setLoading(false);
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {pinned.length > 0 && (
        <View style={styles.pinned}>
          <Ionicons name="pin-outline" size={16} color="#2563eb" />
          <Text numberOfLines={1} style={styles.pinnedText}>
            {pinned[pinned.length - 1].content}
          </Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
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
                <View style={styles.messageWrap}>
                  {!mine && <Text style={styles.sender}>{item.sender.name}</Text>}
                  <View style={[styles.bubble, mine && styles.bubbleMine]}>
                    <Text style={mine ? styles.mineText : undefined}>
                      {item.isPinned ? "📌 " : ""}
                      {item.content}
                    </Text>
                  </View>
                  {!!item.reactions?.length && (
                    <Text style={styles.reactions}>
                      {item.reactions.map((reaction) => reaction.emoji).join(" ")}
                    </Text>
                  )}
                  <Text style={[styles.meta, mine && styles.metaMine]}>
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
        <View style={styles.actions}>
          {EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => void react(emoji)}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => void pin()}>
            <Ionicons name="pin" size={20} color="#2563eb" />
          </Pressable>
        </View>
      )}
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          multiline
          style={styles.input}
        />
        <Pressable disabled={!text.trim()} onPress={() => void send()} style={styles.send}>
          <Ionicons name="send" size={21} color={text.trim() ? "#0084ff" : "#94a3b8"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1 },
  pinned: { flexDirection: "row", alignItems: "center", gap: 8, padding: 9, backgroundColor: "#eff6ff" },
  pinnedText: { flex: 1, fontSize: 12 },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  rowMine: { flexDirection: "row-reverse" },
  messageWrap: { maxWidth: "80%" },
  sender: { fontSize: 10, color: "#64748b", marginLeft: 8 },
  bubble: { backgroundColor: "#e4e6eb", borderRadius: 17, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: "#0084ff" },
  mineText: { color: "#fff" },
  reactions: { fontSize: 12, marginHorizontal: 6 },
  meta: { fontSize: 9, color: "#94a3b8", marginHorizontal: 8 },
  metaMine: { textAlign: "right" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 8, borderTopWidth: 1, borderColor: "#e2e8f0" },
  emoji: { fontSize: 20 },
  composer: { flexDirection: "row", alignItems: "flex-end", padding: 9, borderTopWidth: 1, borderColor: "#e2e8f0" },
  input: { flex: 1, maxHeight: 90, backgroundColor: "#f1f5f9", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  send: { padding: 9 },
});
