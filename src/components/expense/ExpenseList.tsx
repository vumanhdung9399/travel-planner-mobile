import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip, UserGroupRole } from "@/src/type/trip";
import { COLORS, EXPENSE_STATUS, categories } from "@/src/utils/constants";
import { formatMoney, getDayFromTime } from "@/src/utils/helper";
import { exportPdf, formatPdfCurrency } from "@/src/utils/pdfExport";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface, Text } from "react-native-paper";
import ConfirmDialog from "../ConfirmDialog";
import { ExpenseCard } from "./ExpenseCard";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";

interface ExpenseListProps {
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
}

type FilterType = "all" | "today" | "thisWeek" | "highAmount" | "lowAmount";
type SortType = "newest" | "oldest" | "highest" | "lowest";

const getExpenseSemanticColors = (palette: AppPalette) => ({
  primary: palette.isDark ? "#8CCBFF" : COLORS.primary,
  success: palette.isDark ? "#6EE7B7" : COLORS.success,
  error: palette.isDark ? "#FDA4AF" : COLORS.error,
  warning: palette.isDark ? "#FDE68A" : "#8A5A00",
  warningBorder: palette.isDark ? "#805D15" : "#FACC15",
});

const ExpenseList = ({
  trip,
  refreshKey = 0,
  contentInsetTop = 0,
  onScrollOffsetChange,
  onExportReady,
  onSummaryChange,
}: ExpenseListProps) => {
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const semanticColors = useMemo(
    () => getExpenseSemanticColors(palette),
    [palette],
  );
  const router = useRouter();
  const { user } = useAuthStore();

  const [listExpenses, setListExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [countPending, setCountPending] = useState(0);
  const [members, setMembers] = useState<UserGroupRole[]>([]);

  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const [selectedPayer, setSelectedPayer] = useState<string>("all");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const currentUserId = String(user?.id);

  // Get unique categories from expenses
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    listExpenses.forEach((exp) => {
      if (exp.category) cats.add(exp.category);
    });
    return Array.from(cats);
  }, [listExpenses]);

  // Get unique payers
  const availablePayers = useMemo(() => {
    const payers = new Map<string, string>();
    listExpenses.forEach((exp) => {
      if (exp.paidBy?.id && exp.paidBy?.name) {
        payers.set(exp.paidBy.id, exp.paidBy.name);
      }
    });
    return Array.from(payers.entries()).map(([id, name]) => ({ id, name }));
  }, [listExpenses]);

  // Filter and sort expenses
  const filteredItems = useMemo(() => {
    let items = [...listExpenses];
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("vi");
    const matchesSearch = (item: ExpenseItem) =>
      !normalizedQuery ||
      [item.title, item.category, item.note, item.paidBy?.name]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("vi").includes(normalizedQuery),
        );

    // First, handle pending view
    if (showPending) {
      items = items.filter((i) => {
        const isPendingOrRejected = [
          EXPENSE_STATUS.PENDING,
          EXPENSE_STATUS.REJECTED,
        ].includes(i.status);

        if (trip.isLeader) {
          return i.status === EXPENSE_STATUS.PENDING && matchesSearch(i);
        }

        return (
          isPendingOrRejected &&
          (i.createdBy?.id === currentUserId || i.paidBy?.id === currentUserId) &&
          matchesSearch(i)
        );
      });

      // Sort pending items
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

    // Apply filters for approved expenses
    items = items.filter((i) => i.status === EXPENSE_STATUS.APPROVED);
    items = items.filter(matchesSearch);

    // Filter by category
    if (selectedCategory !== "all") {
      items = items.filter((i) => i.category === selectedCategory);
    }

    // Filter by payer
    if (selectedPayer !== "all") {
      items = items.filter((i) => i.paidBy?.id === selectedPayer);
    }

    // Apply amount filter
    if (selectedFilter === "highAmount") {
      items = items.filter((i) => Number(i.amount) >= 500000);
    } else if (selectedFilter === "lowAmount") {
      items = items.filter((i) => Number(i.amount) <= 100000);
    } else if (selectedFilter === "today") {
      const today = new Date().toDateString();
      items = items.filter((i) => new Date(i.time).toDateString() === today);
    } else if (selectedFilter === "thisWeek") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      items = items.filter((i) => new Date(i.time) >= weekAgo);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        items.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );
        break;
      case "oldest":
        items.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
        break;
      case "highest":
        items.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case "lowest":
        items.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
    }

    return items;
  }, [
    listExpenses,
    showPending,
    trip.isLeader,
    currentUserId,
    selectedCategory,
    selectedPayer,
    searchQuery,
    selectedFilter,
    sortBy,
  ]);

  const totalDay = useMemo(
    () =>
      listExpenses
        .filter((item) => item.status === EXPENSE_STATUS.APPROVED)
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [listExpenses],
  );

  useEffect(() => {
    onSummaryChange?.(
      showPending
        ? {
            eyebrow: "Các khoản đang chờ duyệt",
            value: `${countPending} khoản`,
            pill: "Chờ duyệt",
          }
        : {
            eyebrow: "Tổng chi chuyến đi",
            value: formatMoney(totalDay),
          },
    );
  }, [countPending, onSummaryChange, showPending, totalDay]);

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

  const getExpenses = useCallback(async () => {
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
  }, [trip.id]);

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

  useEffect(() => {
    if (!trip.id) return;
    void getExpenses();
    void getMember();
  }, [getExpenses, getMember, refreshKey, trip.id]);

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

  const handleExport = useCallback(async () => {
    const statusLabels: Record<string, string> = {
      [EXPENSE_STATUS.PENDING]: "Chờ duyệt",
      [EXPENSE_STATUS.APPROVED]: "Đã duyệt",
      [EXPENSE_STATUS.REJECTED]: "Từ chối",
    };
    await exportPdf(
      `${trip.name} - Chi phí`,
      ["Ngày", "Thời gian", "Khoản chi", "Danh mục", "Số tiền", "Người trả", "Người tham gia", "Trạng thái", "Ghi chú"],
      listExpenses.map((item) => [
        getDayFromTime(item.time, trip.startDate),
        new Date(item.time).toLocaleString("vi-VN"),
        item.title,
        item.category,
        formatPdfCurrency(item.amount),
        item.paidBy?.name,
        item.participants?.map((participant) => participant.name).join("; "),
        statusLabels[item.status] || item.status,
        item.note,
      ]),
    );
  }, [listExpenses, trip.name, trip.startDate]);

  useEffect(() => {
    onExportReady?.(handleExport);
    return () => onExportReady?.(null);
  }, [handleExport, onExportReady]);

  const resetFilters = () => {
    setSelectedFilter("all");
    setSelectedCategory("all");
    setSelectedPayer("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    selectedFilter !== "all" ||
    selectedCategory !== "all" ||
    selectedPayer !== "all" ||
    sortBy !== "newest";

  const getSortLabel = (sortValue: SortType) => {
    switch (sortValue) {
      case "newest":
        return "Mới nhất";
      case "oldest":
        return "Cũ nhất";
      case "highest":
        return "Cao nhất";
      case "lowest":
        return "Thấp nhất";
      default:
        return "Mới nhất";
    }
  };

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bộ lọc chi phí</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons
                name="close-outline"
                size={24}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalScroll}
          >
            {/* Sort by */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>📌 Sắp xếp theo</Text>
              <View style={styles.sortGrid}>
                {[
                  { id: "newest", label: "Mới nhất", icon: "time-outline" },
                  { id: "oldest", label: "Cũ nhất", icon: "calendar-outline" },
                  { id: "highest", label: "Cao nhất", icon: "arrow-up" },
                  { id: "lowest", label: "Thấp nhất", icon: "arrow-down" },
                ].map((sort) => (
                  <TouchableOpacity
                    key={sort.id}
                    style={[
                      styles.sortButton,
                      sortBy === sort.id && styles.sortButtonActive,
                    ]}
                    onPress={() => setSortBy(sort.id as SortType)}
                  >
                    <Ionicons
                      name={sort.icon as any}
                      size={16}
                      color={
                        sortBy === sort.id
                          ? semanticColors.primary
                          : palette.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.sortButtonText,
                        sortBy === sort.id && styles.sortButtonTextActive,
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter by category */}
            {availableCategories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>🏷️ Danh mục</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === "all" && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory("all")}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === "all" &&
                          styles.categoryButtonTextActive,
                      ]}
                    >
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {availableCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        selectedCategory === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          selectedCategory === cat &&
                            styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Filter by payer */}
            {availablePayers.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>👤 Người trả</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.payerButton,
                      selectedPayer === "all" && styles.payerButtonActive,
                    ]}
                    onPress={() => setSelectedPayer("all")}
                  >
                    <Text
                      style={[
                        styles.payerButtonText,
                        selectedPayer === "all" && styles.payerButtonTextActive,
                      ]}
                    >
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {availablePayers.map((payer) => (
                    <TouchableOpacity
                      key={payer.id}
                      style={[
                        styles.payerButton,
                        selectedPayer === payer.id && styles.payerButtonActive,
                      ]}
                      onPress={() => setSelectedPayer(payer.id)}
                    >
                      <Text
                        style={[
                          styles.payerButtonText,
                          selectedPayer === payer.id &&
                            styles.payerButtonTextActive,
                        ]}
                      >
                        {payer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Amount range filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>💰 Khoảng giá</Text>
              <View style={styles.amountGrid}>
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    selectedFilter === "all" && styles.amountButtonActive,
                  ]}
                  onPress={() => setSelectedFilter("all")}
                >
                  <Text style={styles.amountButtonText}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    selectedFilter === "lowAmount" && styles.amountButtonActive,
                  ]}
                  onPress={() => setSelectedFilter("lowAmount")}
                >
                  <Text style={styles.amountButtonText}>{"< 100k"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    selectedFilter === "highAmount" &&
                      styles.amountButtonActive,
                  ]}
                  onPress={() => setSelectedFilter("highAmount")}
                >
                  <Text style={styles.amountButtonText}>{"> 500k"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active filters summary */}
            {hasActiveFilters && (
              <View style={styles.activeFiltersSection}>
                <Text style={styles.activeFiltersTitle}>
                  Bộ lọc đang áp dụng:
                </Text>
                <View style={styles.activeFiltersContainer}>
                  {sortBy !== "newest" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>
                        Sắp xếp: {getSortLabel(sortBy)}
                      </Text>
                    </View>
                  )}
                  {selectedCategory !== "all" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>
                        Danh mục: {selectedCategory}
                      </Text>
                    </View>
                  )}
                  {selectedPayer !== "all" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>
                        Người trả:{" "}
                        {
                          availablePayers.find((p) => p.id === selectedPayer)
                            ?.name
                        }
                      </Text>
                    </View>
                  )}
                  {selectedFilter === "highAmount" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>Trên 500k</Text>
                    </View>
                  )}
                  {selectedFilter === "lowAmount" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>Dưới 100k</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowPending(false);
                setFilterModalVisible(false);
              }}
            >
              <LinearGradient
                colors={COLORS.primaryGradient as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={semanticColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: contentInsetTop }}
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
          }}
          tintColor={semanticColors.primary}
          colors={[semanticColors.primary]}
          progressBackgroundColor={palette.surface}
        />
      }
    >
      {/* HEADER */}
      <Surface style={styles.header} elevation={0}>
        <View style={styles.expenseSectionHeader}>
          <View>
            <Text style={styles.expenseSectionTitle}>Chi phí</Text>
            <Text style={styles.expenseSectionCount}>{filteredItems.length} khoản</Text>
          </View>
          <View style={styles.expenseHeaderActions}>
            <TouchableOpacity
              style={[
                styles.expenseHeaderButton,
                searchVisible && styles.expenseHeaderButtonActive,
              ]}
              onPress={() => setSearchVisible((current) => !current)}
              accessibilityLabel="Tìm kiếm chi phí"
            >
              <Ionicons name="search-outline" size={20} color={semanticColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.expenseHeaderButton,
                hasActiveFilters && styles.expenseHeaderButtonActive,
              ]}
              onPress={() => setFilterModalVisible(true)}
              accessibilityLabel="Mở bộ lọc chi phí"
            >
              <Ionicons name="options-outline" size={20} color={semanticColors.primary} />
              {hasActiveFilters ? <View style={styles.compactFilterDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.approvalHeaderButton,
                showPending && styles.approvalHeaderButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPending((current) => !current);
                if (!showPending) resetFilters();
              }}
              accessibilityLabel="Xem chi phí chờ duyệt"
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={showPending ? semanticColors.warning : palette.textSecondary}
              />
              <Text
                style={[
                  styles.approvalHeaderText,
                  showPending && styles.approvalHeaderTextActive,
                ]}
              >
                Duyệt
              </Text>
              <View
                style={[
                  styles.approvalCount,
                  countPending > 0 && styles.approvalCountActive,
                ]}
              >
                <Text style={styles.approvalCountText}>{countPending}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {searchVisible ? (
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color={palette.textSecondary} />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm khoản chi, người trả..."
              placeholderTextColor={palette.textLight}
              style={[styles.searchInput, { color: palette.textPrimary }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={palette.textLight} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

      </Surface>

      {/* LIST */}
      <View style={styles.listContent}>
        {filteredItems.map((item) => (
          <ExpenseCard
            key={item.id}
            trip={trip}
            item={item}
            currentUserId={currentUserId}
            categories={categories}
            users={members || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApproval={handleApproval}
            onReject={handleReject}
            isApproval={trip.isLeader && item.status === EXPENSE_STATUS.PENDING}
            isPendingView={
              !trip.isLeader && item.status === EXPENSE_STATUS.PENDING
            }
          />
        ))}
        {filteredItems.length === 0 ? (
          <Surface style={styles.emptyContainer} elevation={0}>
            <Text style={styles.emptyEmoji}>
              {hasActiveFilters && !showPending ? "🔍" : "💰"}
            </Text>
            <Text style={styles.emptyText}>
              {hasActiveFilters && !showPending
                ? "Không tìm thấy chi phí nào"
                : "Chưa có chi phí nào"}
            </Text>
            {hasActiveFilters && !showPending && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={resetFilters}
              >
                <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </Surface>
        ) : null}
      </View>

      {renderFilterModal()}

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
    </ScrollView>
  );
};

const createStyles = (palette: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  header: {
    backgroundColor: palette.background,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginBottom: 6,
  },
  expenseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  expenseSectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  expenseSectionCount: {
    color: palette.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  expenseHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  expenseHeaderButton: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseHeaderButtonActive: {
    borderColor: getExpenseSemanticColors(palette).primary,
    backgroundColor: palette.primaryLight,
  },
  approvalHeaderButton: {
    height: 38,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  approvalHeaderButtonActive: {
    borderColor: getExpenseSemanticColors(palette).warningBorder,
    backgroundColor: palette.warningLight,
  },
  approvalHeaderText: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  approvalHeaderTextActive: {
    color: getExpenseSemanticColors(palette).warning,
  },
  approvalCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: palette.surfaceMuted,
  },
  approvalCountActive: {
    backgroundColor: COLORS.coral,
  },
  approvalCountText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  searchField: {
    minHeight: 42,
    marginBottom: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
  },
  categoryRail: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  categoryItem: {
    height: 34,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  categoryItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  categoryLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 9,
  },
  dayScroll: {
    flexGrow: 1,
    gap: 8,
  },
  dayChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textSecondary,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  dayChipTextActive: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  sortButtonCompact: {
    height: 34,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sortButtonCompactText: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  pendingChip: {
    minWidth: 43,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  pendingChipActive: {
    backgroundColor: palette.warningLight,
    borderColor: getExpenseSemanticColors(palette).warningBorder,
  },
  pendingChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  pendingChipTextActive: {
    color: getExpenseSemanticColors(palette).warning,
  },
  pendingChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  compactFilterButton: {
    position: "relative",
    width: 36,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: getExpenseSemanticColors(palette).primary,
    backgroundColor: palette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  compactFilterDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.coral,
  },
  filterChipsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterChipsContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    position: "relative",
  },
  filterChipActive: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  filterChipText: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  filterButton: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  activeDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  totalContainer: {
    marginTop: 12,
  },
  totalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  itemCount: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: getExpenseSemanticColors(palette).success,
  },
  pendingHint: {
    fontSize: 12,
    color: getExpenseSemanticColors(palette).warning,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 96,
    gap: 12,
  },
  emptyContainer: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: palette.textSecondary,
  },
  clearFilterButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.primaryLight,
  },
  clearFilterText: {
    fontSize: 13,
    color: getExpenseSemanticColors(palette).primary,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.isDark
      ? "rgba(0,0,0,0.72)"
      : "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalScroll: {
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 12,
  },
  sortGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sortButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  sortButtonTextActive: {
    color: getExpenseSemanticColors(palette).primary,
    fontWeight: "500",
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  categoryButtonText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  categoryButtonTextActive: {
    color: getExpenseSemanticColors(palette).primary,
    fontWeight: "500",
  },
  payerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 8,
  },
  payerButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  payerButtonText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  payerButtonTextActive: {
    color: getExpenseSemanticColors(palette).primary,
    fontWeight: "500",
  },
  amountGrid: {
    flexDirection: "row",
    gap: 12,
  },
  amountButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
  },
  amountButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: getExpenseSemanticColors(palette).primary,
  },
  amountButtonText: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  activeFiltersSection: {
    padding: 16,
    backgroundColor: palette.surfaceMuted,
  },
  activeFiltersTitle: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 8,
  },
  activeFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterBadge: {
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  activeFilterText: {
    fontSize: 12,
    color: getExpenseSemanticColors(palette).primary,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  applyButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ExpenseList;
