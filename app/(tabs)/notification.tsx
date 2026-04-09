import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useNotificationNavigate } from "@/src/store/notificationNavigate.store";
import type { Notification } from "@/src/type/notification";
import { NOTIFICATION_TYPE } from "@/src/utils/constants";
import { showSuccess } from "@/src/utils/errorHandler";
import { formatTimeAgo } from "@/src/utils/helper";
import ActionSheet from "@components/ActionSheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationScreen() {
  const {
    fetchNotifications,
    setCount,
    listNotification,
    setListNotification,
  } = useNotificationStore();
  const navigateNoti = useNotificationNavigate();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleReadAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      setListNotification((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
      showSuccess("Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
      console.error(error);
    }
  };

  const markRead = async (noti: Notification) => {
    if (noti.isRead) return;
    try {
      api.patch(`/notifications/${noti.id}/read`);
      setListNotification((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, isRead: true } : n)),
      );
      setCount((prev: any) =>
        typeof prev === "number" && prev > 0 ? prev - 1 : 0,
      );
      setOpen(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/notifications/${selected.id}`);
      const isUnread = !selected.isRead;
      setListNotification((prev) => prev.filter((n) => n.id !== selected.id));
      if (isUnread) {
        setCount((prev: any) =>
          typeof prev === "number" && prev > 0 ? prev - 1 : 0,
        );
      }
      setOpen(false);
      showSuccess("Xoá thông báo thành công");
    } catch (error) {}
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Thông báo</Text>
      <TouchableOpacity onPress={handleReadAll}>
        <Text style={styles.readAllBtn}>Đánh dấu đã đọc</Text>
      </TouchableOpacity>
    </View>
  );

  const getIcon = (type: string, isRead: boolean) => {
    const color = isRead ? "#8e8e93" : "#007AFF";
    const bg = isRead ? "#f2f2f7" : "#e5f1ff";
    let iconName: any = "bell-outline";

    switch (type) {
      case NOTIFICATION_TYPE.EXPENSE:
        iconName = "receipt";
        break;
      case NOTIFICATION_TYPE.TIMELINE:
        iconName = "calendar-clock";
        break;
      case NOTIFICATION_TYPE.INVITE:
        iconName = "account-plus";
        break;
      case NOTIFICATION_TYPE.TRIP:
        iconName = "bag-suitcase";
        break;
      case NOTIFICATION_TYPE.BALANCE:
        iconName = "credit-card-outline";
        break;
    }

    return (
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={color} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={listNotification}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.item, !item.isRead && styles.unreadItem]}
            onPress={() => {
              markRead(item);
              // navigateNoti(item);
            }}
            onLongPress={() => {
              setSelected(item);
              setOpen(true);
            }}
          >
            {getIcon(item.type, item.isRead)}

            <View style={styles.contentContainer}>
              <Text
                style={[styles.title, !item.isRead && styles.boldText]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={styles.content} numberOfLines={2}>
                {item.content}
              </Text>
              <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
            </View>

            <View style={styles.dotContainer}>
              {!item.isRead && <View style={styles.dot} />}
            </View>
          </TouchableOpacity>
        )}
      />

      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        actions={[
          ...(selected?.isRead
            ? []
            : [
                {
                  label: "Đánh dấu đã đọc",
                  onPress: () => selected && markRead(selected),
                },
              ]),
          { label: "Xoá thông báo", color: "red", onPress: handleDelete },
        ].filter(Boolean)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  readAllBtn: { color: "#007AFF", fontSize: 14, fontWeight: "600" },

  item: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  unreadItem: { backgroundColor: "#f0f7ff" },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  contentContainer: { flex: 1 },
  title: { fontSize: 15, color: "#262626", lineHeight: 20 },
  boldText: { fontWeight: "700", color: "#000" },
  content: { fontSize: 14, color: "#666", marginTop: 2, lineHeight: 18 },
  time: { fontSize: 12, color: "#8e8e93", marginTop: 6 },

  dotContainer: { width: 12, marginLeft: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
  },
});
