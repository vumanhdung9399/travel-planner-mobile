import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip, UserGroupRole } from "@/src/type/trip";
import { EXPENSE_STATUS, GROUP_ROLE } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { exportPdf, formatPdfCurrency } from "@/src/utils/pdfExport";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, Surface, Text, useTheme } from "react-native-paper";
import BalanceCard from "./BalanceCard";
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

interface BalanceItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  payerId: string;
  payerName: string;
  type: "debt" | "paid";
  userShare?: number;
}

interface UserBalance {
  balance: number;
  name: string;
  avatar: string | null;
  paidItems: BalanceItem[];
  debtItems: BalanceItem[];
}

type Props = {
  trip: Trip;
  refreshKey?: number;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
  onExportReady?: (handler: (() => Promise<void>) | null) => void;
  onSummaryChange?: (summary: {
    eyebrow: string;
    value: string;
    pill?: string;
  }) => void;
};

const BalanceList = ({
  trip,
  refreshKey = 0,
  contentInsetTop = 0,
  onScrollOffsetChange,
  onExportReady,
  onSummaryChange,
}: Props) => {
  const palette = useAppPalette();
  const theme = useTheme();
  const { user: currentUser } = useAuthStore();
  const currentUserId = currentUser?.id;

  const [listExpenses, setListExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<UserGroupRole[]>([]);
  const [tripFunds, setTripFunds] = useState<TripFund[]>([]);

  const leader = useMemo(() => {
    return (
      members.find(
        (u) => u.role === GROUP_ROLE.LEADER || u.role === GROUP_ROLE.OWNER,
      ) || members[0]
    );
  }, [members]);

  useEffect(() => {
    if (!trip.id) return;
    void getExpenses();
    void getMember();
    void getTripFunds();
  }, [refreshKey, trip.id]);

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

  const getTripFunds = async () => {
    try {
      const res = await api.get<TripFund[]>(`/trips/${trip.id}/funds`);
      setTripFunds(res.data || []);
    } catch (error) {
      console.log("Error fetching funds:", error);
      setTripFunds([]);
    }
  };

  const fundMap = useMemo(() => {
    const map: Record<string, number> = {};
    tripFunds.forEach((fund) => {
      map[fund.user.id] = (map[fund.user.id] || 0) + Number(fund.amount);
    });
    return map;
  }, [tripFunds]);

  // Tính số dư từ chi tiêu (dương = được nhận, âm = phải trả)
  const expenseBalances = useMemo(() => {
    const balanceMap = new Map<string, UserBalance>();

    listExpenses.forEach((exp) => {
      const amount = Number(exp.amount || 0);
      const participants = exp.participants || [];
      const payer = exp.paidBy;

      if (participants.length === 0 || !payer?.id) return;

      const share = amount / participants.length;

      const getUserBalance = (
        userId: string,
        name: string,
        avatar: string | null,
      ) => {
        if (!balanceMap.has(userId)) {
          balanceMap.set(userId, {
            balance: 0,
            name,
            avatar,
            paidItems: [],
            debtItems: [],
          });
        }
        return balanceMap.get(userId)!;
      };

      // 1. Xử lý người tham gia (nợ)
      participants.forEach((participant) => {
        if (!participant?.id) return;

        const userBalance = getUserBalance(
          participant.id,
          participant.name,
          participant.avatar,
        );
        userBalance.balance -= share;

        if (participant.id !== payer.id) {
          userBalance.debtItems.push({
            id: exp.id,
            category: exp.category,
            title: exp.title,
            amount: share,
            payerId: payer.id,
            payerName: payer.name,
            type: "debt",
            userShare: share,
          });
        }
      });

      // 2. Xử lý người trả tiền
      const payerBalance = getUserBalance(payer.id, payer.name, payer.avatar);
      payerBalance.balance += amount;

      payerBalance.paidItems.push({
        id: exp.id,
        category: exp.category,
        title: exp.title,
        amount: amount,
        payerId: payer.id,
        payerName: payer.name,
        type: "paid",
        userShare: amount,
      });
    });

    return Array.from(balanceMap.entries()).map(([userId, data]) => ({
      userId,
      name: data.name,
      avatar: data.avatar,
      balanceFromExpense: Number(data.balance.toFixed(2)),
      paidItems: data.paidItems,
      debtItems: data.debtItems,
    }));
  }, [listExpenses]);

  // Tính final balance (bao gồm quỹ)
  const finalBalances = useMemo(() => {
    return expenseBalances.map((balance) => {
      const fundAmount = fundMap[balance.userId] || 0;
      const finalBalance = balance.balanceFromExpense + fundAmount;

      let paymentStatus: "receive" | "pay" | "settled" = "settled";
      let paymentAmount = 0;

      if (finalBalance > 0) {
        paymentStatus = "receive";
        paymentAmount = Math.round(finalBalance);
      } else if (finalBalance < 0) {
        paymentStatus = "pay";
        paymentAmount = -Math.round(finalBalance);
      }

      return {
        ...balance,
        fundAmount,
        finalBalance: Number(finalBalance.toFixed(2)),
        paymentStatus,
        paymentAmount,
      };
    });
  }, [expenseBalances, fundMap]);

  const totalToPay = Math.round(
    finalBalances
      .filter((b) => b.paymentStatus === "pay")
      .reduce((sum, b) => sum + b.paymentAmount, 0),
  );

  const totalFunds = tripFunds.reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExpenses = listExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  const currentBalance = finalBalances.find(
    (balance) => balance.userId === currentUserId,
  );

  useEffect(() => {
    if (!trip.isCloseTrip) {
      onSummaryChange?.({
        eyebrow: "Thanh toán chuyến đi",
        value: "Chưa chốt sổ",
        pill: "Đang diễn ra",
      });
      return;
    }

    if (!currentBalance || currentBalance.paymentStatus === "settled") {
      onSummaryChange?.({
        eyebrow: "Số dư của bạn",
        value: "Đã cân bằng",
        pill: "Hoàn tất",
      });
      return;
    }

    onSummaryChange?.({
      eyebrow:
        currentBalance.paymentStatus === "pay"
          ? "Bạn cần thanh toán"
          : "Bạn sẽ được nhận",
      value: formatMoney(currentBalance.paymentAmount),
      pill:
        currentBalance.paymentStatus === "pay" ? "Cần trả" : "Được nhận",
    });
  }, [currentBalance, onSummaryChange, trip.isCloseTrip]);

  const validBalances = useMemo(() => {
    return finalBalances.filter((balance) => {
      const user = members.find((u) => u.id === balance.userId);
      return !!user;
    });
  }, [finalBalances, members]);

  const handleExport = useCallback(async () => {
    const statusLabels = {
      receive: "Được nhận",
      pay: "Cần trả",
      settled: "Đã cân bằng",
    };
    await exportPdf(
      `${trip.name} - Thanh toán`,
      ["Thành viên", "Cân đối chi phí", "Đã đóng quỹ", "Số dư cuối", "Trạng thái", "Số tiền thanh toán", "Thanh toán cho"],
      validBalances.map((balance) => [
        balance.name,
        formatPdfCurrency(balance.balanceFromExpense),
        formatPdfCurrency(balance.fundAmount),
        formatPdfCurrency(balance.finalBalance),
        statusLabels[balance.paymentStatus],
        formatPdfCurrency(balance.paymentAmount),
        balance.paymentStatus === "settled" ? "" : leader?.name,
      ]),
    );
  }, [leader?.name, trip.name, validBalances]);

  useEffect(() => {
    onExportReady?.(handleExport);
    return () => onExportReady?.(null);
  }, [handleExport, onExportReady]);

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!trip.isCloseTrip) {
    return (
      <View
        style={[
          styles.notFinishedContainer,
          { backgroundColor: palette.background },
        ]}
      >
        <Surface
          style={[
            styles.notFinishedCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          elevation={0}
        >
          <Text style={styles.notFinishedEmoji}>⏳</Text>
          <Text
            style={[styles.notFinishedTitle, { color: palette.textPrimary }]}
          >
            Hành trình chưa kết thúc
          </Text>
          <Text
            style={[
              styles.notFinishedSubtext,
              { color: palette.textSecondary },
            ]}
          >
            Chưa thể hiển thị bảng cân đối thu chi. Vui lòng đợi đến khi chuyến
            đi kết thúc.
          </Text>
        </Surface>
      </View>
    );
  }

  if (!leader) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <Text style={{ color: palette.textSecondary }}>
          Không tìm thấy trưởng nhóm
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <FlatList
        data={validBalances}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => {
          const user = members.find((u) => u.id === item.userId);
          if (!user) return null;

          return (
            <BalanceCard
              user={user}
              balanceFromExpense={item.balanceFromExpense}
              fundAmount={item.fundAmount}
              finalBalance={item.finalBalance}
              paymentStatus={item.paymentStatus}
              paymentAmount={item.paymentAmount}
              paidItems={item.paidItems}
              debtItems={item.debtItems}
              isCurrent={item.userId === currentUserId}
              leader={leader!}
              users={members}
            />
          );
        }}
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
              getExpenses();
              getTripFunds();
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={palette.surface}
          />
        }
        ListHeaderComponent={
          <Surface
            style={[
              styles.header,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.isDark ? "#000000" : "#3D4E62",
              },
            ]}
            elevation={0}
          >
            <View style={styles.leaderRow}>
              {leader?.avatar ? (
                <Avatar.Image source={{ uri: leader.avatar }} size={56} />
              ) : (
                <Avatar.Text
                  size={56}
                  label={getNameFirstLetterUpper(leader?.name || "")}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
              <View style={styles.leaderInfo}>
                <Text
                  style={[styles.leaderLabel, { color: palette.textSecondary }]}
                >
                  Trưởng nhóm
                </Text>
                <Text
                  style={[styles.leaderName, { color: palette.textPrimary }]}
                >
                  {leader?.name}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: palette.border }]}
            />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statLabel, { color: palette.textSecondary }]}
                >
                  Tổng chi phí
                </Text>
                <Text
                  style={[styles.statValue, { color: palette.textPrimary }]}
                >
                  {formatMoney(totalExpenses)}
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
                  Tổng quỹ
                </Text>
                <Text
                  style={[styles.statValue, { color: theme.colors.primary }]}
                >
                  {formatMoney(totalFunds)}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: palette.border }]}
            />

            <View style={styles.totalContainer}>
              <Text
                style={[styles.totalLabel, { color: palette.textPrimary }]}
              >
                Tổng cần thu
              </Text>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.totalBadge}
              >
                <Text style={styles.totalAmount}>
                  {formatMoney(totalToPay)}
                </Text>
              </LinearGradient>
            </View>

            <Text
              style={[styles.noteText, { color: palette.textSecondary }]}
            >
              * Đã bao gồm điều chỉnh từ quỹ chuyến đi
            </Text>
          </Surface>
        }
        ListEmptyComponent={
          <Surface
            style={[
              styles.emptyContainer,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            elevation={0}
          >
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text
              style={[styles.emptyText, { color: palette.textSecondary }]}
            >
              Chưa có dữ liệu thanh toán
            </Text>
          </Surface>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 96,
    gap: 12,
  },
  notFinishedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  notFinishedCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
  },
  notFinishedEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  notFinishedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  notFinishedSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  header: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leaderInfo: {
    marginLeft: 14,
  },
  leaderLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  leaderName: {
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 16,
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
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
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
  noteText: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 8,
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});

export default BalanceList;
