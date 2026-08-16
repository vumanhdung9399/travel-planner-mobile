import { api } from "@/src/services/api";
import { useNotificationStore } from "@/src/store/notification.store";
import { useNotificationNavigate } from "@/src/store/notificationNavigate.store";
import type { Notification } from "@/src/type/notification";
import { COLORS, NOTIFICATION_TYPE } from "@/src/utils/constants";
import { showSuccess } from "@/src/utils/errorHandler";
import { formatTimeAgo } from "@/src/utils/helper";
import ActionSheet from "@components/ActionSheet";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationScreen() {
  const palette = useAppPalette();
  const {
    fetchNotifications,
    count,
    setCount,
    listNotification,
    setListNotification,
    hasMore,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const navigateNoti = useNotificationNavigate();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications(true);
    }, [fetchNotifications]),
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const handleReadAll = async () => {
    await markAllAsRead();
  };

  const markRead = async (noti: Notification) => {
    if (noti.isRead) return;
    await markAsRead(noti.id);
    setOpen(false);
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
    } catch {}
  };

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        {
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Thông báo</Text>
      {count > 0 && (
        <TouchableOpacity onPress={handleReadAll}>
          <Text style={styles.readAllBtn}>Đánh dấu đã đọc</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="bell-off-outline"
        size={80}
        color={palette.textLight}
      />
      <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Chưa có thông báo nào</Text>
      <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
        Chúng tôi sẽ thông báo cho bạn khi có tin tức mới nhất.
      </Text>
    </View>
  );

  const getIcon = (type: string, isRead: boolean) => {
    const appearance =
      {
        [NOTIFICATION_TYPE.EXPENSE]: { color: "#FF6B3D", bg: palette.orangeLight },
        [NOTIFICATION_TYPE.TIMELINE]: { color: "#1687F8", bg: palette.primaryLight },
        [NOTIFICATION_TYPE.INVITE]: { color: "#23B96F", bg: palette.successLight },
        [NOTIFICATION_TYPE.TRIP]: { color: "#E3A008", bg: palette.warningLight },
        [NOTIFICATION_TYPE.BALANCE]: { color: "#846FE8", bg: palette.purpleLight },
      }[type] || { color: COLORS.primary, bg: palette.primaryLight };
    const color = isRead ? palette.textLight : appearance.color;
    const bg = isRead ? palette.surfaceMuted : appearance.bg;
    let iconName: any = "bell-outline";

    switch (type) {
      case NOTIFICATION_TYPE.EXPENSE:
        iconName = "wallet";
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
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      {renderHeader()}
      <FlatList
        data={listNotification}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        refreshing={loading && listNotification.length === 0}
        onRefresh={() => fetchNotifications(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        onEndReached={() => {
          if (!loading && hasMore && listNotification.length > 0) {
            fetchNotifications();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.item,
              {
                backgroundColor: item.isRead
                  ? palette.surface
                  : palette.primaryLight,
                borderColor: palette.border,
              },
            ]}
            onPress={() => {
              markRead(item);
              navigateNoti(item);
            }}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSelected(item);
              setOpen(true);
            }}
          >
            {getIcon(item.type, item.isRead)}

            <View style={styles.contentContainer}>
              <Text
                style={[
                  styles.title,
                  { color: palette.textPrimary },
                  !item.isRead && styles.boldText,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.content, { color: palette.textSecondary }]}
                numberOfLines={2}
              >
                {item.content}
              </Text>
              <Text style={[styles.time, { color: palette.textLight }]}>
                {formatTimeAgo(item.createdAt)}
              </Text>
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
                  icon: "checkmark-done-outline",
                  onPress: () => selected && markRead(selected),
                },
              ]),
          {
            label: "Xoá thông báo",
            icon: "trash-outline",
            color: "red",
            onPress: handleDelete,
          },
        ].filter(Boolean)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  readAllBtn: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },

  item: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  unreadItem: { backgroundColor: COLORS.infoLight },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  contentContainer: { flex: 1 },
  title: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 20 },
  boldText: { fontWeight: "700" },
  content: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },

  dotContainer: { width: 12, marginLeft: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#444",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
