import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip, UserGroupRole } from "@/src/type/trip";
import { COLORS, EXPENSE_STATUS, GROUP_ROLE } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, Surface, Text } from "react-native-paper";
import BalanceCard from "./BalanceCard";

type Props = {
  trip: Trip;
};

interface BalanceMember {
  userId: string;
  name: string;
  avatar: string | null;
  total: number;
  items: any[];
}

const BalanceList = ({ trip }: Props) => {
  const { user: currentUser } = useAuthStore();
  const currentUserId = currentUser?.id;

  const [listExpenses, setListExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<UserGroupRole[]>([]);

  const leader = useMemo(() => {
    return (
      members.find(
        (u) => u.role === GROUP_ROLE.LEADER || u.role === GROUP_ROLE.OWNER,
      ) || members[0]
    );
  }, [members]);

  useEffect(() => {
    getExpenses();
    getMember();
  }, [trip.id]);

  useFocusEffect(
    useCallback(() => {
      if (!trip.id) return;
      getExpenses();
      getMember();
    }, [trip.id]),
  );

  const getMember = async () => {
    try {
      const res = await api.get<UserGroupRole[]>(
        `groups/${trip.group.id}/members/with-deleted-paid`,
      );
      setMembers(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get<ExpenseItem[]>(`/expenses/${trip.id}`);
      const filterApproval = res.data.filter(
        (e) => e.status === EXPENSE_STATUS.APPROVED,
      );
      setListExpenses(filterApproval);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const balances = useMemo(() => {
    const map: Record<string, Omit<BalanceMember, "userId">> = {};

    listExpenses.forEach((exp) => {
      const amount = Number(exp.amount || 0);
      const participants = exp.participants || [];
      if (participants.length === 0) return;

      const share = amount / participants.length;
      const payer = exp.paidBy;

      participants.forEach((p) => {
        if (!map[p.id]) {
          map[p.id] = { total: 0, items: [], name: p.name, avatar: p.avatar };
        }
        map[p.id].total += share;
        map[p.id].items.push({
          id: exp.id,
          category: exp.category,
          title: exp.title,
          amount: share,
          payerId: exp.paidBy?.id,
          type: "debt",
        });
      });

      if (payer && !map[payer.id]) {
        map[payer.id] = {
          total: 0,
          items: [],
          name: payer.name,
          avatar: payer.avatar,
        };
      }
      if (payer) {
        map[payer.id].total -= amount;
      }
    });

    return Object.entries(map).map(([userId, value]) => ({
      userId,
      ...value,
      total: Math.round(value.total),
    }));
  }, [listExpenses]);

  const totalToReceive = balances
    .filter((b) => b.total > 0)
    .reduce((sum, b) => sum + b.total, 0);

  const validBalances = useMemo(() => {
    return balances.filter((balance) => {
      const user = members.find((u) => u.id === balance.userId);
      return !!user;
    });
  }, [balances, members]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Nếu trip chưa kết thúc
  if (!trip.isCloseTrip) {
    return (
      <View style={styles.notFinishedContainer}>
        <Surface style={styles.notFinishedCard} elevation={0}>
          <Text style={styles.notFinishedEmoji}>⏳</Text>
          <Text style={styles.notFinishedTitle}>Hành trình chưa kết thúc</Text>
          <Text style={styles.notFinishedSubtext}>
            Chưa thể hiển thị bảng cân đối thu chi. Vui lòng đợi đến khi chuyến
            đi kết thúc.
          </Text>
        </Surface>
      </View>
    );
  }

  if (!leader) {
    return (
      <View style={styles.centered}>
        <Text>Không tìm thấy trưởng nhóm</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={validBalances}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => {
          const user = members.find((u) => u.id === item.userId);

          if (!user) {
            console.warn(`User not found for userId: ${item.userId}`);
            return null;
          }

          return (
            <BalanceCard
              user={user!}
              total={item.total}
              items={item.items}
              isCurrent={item.userId === currentUserId}
              leader={leader!}
              users={members}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              getExpenses();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <Surface style={styles.header} elevation={0}>
            {/* Leader Info */}
            <View style={styles.leaderRow}>
              {leader?.avatar ? (
                <Avatar.Image source={{ uri: leader.avatar }} size={56} />
              ) : (
                <Avatar.Text
                  size={56}
                  label={getNameFirstLetterUpper(leader?.name || "")}
                  style={styles.leaderAvatar}
                />
              )}
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderLabel}>Trưởng nhóm</Text>
                <Text style={styles.leaderName}>{leader?.name}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cần thu</Text>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.totalBadge}
              >
                <Text style={styles.totalAmount}>
                  {formatMoney(totalToReceive)}
                </Text>
              </LinearGradient>
            </View>
          </Surface>
        }
        ListEmptyComponent={
          <Surface style={styles.emptyContainer} elevation={0}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyText}>Chưa có dữ liệu thanh toán</Text>
          </Surface>
        }
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
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    gap: 12,
  },
  notFinishedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  notFinishedCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notFinishedEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  notFinishedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  notFinishedSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  header: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leaderAvatar: {
    backgroundColor: COLORS.primary,
  },
  leaderInfo: {
    marginLeft: 14,
  },
  leaderLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  leaderName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  totalBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});

export default BalanceList;
