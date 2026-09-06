import { TripContentScrollView } from '@/src/components/trip/TripDetailContent';
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, IconButton, Surface, Text } from "react-native-paper";

import { api } from "@/src/services/api";
import { useTripStore } from "@/src/store/trip.store";
import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import ConfirmDialog from "../ConfirmDialog";
import { useAppPalette } from "@/src/hook/useAppPalette";

interface TripFund {
  id: string;
  amount: number;
  note?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
    phone: string;
  };
}

interface TripFundListProps {
  trip: Trip;
  refreshKey?: number;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
  onSummaryChange?: (summary: {
    eyebrow: string;
    value: string;
    pill?: string;
  }) => void;
}

const TripFundList = ({
  trip,
  refreshKey = 0,
  contentInsetTop = 0,
  onScrollOffsetChange,
  onSummaryChange,
}: TripFundListProps) => {
  const palette = useAppPalette();
  const markContentChanged = useTripStore(state => state.markContentChanged);

  const [funds, setFunds] = useState<TripFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<TripFund | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isLeader = trip.isLeader;

  const getFunds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<TripFund[]>(`/trips/${trip.id}/funds`);
      setFunds(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trip.id]);

  useEffect(() => {
    // Reload the remote contributions when this trip's content changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getFunds();
  }, [getFunds, refreshKey]);

  // Tính toán thống kê
  const stats = useMemo(() => {
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    const average = funds.length > 0 ? Math.round(total / funds.length) : 0;

    return { total, average, count: funds.length };
  }, [funds]);

  useEffect(() => {
    onSummaryChange?.({
      eyebrow: "Tổng quỹ chuyến đi",
      value: formatMoney(stats.total),
      pill: `${stats.count} người đã đóng`,
    });
  }, [onSummaryChange, stats.count, stats.total]);

  const handleDelete = (fund: TripFund) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFund(fund);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFund) return;

    try {
      setDeleting(true);
      await api.delete(`/trips/${trip.id}/funds/${selectedFund.user.id}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await getFunds();
      markContentChanged();
    } catch (error) {
      console.error(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setSelectedFund(null);
    }
  };

  const renderFundCard = (item: TripFund, index: number) => <View key={item.id || item.user.id} style={{ paddingVertical: 12, borderBottomWidth: index < funds.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: palette.border }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {item.user.avatar ? <Avatar.Image source={{ uri: item.user.avatar }} size={38} /> : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>{getNameFirstLetterUpper(item.user.name)}</Text></View>}
      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: "600", color: palette.textPrimary }}>{item.user.name}</Text><Text style={{ fontSize: 10, color: palette.textSecondary, marginTop: 2 }}>{item.user.phone}</Text></View>
      <View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 13, fontWeight: "600", color: palette.textPrimary }}>{formatMoney(item.amount)}</Text>{isLeader && !trip.isCloseTrip && <IconButton icon="delete" size={16} iconColor={COLORS.error} onPress={() => handleDelete(item)} style={{ margin: 0, width: 26, height: 26 }} />}</View>
    </View>
    {!!item.note && <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: palette.border }}><Text style={{ fontSize: 10, color: palette.textSecondary }}>{item.note}</Text></View>}
  </View>;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Surface
        style={[
          styles.emptyCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
        elevation={0}
      >
        <Text style={styles.emptyEmoji}>💰</Text>
        <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
          Chưa có khoản đóng góp nào
        </Text>
        <Text style={[styles.emptySubtext, { color: palette.textSecondary }]}>
          {isLeader
            ? "Hãy tạo quỹ cho chuyến đi này"
            : "Trưởng nhóm sẽ tạo quỹ cho chuyến đi"}
        </Text>
      </Surface>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <TripContentScrollView contentContainerStyle={[styles.listContent, { paddingTop: contentInsetTop + 14 }]} onScroll={event => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void getFunds(); }} />}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 10 }}><Text style={{ fontSize: 14, fontWeight: "600" }}>Đóng góp thành viên</Text><Text style={{ fontSize: 10, color: palette.textSecondary }}>{funds.length}/{trip.group.members.length} đã đóng</Text></View>
        {funds.length ? <View style={{ paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.surface }}>{funds.map(renderFundCard)}</View> : renderEmptyState()}
      </TripContentScrollView>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        visible={confirmOpen}
        title="Xóa quỹ"
        message={`Xóa quỹ của ${selectedFund?.user.name}?`}
        type="danger"
        confirmText="Xóa"
        cancelText="Hủy"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 104,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#3D4E62",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  fundCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#3D4E62",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  fundHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fundInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fundRight: {
    alignItems: "flex-end",
  },
  fundAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.success,
    marginBottom: 4,
  },
  deleteButton: {
    margin: 0,
  },
  noteContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  fabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TripFundList;
