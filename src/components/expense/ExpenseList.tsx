import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip } from "@/src/type/trip";
import { COLORS, EXPENSE_STATUS, categories } from "@/src/utils/constants";
import { formatMoney, getDayFromTime } from "@/src/utils/helper";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Surface, Text } from "react-native-paper";
import ConfirmDialog from "../ConfirmDialog";
import { ExpenseCard } from "./ExpenseCard";

interface ExpenseListProps {
  trip: Trip;
}

const ExpenseList = ({ trip }: ExpenseListProps) => {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedDay, setSelectedDay] = useState(1);
  const [listExpenses, setListExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [countPending, setCountPending] = useState(0);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const currentUserId = String(user?.id);

  const days = useMemo(() => {
    const result = listExpenses.map((i) =>
      getDayFromTime(i.time, trip.startDate),
    );
    return Array.from(new Set(result)).sort((a, b) => a - b);
  }, [listExpenses, trip.startDate]);

  const filteredItems = useMemo(() => {
    if (showPending) {
      const items = listExpenses.filter((i) => {
        const isPendingOrRejected = [
          EXPENSE_STATUS.PENDING,
          EXPENSE_STATUS.REJECTED,
        ].includes(i.status);

        if (trip.isLeader) {
          return i.status === EXPENSE_STATUS.PENDING;
        }

        return (
          isPendingOrRejected &&
          (i.createdBy?.id === currentUserId || i.paidBy?.id === currentUserId)
        );
      });

      return items.sort((a, b) => {
        if (
          a.status === EXPENSE_STATUS.PENDING &&
          b.status !== EXPENSE_STATUS.PENDING
        )
          return -1;
        if (
          a.status !== EXPENSE_STATUS.PENDING &&
          b.status === EXPENSE_STATUS.PENDING
        )
          return 1;
        return 0;
      });
    }

    return listExpenses.filter((i) => {
      return (
        i.status === EXPENSE_STATUS.APPROVED &&
        getDayFromTime(i.time, trip.startDate) === selectedDay
      );
    });
  }, [
    listExpenses,
    selectedDay,
    trip.startDate,
    showPending,
    trip.isLeader,
    currentUserId,
  ]);

  const totalDay = useMemo(
    () => filteredItems.reduce((sum, i) => sum + Number(i.amount), 0),
    [filteredItems],
  );

  useEffect(() => {
    const count = listExpenses.filter((e) => {
      const isPending = e.status === EXPENSE_STATUS.PENDING;
      if (trip.isLeader) return isPending;
      return (
        isPending &&
        (e.createdBy?.id === currentUserId || e.paidBy?.id === currentUserId)
      );
    }).length;
    setCountPending(count);
  }, [listExpenses, trip.isLeader, currentUserId]);

  useEffect(() => {
    if (!trip.id) return;
    getExpenses();
  }, [trip.id]);

  const getExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get<ExpenseItem[]>(`/expenses/${trip.id}`);
      setListExpenses(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEdit = (item: ExpenseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trips/${trip.id}/expense-form?expenseId=${item.id}`);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      title: "Xóa chi phí",
      message: "Bạn có chắc chắn muốn xóa chi phí này? Không thể hoàn tác.",
      onConfirm: () => deleteExpense(id),
    });
    setConfirmOpen(true);
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${trip.id}/${id}`);
      getExpenses();
    } catch {
    } finally {
      setConfirmOpen(false);
    }
  };

  const handleApproval = (id: string) => {
    setConfirmConfig({
      title: "Duyệt chi phí",
      message: "Xác nhận duyệt chi phí này?",
      onConfirm: () => approveExpense(id),
    });
    setConfirmOpen(true);
  };

  const approveExpense = async (id: string) => {
    try {
      await api.post(`/expenses/${trip.id}/${id}/approval`);
      getExpenses();
    } catch {
    } finally {
      setConfirmOpen(false);
    }
  };

  const handleReject = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trips/${trip.id}/expense-reject?expenseId=${id}`);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Surface style={styles.header} elevation={0}>
        {/* DAY SCROLL */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScroll}
        >
          {days.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.dayChip,
                d === selectedDay && !showPending && styles.dayChipActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(d);
                setShowPending(false);
              }}
            >
              {d === selectedDay && !showPending ? (
                <LinearGradient
                  colors={COLORS.primaryGradient as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dayChipGradient}
                >
                  <Text style={styles.dayChipTextActive}>Ngày {d}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.dayChipText}>Ngày {d}</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.pendingChip,
              showPending && styles.pendingChipActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPending((prev) => !prev);
            }}
          >
            <Text
              style={[
                styles.pendingChipText,
                showPending && styles.pendingChipTextActive,
              ]}
            >
              ⏳ {countPending}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* TOTAL */}
        {!showPending && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng chi ngày {selectedDay}</Text>
            <Text style={styles.totalAmount}>{formatMoney(totalDay)}</Text>
          </View>
        )}

        {showPending && (
          <Text style={styles.pendingHint}>Các khoản đang chờ duyệt</Text>
        )}
      </Surface>

      {/* LIST */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            trip={trip}
            item={item}
            currentUserId={currentUserId}
            categories={categories}
            users={trip.group?.members || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApproval={handleApproval}
            onReject={handleReject}
            isApproval={trip.isLeader && item.status === EXPENSE_STATUS.PENDING}
            isPendingView={
              !trip.isLeader && item.status === EXPENSE_STATUS.PENDING
            }
          />
        )}
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
        ListEmptyComponent={
          <Surface style={styles.emptyContainer} elevation={0}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyText}>Chưa có chi phí nào</Text>
          </Surface>
        }
      />

      <ConfirmDialog
        visible={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Xác nhận"
        cancelText="Hủy"
        type={confirmConfig.title === "Xóa chi phí" ? "danger" : "info"}
        onConfirm={confirmConfig.onConfirm}
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
  header: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayScroll: {
    paddingBottom: 8,
  },
  dayChip: {
    marginRight: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  dayChipGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayChipTextActive: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  pendingChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingChipActive: {
    backgroundColor: "#facc15",
    borderColor: "#facc15",
  },
  pendingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pendingChipTextActive: {
    color: "#000",
  },
  totalContainer: {
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.success,
  },
  pendingHint: {
    fontSize: 12,
    color: "#facc15",
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 12,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
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

export default ExpenseList;
