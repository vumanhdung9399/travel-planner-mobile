import { api } from "@/src/services/api";
import { getSocket } from "@/src/utils/socket";
import { COLORS } from "@/src/utils/constants";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { useGroupChatWidgetStore } from "@/src/store/group-chat-widget.store";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, NativeModules, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Badge, Text } from "react-native-paper";
import GroupChatPanel from "./GroupChatPanel";
import GroupCall from "./GroupCall";

export default function GroupChatFab({
  groupId,
  side = "right",
  minimizedBottom = 12,
}: {
  groupId: string;
  side?: "left" | "right";
  minimizedBottom?: number;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const activeGroupId = useGroupChatWidgetStore((state) => state.activeGroupId);
  const storedOpen = useGroupChatWidgetStore((state) => state.open);
  const storedMinimized = useGroupChatWidgetStore((state) => state.minimized);
  const activateGroup = useGroupChatWidgetStore((state) => state.activateGroup);
  const openChat = useGroupChatWidgetStore((state) => state.openChat);
  const closeChat = useGroupChatWidgetStore((state) => state.closeChat);
  const setMinimized = useGroupChatWidgetStore((state) => state.setMinimized);
  const palette = useAppPalette();
  const isActiveGroup = activeGroupId === groupId;
  const open = isActiveGroup && storedOpen;
  const minimized = isActiveGroup && storedMinimized;

  useEffect(() => {
    activateGroup(groupId);
  }, [activateGroup, groupId]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = async () => {
      try {
        const response = await api.get<{ unreadCount: number }>(
          `/chat/groups/${groupId}`,
        );
        setUnreadCount(response.data.unreadCount || 0);
      } catch {}
    };
    const onNotification = (payload: any) => {
      if (payload?.groupId === groupId) setUnreadCount((count) => count + 1);
    };
    const onRead = (payload: any) => {
      if (payload?.groupId === groupId) void refresh();
    };
    void refresh();
    socket?.on("chat:notification", onNotification);
    socket?.on("chat:read", onRead);
    return () => {
      socket?.off("chat:notification", onNotification);
      socket?.off("chat:read", onRead);
    };
  }, [groupId]);

  return (<>
    {!open && <TouchableOpacity
      style={[
        styles.fab,
        side === "left" ? styles.fabLeft : styles.fabRight,
      ]}
      activeOpacity={0.85}
      accessibilityLabel="Mở trò chuyện nhóm"
      onPress={() => {
        setUnreadCount(0);
        openChat(groupId);
      }}
    >
      <View>
        <Ionicons name="chatbubble-outline" size={25} color="#fff" />
        {unreadCount > 0 && (
          <Badge style={styles.badge} size={22}>
            {Math.min(unreadCount, 99)}
          </Badge>
        )}
      </View>
    </TouchableOpacity>}
    <Modal visible={open && !minimized} transparent animationType="fade" onRequestClose={closeChat}>
      <Pressable style={styles.overlay} onPress={closeChat} />
      <View
        style={[
          styles.chatWindow,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Pressable
          style={[
            styles.chatHeader,
            { backgroundColor: palette.surface, borderBottomColor: palette.border },
          ]}
          onPress={() => setMinimized(false)}
        >
          <View style={[styles.chatAvatar, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
            <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
            <View style={[styles.onlineDot, { borderColor: palette.surface }]} />
          </View>
          <View style={styles.chatHeading}>
            <Text numberOfLines={1} style={[styles.chatTitle, { color: palette.textPrimary }]}>Trò chuyện nhóm</Text>
            <Text numberOfLines={1} style={[styles.chatSubtitle, { color: palette.textSecondary }]}>Tin nhắn của nhóm</Text>
          </View>
          {Platform.OS === "android" && (
            <TouchableOpacity
              accessibilityLabel="Bật bong bóng chat ngoài ứng dụng"
              style={[styles.headerIcon, { backgroundColor: palette.surfaceMuted }]}
              onPress={() => {
                void NativeModules.TravelCallAudio?.openBubbleSettings?.().catch(() => undefined);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={19} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <GroupCall groupId={groupId} />
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.surfaceMuted }]}
            onPress={() => setMinimized(!minimized)}
          >
            <Ionicons name="remove" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.surfaceMuted }]}
            onPress={closeChat}
          >
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
        </Pressable>
        <GroupChatPanel groupId={groupId} />
      </View>
    </Modal>
    {open && minimized && (
      <View
        style={[
          styles.minimizedBar,
          { bottom: minimizedBottom },
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Pressable
          style={[
            styles.chatHeader,
            { backgroundColor: palette.surface, borderBottomColor: palette.border },
          ]}
          onPress={() => setMinimized(false)}
        >
          <View style={[styles.chatAvatar, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
            <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
            <View style={[styles.onlineDot, { borderColor: palette.surface }]} />
          </View>
          <View style={styles.chatHeading}>
            <Text numberOfLines={1} style={[styles.chatTitle, { color: palette.textPrimary }]}>Trò chuyện nhóm</Text>
            <Text numberOfLines={1} style={[styles.chatSubtitle, { color: palette.textSecondary }]}>Nhấn để mở lại</Text>
          </View>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.surfaceMuted }]}
            onPress={() => setMinimized(false)}
          >
            <Ionicons name="chevron-up" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.surfaceMuted }]}
            onPress={closeChat}
          >
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
        </Pressable>
      </View>
    )}
  </>);
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 98,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1687F8",
    elevation: 8,
    shadowColor: "#1687F8",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 20,
  },
  fabLeft: { left: 18 },
  fabRight: { right: 18 },
  badge: {
    position: "absolute",
    top: -11,
    right: -14,
    backgroundColor: "#EF4444",
    color: "#fff",
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,8,18,.58)" },
  chatWindow: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 92,
    height: "72%",
    maxHeight: 620,
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  minimizedBar: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 62,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 40,
  },
  chatHeader: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatAvatar: { width: 38, height: 38, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  onlineDot: { position: "absolute", right: -2, bottom: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#22c55e" },
  chatHeading: { flex: 1, minWidth: 0 },
  chatTitle: { fontSize: 14, fontWeight: "800" },
  chatSubtitle: { marginTop: 1, fontSize: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
