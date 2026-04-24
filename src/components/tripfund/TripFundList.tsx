import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Avatar, IconButton, Surface, Text } from "react-native-paper";

import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import ConfirmDialog from "../ConfirmDialog";

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
}

const TripFundList = ({ trip }: TripFundListProps) => {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [funds, setFunds] = useState<TripFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<TripFund | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isLeader = trip.isLeader;

  useFocusEffect(
    useCallback(() => {
      getFunds();
    }, [trip.id]),
  );

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
      <Surface style={styles.fundCard} elevation={0}>
        <View style={styles.fundHeader}>
          {item.user.avatar ? (
            <Avatar.Image
              source={{ uri: item.user.avatar }}
              size={48}
              style={styles.userAvatar}
            />
          ) : (
            <View style={[styles.userAvatarFallback]}>
              <Text style={styles.userAvatarText}>
                {getNameFirstLetterUpper(item.user.name)}
              </Text>
            </View>
          )}

          <View style={styles.fundInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{item.user.name}</Text>
              {isMine && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>Bạn</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.user.phone}</Text>
          </View>

          <View style={styles.fundRight}>
            <Text style={styles.fundAmount}>{formatMoney(item.amount)}</Text>
            {isLeader && (
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
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}
      </Surface>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Surface style={styles.emptyCard} elevation={0}>
        <Text style={styles.emptyEmoji}>💰</Text>
        <Text style={styles.emptyTitle}>Chưa có quỹ nào</Text>
        <Text style={styles.emptySubtext}>
          {isLeader
            ? "Hãy tạo quỹ cho chuyến đi này"
            : "Trưởng nhóm sẽ tạo quỹ cho chuyến đi"}
        </Text>
      </Surface>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={funds}
        keyExtractor={(item) => item.id}
        renderItem={renderFundCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
            <Surface style={styles.statsCard} elevation={0}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Tổng quỹ</Text>
                  <Text style={styles.statValue}>
                    {formatMoney(stats.total)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Trung bình</Text>
                  <Text style={styles.statValue}>
                    {formatMoney(stats.average)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Người</Text>
                  <Text style={styles.statValue}>{stats.count}</Text>
                </View>
              </View>
            </Surface>
          ) : null
        }
        ListEmptyComponent={renderEmptyState()}
      />

      {/* FAB - Add Fund */}
      {isLeader && !trip.isCloseTrip && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/trips/${trip.id}/fund-form`);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={COLORS.secondaryGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  fundCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fundHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
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
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
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
    backgroundColor: "#fff",
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
