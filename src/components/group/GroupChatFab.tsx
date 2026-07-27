import { api } from "@/src/services/api";
import { getSocket } from "@/src/utils/socket";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Badge, Text } from "react-native-paper";
import GroupChatPanel from "./GroupChatPanel";

export default function GroupChatFab({ groupId }: { groupId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

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
      style={styles.fab}
      activeOpacity={0.85}
      accessibilityLabel="Mở trò chuyện nhóm"
      onPress={() => {
        setUnreadCount(0);
        setOpen(true);
        setMinimized(false);
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
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
      <View style={[styles.chatWindow, minimized && styles.chatWindowMinimized]}>
        <Pressable style={styles.chatHeader} onPress={() => setMinimized(false)}>
          <View style={styles.onlineDot} />
          <Text numberOfLines={1} style={styles.chatTitle}>Trò chuyện nhóm</Text>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setMinimized((value) => !value)}>
            <Ionicons name="remove" size={22} color="#0084ff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setOpen(false)}>
            <Ionicons name="close" size={22} color="#0084ff" />
          </TouchableOpacity>
        </Pressable>
        {!minimized && <GroupChatPanel groupId={groupId} />}
      </View>
    </Modal>
  </>);
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 98,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0084FF",
    elevation: 8,
    shadowColor: "#0084FF",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 20,
  },
  badge: {
    position: "absolute",
    top: -11,
    right: -14,
    backgroundColor: "#EF4444",
    color: "#fff",
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.18)" },
  chatWindow: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 92,
    height: "72%",
    maxHeight: 620,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#fff",
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  chatWindowMinimized: { height: 54 },
  chatHeader: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e6eb",
    backgroundColor: "#fff",
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e", marginRight: 9 },
  chatTitle: { flex: 1, fontWeight: "700", color: "#172033" },
  headerIcon: { padding: 6, marginLeft: 2 },
});
