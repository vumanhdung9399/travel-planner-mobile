import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ChatMessage, MessagePage } from "@/src/type/chat";
import { getSocket } from "@/src/utils/socket";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readers, setReaders] = useState<MessagePage["readers"]>([]);
  const [groupName, setGroupName] = useState("Trò chuyện nhóm");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(
    async (markAsRead = false) => {
      if (!id) return;
      try {
        const [conversation, page] = await Promise.all([
          api.get(`/chat/groups/${id}`),
          api.get<MessagePage>(`/chat/groups/${id}/messages`, {
            params: { limit: 100 },
          }),
        ]);
        setGroupName((conversation.data as any)?.group?.name || "Trò chuyện nhóm");
        setMessages(page.data.data || []);
        setReaders(page.data.readers || []);
        if (markAsRead) await api.patch(`/chat/groups/${id}/read`);
      } finally {
        setLoading(false);
      }
    },
    [id],
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
    if (!id || !content) return;
    setText("");
    await api.post(`/chat/groups/${id}/messages`, { content });
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

  const status = (message: ChatMessage) => {
    if (message.sender.id !== userId) return "";
    return readers.some(
      (reader) =>
        reader.user.id !== userId &&
        reader.lastReadAt &&
        new Date(reader.lastReadAt) >= new Date(message.createdAt),
    )
      ? "Đã xem"
      : "Đã gửi";
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <CommonHeader
        title={groupName}
        fallbackHref={{ pathname: "/groups/[id]", params: { id } }}
      />
      {pinned.length > 0 && (
        <View style={styles.pinned}>
          <Ionicons name="pin-outline" size={18} color="#2563eb" />
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
                    <Avatar.Image size={30} source={{ uri: item.sender.avatar }} />
                  ) : (
                    <Avatar.Text size={30} label={item.sender.name?.[0] || "?"} />
                  ))}
                <View style={styles.messageWrap}>
                  {!mine && <Text style={styles.sender}>{item.sender.name}</Text>}
                  <View style={[styles.bubble, mine && styles.bubbleMine]}>
                    {item.isPinned && <Text style={styles.pin}>📌 </Text>}
                    <Text style={mine ? styles.mineText : undefined}>
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
            <Pressable key={emoji} onPress={() => react(emoji)}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
          <Pressable onPress={pin}>
            <Ionicons name="pin" size={22} color="#2563eb" />
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            multiline
            style={styles.input}
          />
          <Pressable disabled={!text.trim()} onPress={send} style={styles.send}>
            <Ionicons name="send" size={22} color={text.trim() ? "#2563eb" : "#94a3b8"} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1 },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#eff6ff",
  },
  pinnedText: { flex: 1 },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowMine: { justifyContent: "flex-start", flexDirection: "row-reverse" },
  messageWrap: { maxWidth: "78%" },
  sender: { fontSize: 11, color: "#64748b", marginLeft: 8 },
  bubble: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleMine: { backgroundColor: "#2563eb" },
  mineText: { color: "#fff" },
  pin: { fontSize: 11 },
  reactions: { fontSize: 13, marginHorizontal: 6 },
  meta: { fontSize: 9, color: "#94a3b8", marginHorizontal: 8 },
  metaMine: { textAlign: "right" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  emoji: { fontSize: 22 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  send: { padding: 10 },
});
