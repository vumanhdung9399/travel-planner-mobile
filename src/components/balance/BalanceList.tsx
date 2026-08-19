import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip, UserGroupRole } from "@/src/type/trip";
import { EXPENSE_STATUS, GROUP_ROLE } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { exportPdf, formatPdfCurrency } from "@/src/utils/pdfExport";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
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

type SettlementMode = "leader" | "simplified";
type SettlementSummary = {
  settlementMode: SettlementMode;
  transfers: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    fromUser: UserGroupRole;
    toUser: UserGroupRole;
  }[];
};

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
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
  const [paymentPlanOpen, setPaymentPlanOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const leader = useMemo(() => {
    return (
      members.find(
        (u) => u.role === GROUP_ROLE.LEADER || u.role === GROUP_ROLE.OWNER,
      ) || members[0]
    );
  }, [members]);

  const getMember = useCallback(async () => {
    try {
      const res = await api.get<UserGroupRole[]>(
        `groups/${trip.group.id}/members/with-deleted-paid`,
      );
      setMembers(res.data);
    } catch (error) {
      console.log(error);
    }
  }, [trip.group.id]);

  const getExpenses = useCallback(async () => {
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
  }, [trip.id]);

  const getTripFunds = useCallback(async () => {
    try {
      const res = await api.get<TripFund[]>(`/trips/${trip.id}/funds`);
      setTripFunds(res.data || []);
    } catch (error) {
      console.log("Error fetching funds:", error);
      setTripFunds([]);
    }
  }, [trip.id]);

  const getSettlement = useCallback(async () => {
    try {
      const response = await api.get<SettlementSummary>(`/trips/${trip.id}/settlement`);
      setSettlement(response.data);
    } catch (error) {
      console.log("Error fetching settlement:", error);
    }
  }, [trip.id]);

  useEffect(() => {
    if (!trip.id) return;
    void getExpenses();
    void getMember();
    void getTripFunds();
    void getSettlement();
  }, [getExpenses, getMember, getTripFunds, getSettlement, refreshKey, trip.id]);

  const fundMap = useMemo(() => {
    const map: Record<string, number> = {};
    tripFunds.forEach((fund) => {
      map[fund.user.id] = (map[fund.user.id] || 0) + Number(fund.amount);
    });
    return map;
  }, [tripFunds]);

  const totalFunds = useMemo(
    () => tripFunds.reduce((sum, fund) => sum + Number(fund.amount || 0), 0),
    [tripFunds],
  );

  // Tính số dư từ chi tiêu (dương = được nhận, âm = phải trả)
  const expenseBalances = useMemo(() => {
    const balanceMap = new Map<string, UserBalance>();

    listExpenses.forEach((exp) => {
      const amount = Number(exp.amount || 0);
      const participants = exp.participants || [];
      const payer = exp.paidBy;

      if (participants.length === 0 || !payer?.id) return;

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
        const share = Number(participant.amount || 0);
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
    return members.map((member) => {
      const expenseBalance = expenseBalances.find(
        (balance) => balance.userId === member.id,
      );
      const fundAmount = fundMap[member.id] || 0;
      const leaderFundOffset = member.id === leader?.id ? totalFunds : 0;
      const finalBalance =
        (expenseBalance?.balanceFromExpense || 0) +
        fundAmount -
        leaderFundOffset;

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
        userId: member.id,
        name: member.name,
        avatar: member.avatar,
        balanceFromExpense: expenseBalance?.balanceFromExpense || 0,
        paidItems: expenseBalance?.paidItems || [],
        debtItems: expenseBalance?.debtItems || [],
        fundAmount,
        finalBalance: Number(finalBalance.toFixed(2)),
        paymentStatus,
        paymentAmount,
      };
    });
  }, [expenseBalances, fundMap, leader?.id, members, totalFunds]);

  const totalExpenses = listExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  const currentBalance = finalBalances.find(
    (balance) => balance.userId === currentUserId,
  );
  const currentPaid = currentBalance?.paidItems.reduce((sum, item) => sum + item.amount, 0) || 0;
  const currentShare = Math.max(currentPaid - (currentBalance?.balanceFromExpense || 0), 0);
  const myTransfers = (settlement?.transfers ?? []).filter(
    (transfer) => transfer.fromUserId === currentUserId || transfer.toUserId === currentUserId,
  );
  const paymentTransfers = myTransfers.filter((transfer) => transfer.fromUserId === currentUserId);
  const hasPaymentDue = paymentTransfers.length > 0;
  const getTransferQrUrl = (transfer: SettlementSummary["transfers"][number]) => {
    const receiver = transfer.toUser;
    if (!receiver.bank || !receiver.bankAccNumber) return null;
    return `https://img.vietqr.io/image/${receiver.bank}-${receiver.bankAccNumber}-compact2.png?amount=${transfer.amount}&addInfo=${encodeURIComponent(`Thanh toan ${transfer.fromUser.name} cho ${receiver.name}`)}`;
  };

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
      ["Thành viên", "Cân đối chi phí", "Đã đóng quỹ", "Số dư cuối", "Trạng thái", "Số tiền thanh toán", "Thanh toán với"],
      validBalances.map((balance) => {
        const paymentWith = settlement?.settlementMode === "simplified"
          ? settlement.transfers
              .filter((transfer) => transfer.fromUserId === balance.userId || transfer.toUserId === balance.userId)
              .map((transfer) => transfer.fromUserId === balance.userId ? transfer.toUser.name : transfer.fromUser.name)
              .join(", ")
          : balance.paymentStatus === "settled" ? "" : leader?.name;
        return [
          balance.name,
          formatPdfCurrency(balance.balanceFromExpense),
          formatPdfCurrency(balance.fundAmount),
          formatPdfCurrency(balance.finalBalance),
          statusLabels[balance.paymentStatus],
          formatPdfCurrency(balance.paymentAmount),
          paymentWith,
        ];
      }),
    );
  }, [leader?.name, settlement, trip.name, validBalances]);

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
          {
            backgroundColor: palette.background,
            paddingTop: contentInsetTop + 20,
            paddingBottom: 96,
          },
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
              centralizedSettlement={settlement?.settlementMode !== "simplified"}
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
            <Text style={[styles.summaryTitle, { color: palette.textPrimary }]}>Tóm tắt</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: palette.primaryLight }]}> 
                <View style={[styles.statIcon, { backgroundColor: "#BBDDFA" }]}><Ionicons name="cash-outline" size={22} color={theme.colors.primary} /></View>
                <View style={styles.statContent}><Text style={[styles.statLabel, { color: palette.textSecondary }]}>Tổng chi</Text><Text style={[styles.statValue, { color: palette.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatMoney(totalExpenses)}</Text></View>
              </View>
              <View style={[styles.statItem, { backgroundColor: palette.successLight }]}> 
                <View style={[styles.statIcon, { backgroundColor: "#A9E8C5" }]}><Ionicons name="wallet-outline" size={22} color="#159A6F" /></View>
                <View style={styles.statContent}><Text style={[styles.statLabel, { color: palette.textSecondary }]}>Bạn đã tiêu</Text><Text style={[styles.statValue, { color: "#159A6F" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatMoney(currentShare)}</Text></View>
              </View>
            </View>

            {hasPaymentDue && <TouchableOpacity style={styles.groupPaymentButton} onPress={() => setPaymentModalOpen(true)} activeOpacity={0.8}>
              <Text style={styles.groupPaymentButtonText}>Thanh toán ngay</Text>
            </TouchableOpacity>}
            <View style={[styles.paymentPlan, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <TouchableOpacity style={[styles.paymentPlanHeader, { backgroundColor: palette.warningLight }]} onPress={() => setPaymentPlanOpen((open) => !open)}>
                    <View style={styles.paymentPlanTitleRow}>
                      <Ionicons name="receipt-outline" size={22} color="#F59E0B" />
                    <View style={styles.paymentPlanText}><Text style={[styles.paymentPlanEyebrow, { color: palette.textSecondary }]} numberOfLines={1}>Thanh toán cuối chuyến</Text><Text style={[styles.paymentPlanTitle, { color: palette.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Kế hoạch thanh toán cụ thể</Text></View>
                  </View>
                  <View style={styles.paymentPlanAction}><Text style={styles.paymentPlanActionText}>{paymentPlanOpen ? "Thu gọn" : `${myTransfers.length} giao dịch`}</Text><Ionicons name={paymentPlanOpen ? "chevron-up" : "chevron-down"} size={19} color={palette.textSecondary} /></View>
                </TouchableOpacity>
                {paymentPlanOpen && myTransfers.map((transfer, index) => (
                    <View key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`} style={[styles.transferRow, { borderTopColor: palette.border }]}>
                      {transfer.fromUser.avatar ? (
                        <Avatar.Image size={38} source={{ uri: transfer.fromUser.avatar }} />
                      ) : (
                        <Avatar.Text size={38} label={getNameFirstLetterUpper(transfer.fromUser.name || "")} />
                      )}
                      <Text style={{ color: palette.textLight, fontSize: 20 }}>›</Text>
                      {transfer.toUser.avatar ? (
                        <Avatar.Image size={38} source={{ uri: transfer.toUser.avatar }} />
                      ) : (
                        <Avatar.Text size={38} label={getNameFirstLetterUpper(transfer.toUser.name || "")} />
                      )}
                      <View style={styles.transferAmountWrap}>
                        <Text style={{ color: transfer.fromUserId === currentUserId ? theme.colors.error : theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
                          {transfer.fromUserId === currentUserId ? "-" : "+"}{formatMoney(transfer.amount)}
                        </Text>
                      </View>
                    </View>
                ))}
                {paymentPlanOpen && !myTransfers.length && <Text style={[styles.emptyPlan, { color: palette.textSecondary }]}>Bạn không có giao dịch cần thanh toán</Text>}
              </View>
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
      <Modal visible={paymentModalOpen} transparent animationType="slide" onRequestClose={() => setPaymentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={[styles.paymentModal, { backgroundColor: palette.surface }]} elevation={4}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Thanh toán ngay</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: palette.surfaceMuted }]} onPress={() => setPaymentModalOpen(false)}>
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList data={paymentTransfers} keyExtractor={(item, index) => `${item.fromUserId}-${item.toUserId}-qr-${index}`}
              contentContainerStyle={styles.qrList}
              renderItem={({ item: transfer }) => {
                const qrUrl = getTransferQrUrl(transfer);
                return <View style={[styles.qrCard, { borderColor: palette.border }]}>
                  <Text style={[styles.qrTitle, { color: palette.textPrimary }]}>{transfer.fromUser.name} → {transfer.toUser.name}</Text>
                  <Text style={[styles.qrAmount, { color: transfer.fromUserId === currentUserId ? theme.colors.error : "#159A6F" }]}>
                    {transfer.fromUserId === currentUserId ? "-" : "+"}{formatMoney(transfer.amount)}
                  </Text>
                  {qrUrl ? <Image source={{ uri: qrUrl }} style={styles.modalQr} />
                    : <Text style={[styles.missingBank, { color: palette.textSecondary }]}>Người nhận chưa có thông tin ngân hàng</Text>}
                </View>;
              }}
              ListEmptyComponent={<Text style={[styles.emptyPlan, { color: palette.textSecondary }]}>Bạn không có giao dịch cần thanh toán</Text>}
            />
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  transferRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
  },
  transferAmountWrap: { flex: 1, alignItems: "flex-end" },
  missingBank: { marginTop: 5, fontSize: 9, maxWidth: 120, textAlign: "right" },
  summaryTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  groupPaymentButton: { minHeight: 50, marginTop: 16, borderRadius: 25, backgroundColor: "#0875D1", alignItems: "center", justifyContent: "center" },
  groupPaymentButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  paymentPlan: { marginTop: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  paymentPlanHeader: { minHeight: 60, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  paymentPlanTitleRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  paymentPlanText: { flex: 1, minWidth: 0 },
  paymentPlanEyebrow: { fontSize: 10, marginBottom: 2 },
  paymentPlanTitle: { fontSize: 15, fontWeight: "800" },
  paymentPlanAction: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  paymentPlanActionText: { color: "#AD7F1D", fontSize: 10, fontWeight: "700" },
  emptyPlan: { padding: 20, textAlign: "center", fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.5)" },
  paymentModal: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  qrList: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  qrCard: { padding: 14, borderWidth: 1, borderRadius: 16, alignItems: "center" },
  qrTitle: { fontSize: 13, fontWeight: "700" },
  qrAmount: { marginTop: 5, fontSize: 17, fontWeight: "800" },
  modalQr: { width: 220, height: 220, marginTop: 10, borderRadius: 10 },
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
    gap: 10,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 14,
    borderRadius: 16,
  },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statContent: { flex: 1, minWidth: 0 },
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
