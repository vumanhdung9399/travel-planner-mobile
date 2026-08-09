import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, IconButton, Surface, Text } from "react-native-paper";

import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
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
  const { user: currentUser } = useAuthStore();

  const [funds, setFunds] = useState<TripFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<TripFund | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isLeader = trip.isLeader;

  useEffect(() => {
    void getFunds();
  }, [refreshKey, trip.id]);

  const getFunds = async () => {
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
  };

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
    } catch (error) {
      console.error(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setSelectedFund(null);
    }
  };

  const renderFundCard = ({ item }: { item: TripFund }) => {
    const isMine = item.user.id === currentUser?.id;

    return (
      <Surface
        style={[
          styles.fundCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowOpacity: palette.isDark ? 0 : 0.035,
          },
        ]}
        elevation={0}
      >
        <View style={styles.fundHeader}>
          {item.user.avatar ? (
            <Avatar.Image
              source={{ uri: item.user.avatar }}
              size={48}
              style={styles.userAvatar}
            />
          ) : (
            <View
              style={[
                styles.userAvatarFallback,
                { backgroundColor: palette.primaryLight },
              ]}
            >
              <Text style={styles.userAvatarText}>
                {getNameFirstLetterUpper(item.user.name)}
              </Text>
            </View>
          )}

          <View style={styles.fundInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: palette.textPrimary }]}>
                {item.user.name}
              </Text>
              {isMine && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>Bạn</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
              {item.user.phone}
            </Text>
          </View>

          <View style={styles.fundRight}>
            <Text style={styles.fundAmount}>{formatMoney(item.amount)}</Text>
            {isLeader && !trip.isCloseTrip && (
              <IconButton
                icon="delete"
                size={18}
                iconColor={COLORS.error}
                onPress={() => handleDelete(item)}
                style={styles.deleteButton}
              />
            )}
          </View>
        </View>

        {item.note && (
          <View
            style={[styles.noteContainer, { borderTopColor: palette.border }]}
          >
            <Text style={[styles.noteText, { color: palette.textSecondary }]}>
              {item.note}
            </Text>
          </View>
        )}
      </Surface>
    );
  };

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
          Chưa có quỹ nào
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
      <FlatList
        data={funds}
        keyExtractor={(item) => item.id}
        renderItem={renderFundCard}
        contentContainerStyle={[styles.listContent, { paddingTop: contentInsetTop + 14 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) =>
          onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              getFunds();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          stats.count > 0 ? (
            <Surface
              style={[
                styles.statsCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  shadowOpacity: palette.isDark ? 0 : 0.04,
                },
              ]}
              elevation={0}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statLabel, { color: palette.textSecondary }]}
                  >
                    Tổng quỹ
                  </Text>
                  <Text style={styles.statValue}>
                    {formatMoney(stats.total)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: palette.border },
                  ]}
                />

                <View style={styles.statItem}>
                  <Text
                    style={[styles.statLabel, { color: palette.textSecondary }]}
                  >
                    Trung bình
                  </Text>
                  <Text style={styles.statValue}>
                    {formatMoney(stats.average)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: palette.border },
                  ]}
                />

                <View style={styles.statItem}>
                  <Text
                    style={[styles.statLabel, { color: palette.textSecondary }]}
                  >
                    Người
                  </Text>
                  <Text style={styles.statValue}>{stats.count}</Text>
                </View>
              </View>
            </Surface>
          ) : null
        }
        ListEmptyComponent={renderEmptyState()}
      />

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
