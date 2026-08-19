import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ChatMessage, MessagePage } from "@/src/type/chat";
import { getSocket } from "@/src/utils/socket";
import { COLORS } from "@/src/utils/constants";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupCall, { type CallMedia } from "@/src/components/group/GroupCall";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function GroupChatScreen() {
  const { id, call, source } = useLocalSearchParams<{
    id: string;
    call?: string;
    source?: string;
  }>();
  const navigation = useNavigation();
  const userId = useAuthStore((state) => state.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readers, setReaders] = useState<MessagePage["readers"]>([]);
  const [groupName, setGroupName] = useState("Trò chuyện nhóm");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isHandlingNotificationBackRef = useRef(false);
  const palette = useAppPalette();
  const openedFromNotification =
    call === "audio" || call === "video" || source === "notification";

  const returnHomeFromNotification = useCallback(() => {
    if (isHandlingNotificationBackRef.current) return;
    isHandlingNotificationBackRef.current = true;

    // A notification can open this route without a usable navigation history.
    // Reset the group stack, then select the Home (groups) tab.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "index" }],
      }),
    );
    navigation.getParent()?.navigate("index");
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!openedFromNotification) return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          returnHomeFromNotification();
          return true;
        },
      );

      return () => subscription.remove();
    }, [openedFromNotification, returnHomeFromNotification]),
  );

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

  const belongsToSameGroup = (first?: ChatMessage, second?: ChatMessage) =>
    !!first &&
    !!second &&
    first.sender.id === second.sender.id &&
    Math.abs(new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()) <=
      5 * 60 * 1000;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={["bottom"]}
    >
      <CommonHeader
        title={groupName}
        fallbackHref={{ pathname: "/groups/[id]", params: { id } }}
        onBack={
          openedFromNotification ? returnHomeFromNotification : undefined
        }
        rightElement={
          id ? (
            <View style={styles.headerActions}>
              {Platform.OS === "android" && (
                <Pressable
                  accessibilityLabel="Bật bong bóng chat ngoài ứng dụng"
                  onPress={() => {
                    void NativeModules.TravelCallAudio?.openBubbleSettings?.().catch(() => undefined);
                  }}
                  style={styles.headerAction}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
                </Pressable>
              )}
              <GroupCall
                groupId={id}
                autoJoinMode={call === "audio" || call === "video" ? (call as CallMedia) : null}
              />
            </View>
          ) : null
        }
      />
      {pinned.length > 0 && (
        <View
          style={[
            styles.pinned,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
          ]}
        >
          <View style={styles.pinnedIcon}>
            <Ionicons name="pin" size={14} color={COLORS.primary} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.pinnedText, { color: palette.textPrimary }]}
          >
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
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.listEmpty,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                ]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={30}
                  color={COLORS.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Chưa có tin nhắn</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>Hãy bắt đầu cuộc trò chuyện với nhóm.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender.id === userId;
            const groupedWithPrevious = belongsToSameGroup(messages[index - 1], item);
            const groupedWithNext = belongsToSameGroup(item, messages[index + 1]);
            const firstInGroup = !groupedWithPrevious;
            const lastInGroup = !groupedWithNext;
            return (
              <Pressable
                onLongPress={() => setSelected(item)}
                style={[styles.row, groupedWithPrevious && styles.rowGrouped, mine && styles.rowMine]}
              >
                {!mine && lastInGroup &&
                  (item.sender.avatar ? (
                    <Avatar.Image size={30} source={{ uri: item.sender.avatar }} />
                  ) : (
                    <Avatar.Text size={30} label={item.sender.name?.[0] || "?"} />
                  ))}
                {!mine && !lastInGroup && <View style={styles.avatarSpacer} />}
                <View style={[styles.messageWrap, mine && styles.messageWrapMine]}>
                  {!mine && firstInGroup && (
                    <Text style={[styles.sender, { color: palette.textSecondary }]}>
                      {item.sender.name}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: palette.surfaceMuted,
                        borderColor: palette.border,
                      },
                      mine && styles.bubbleMine,
                      groupedWithPrevious && (mine ? styles.bubbleMineGroupedPrev : styles.bubbleOtherGroupedPrev),
                      groupedWithNext && (mine ? styles.bubbleMineGroupedNext : styles.bubbleOtherGroupedNext),
                    ]}
                  >
                    {item.isPinned && <Text style={styles.pin}>📌 </Text>}
                    <Text
                      style={[
                        styles.messageText,
                        { color: palette.textPrimary },
                        mine && styles.mineText,
                      ]}
                    >
                      {item.content}
                    </Text>
                  </View>
                  {!!item.reactions?.length && (
                    <View
                      style={[
                        styles.reactions,
                        { backgroundColor: palette.surface, borderColor: palette.border },
                      ]}
                    >
                      <Text style={styles.reactionText}>
                        {item.reactions.map((reaction) => reaction.emoji).join(" ")}
                      </Text>
                    </View>
                  )}
                  {lastInGroup && (
                    <Text
                      style={[
                        styles.meta,
                        { color: palette.textSecondary },
                        mine && styles.metaMine,
                      ]}
                    >
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {status(item) ? ` · ${status(item)}` : ""}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {selected && (
        <View
          style={[
            styles.actions,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => react(emoji)} style={styles.emojiButton}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
          <Pressable onPress={pin} style={styles.emojiButton}>
            <Ionicons name="pin" size={20} color={COLORS.primary} />
          </Pressable>
          <Pressable onPress={() => setSelected(null)} style={styles.emojiButton}>
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 56 : 0}
      >
        <View
          style={[
            styles.composer,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={palette.textSecondary}
            selectionColor={COLORS.primary}
            multiline
            style={[
              styles.input,
              {
                color: palette.textPrimary,
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.border,
              },
            ]}
          />
          <Pressable
            disabled={!text.trim()}
            onPress={send}
            style={[
              styles.send,
              {
                backgroundColor: text.trim()
                  ? COLORS.primary
                  : palette.surfaceMuted,
                borderColor: text.trim() ? COLORS.primary : palette.border,
              },
            ]}
          >
            <Ionicons
              name="send"
              size={19}
              color={text.trim() ? "#FFFFFF" : palette.textSecondary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerAction: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  loader: { flex: 1 },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  pinnedIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22,135,248,.14)",
  },
  pinnedText: { flex: 1, fontSize: 12, fontWeight: "600" },
  list: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 20, gap: 10 },
  listEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptySubtitle: { marginTop: 5, fontSize: 12, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowGrouped: { marginTop: -6 },
  rowMine: { justifyContent: "flex-start", flexDirection: "row-reverse" },
  avatarSpacer: { width: 30 },
  messageWrap: { maxWidth: "78%" },
  messageWrapMine: { alignItems: "flex-end" },
  sender: { fontSize: 11, marginLeft: 8, marginBottom: 3, fontWeight: "600" },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderBottomLeftRadius: 18, borderBottomRightRadius: 6 },
  bubbleMineGroupedPrev: { borderTopRightRadius: 6 },
  bubbleMineGroupedNext: { borderBottomRightRadius: 6 },
  bubbleOtherGroupedPrev: { borderTopLeftRadius: 6 },
  bubbleOtherGroupedNext: { borderBottomLeftRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 20 },
  mineText: { color: "#FFFFFF" },
  pin: { fontSize: 11 },
  reactions: { alignSelf: "flex-start", marginTop: -4, marginHorizontal: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  reactionText: { fontSize: 13 },
  meta: { fontSize: 10, marginHorizontal: 8, marginTop: 3 },
  metaMine: { textAlign: "right" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  emojiButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 22 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 9,
    fontSize: 15,
  },
  send: { width: 42, height: 42, borderRadius: 21, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
