import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import type { ExpenseItem, Trip, UserGroupRole } from "@/src/type/trip";
import { COLORS, EXPENSE_STATUS, categories } from "@/src/utils/constants";
import { formatMoney, getDayFromTime } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

type FilterType = "all" | "today" | "thisWeek" | "highAmount" | "lowAmount";
type SortType = "newest" | "oldest" | "highest" | "lowest";

const ExpenseList = ({ trip }: ExpenseListProps) => {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedDay, setSelectedDay] = useState(1);
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

    // First, handle pending view
    if (showPending) {
      items = items.filter((i) => {
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

    // Filter by day
    items = items.filter(
      (i) => getDayFromTime(i.time, trip.startDate) === selectedDay,
    );

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
    selectedDay,
    trip.startDate,
    showPending,
    trip.isLeader,
    currentUserId,
    selectedCategory,
    selectedPayer,
    selectedFilter,
    sortBy,
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

  useFocusEffect(
    useCallback(() => {
      if (!trip.id) return;
      getExpenses();
      getMember();
    }, [trip.id]),
  );

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

  // Render filter chips
  const renderFilterChips = () => {
    if (showPending) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, styles.filterButton]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={14} color={COLORS.primary} />
          <Text style={[styles.filterChipText, { color: COLORS.primary }]}>
            Bộ lọc
          </Text>
          {hasActiveFilters && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === "all" &&
              !hasActiveFilters &&
              styles.filterChipActive,
          ]}
          onPress={() => {
            resetFilters();
          }}
        >
          <Ionicons
            name="options-outline"
            size={14}
            color={COLORS.textSecondary}
          />
          <Text style={styles.filterChipText}>Tất cả</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === "highAmount" && styles.filterChipActive,
          ]}
          onPress={() =>
            setSelectedFilter(
              selectedFilter === "highAmount" ? "all" : "highAmount",
            )
          }
        >
          <Ionicons name="trending-up" size={14} color={COLORS.error} />
          <Text style={styles.filterChipText}>&gt; 500k</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === "lowAmount" && styles.filterChipActive,
          ]}
          onPress={() =>
            setSelectedFilter(
              selectedFilter === "lowAmount" ? "all" : "lowAmount",
            )
          }
        >
          <Ionicons name="trending-down" size={14} color={COLORS.success} />
          <Text style={styles.filterChipText}>{"< 100k"}</Text>
        </TouchableOpacity>

        {selectedCategory !== "all" && (
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipActive]}
            onPress={() => setSelectedCategory("all")}
          >
            <Text style={styles.filterChipText}>{selectedCategory}</Text>
            <Ionicons name="close-circle" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {selectedPayer !== "all" && (
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipActive]}
            onPress={() => setSelectedPayer("all")}
          >
            <Text style={styles.filterChipText}>
              {availablePayers.find((p) => p.id === selectedPayer)?.name}
            </Text>
            <Ionicons name="close-circle" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    );
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
                color={COLORS.textSecondary}
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
                          ? COLORS.primary
                          : COLORS.textSecondary
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
              onPress={() => setFilterModalVisible(false)}
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
              if (!showPending) {
                resetFilters();
              }
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

        {/* Filter chips */}
        {renderFilterChips()}

        {/* TOTAL */}
        {!showPending && (
          <View style={styles.totalContainer}>
            <View style={styles.totalHeader}>
              <Text style={styles.totalLabel}>Tổng chi ngày {selectedDay}</Text>
              {filteredItems.length > 0 && (
                <Text style={styles.itemCount}>
                  {filteredItems.length} khoản
                </Text>
              )}
            </View>
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
        }
      />

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
    gap: 8,
  },
  dayChip: {
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
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterButton: {
    backgroundColor: COLORS.primary + "08",
    borderColor: COLORS.primary,
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
    color: COLORS.textSecondary,
  },
  itemCount: {
    fontSize: 11,
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
  clearFilterButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary + "10",
  },
  clearFilterText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
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
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
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
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  categoryButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  payerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  payerButtonActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  payerButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  payerButtonTextActive: {
    color: COLORS.primary,
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
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  amountButtonActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  amountButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  activeFiltersSection: {
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  activeFiltersTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  activeFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterBadge: {
    backgroundColor: COLORS.primary + "10",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  activeFilterText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
