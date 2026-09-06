import TimelineTypeIcon from "./TimelineTypeIcon";
import { timelineClock } from "@/src/utils/tripDetail";
import { TripContentScrollView } from '@/src/components/trip/TripDetailContent';
import { TIMELINE_TYPE_OPTIONS } from "@/src/utils/travelOptions";
import { api } from "@/src/services/api";
import type { TimelineItemType, Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,

  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Chip, Dialog, Portal, Surface, Text } from "react-native-paper";
import ActionSheet from "../ActionSheet";
import AIChatModal from "./AIChatModal";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";

interface TimelineListProps {
  trip: Trip;
  refreshKey?: number;
  createActionOpen?: boolean;
  onCreateActionClose?: () => void;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
  onUpdate?: () => void;
  onSummaryChange?: (summary: {
    eyebrow: string;
    value: string;
    pill?: string;
  }) => void;
}

export default function TimelineList({
  trip,
  refreshKey = 0,
  createActionOpen = false,
  onCreateActionClose = () => {},
  contentInsetTop = 0,
  onScrollOffsetChange,
  onUpdate,
  onSummaryChange,
}: TimelineListProps) {
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const [allData, setAllData] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItemType | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [reminderFilter, setReminderFilter] = useState("all");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const getTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<TimelineItemType[]>(
        `/timelines/trip/${trip.id}`,
      );
      setAllData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trip.id]);

  useEffect(() => {
    // Fetch this trip again when returning from a content edit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getTimeline();
  }, [refreshKey, getTimeline]);

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...allData];

    data = data.filter((item) => {
      const hour = Number(timelineClock(item.time).slice(0, 2));
      if (timeFilter === "morning" && hour >= 12) return false;
      if (timeFilter === "afternoon" && (hour < 12 || hour >= 18)) return false;
      if (timeFilter === "evening" && hour < 18) return false;
      if (reminderFilter === "withReminder" && !item.notify) return false;
      if (reminderFilter === "withoutReminder" && item.notify) return false;
      return !typeFilters.length || typeFilters.includes(item.type || "other");
    });    // Filter by specific day
    if (selectedDay !== null) {
      data = data.filter((item) => item.day === selectedDay);
    }

    return data;
  }, [allData, selectedDay, timeFilter, reminderFilter, typeFilters]);

  const groupedData = useMemo(() => {
    const map: Record<number, TimelineItemType[]> = {};
    filteredData.forEach((item) => {
      if (!map[item.day]) map[item.day] = [];
      map[item.day].push(item);
    });
    Object.keys(map).forEach((day) => {
      map[Number(day)].sort((a, b) => timelineClock(a.time).localeCompare(timelineClock(b.time)));
    });
    return map;
  }, [filteredData]);

  const sortedDays = useMemo(() => {
    return Object.keys(groupedData)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedData]);

  const handleConfirmDelete = async (id?: string) => {
    if (!id) return;
    try {
      await api.delete(`/timelines/${id}`);
      getTimeline();
      onUpdate?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const availableDays = Array.from(new Set(allData.map((item) => item.day))).sort((a, b) => a - b);

  useEffect(() => {
    onSummaryChange?.({
      eyebrow:
        selectedDay === null
          ? "Lịch trình chuyến đi"
          : `Lịch trình Ngày ${selectedDay}`,
      value: `${filteredData.length} hoạt động`,
      pill:
        selectedDay === null
          ? `${availableDays.length} ngày`
          : `Ngày ${selectedDay}`,
    });
  }, [
    availableDays.length,
    filteredData.length,
    onSummaryChange,
    selectedDay,
  ]);

  // Render filter chips
  // Render filter chips - Version cải tiến
  const resetFilters = () => { setSelectedDay(null); setTimeFilter("all"); setReminderFilter("all"); setTypeFilters([]); };
  const activeFilters = Number(timeFilter !== "all") + Number(reminderFilter !== "all") + Number(typeFilters.length > 0);
  const renderFilterChips = () => allData.length > 0 && <View style={{ paddingHorizontal: 12, gap: 12 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {[null, ...availableDays].map(day => { const active = selectedDay === day; const date = day === null ? null : dayjs(trip.startDate).add(day - 1, "day"); return <TouchableOpacity key={day ?? "all"} onPress={() => setSelectedDay(day)} accessibilityState={{ selected: active }} style={{ width: 96, minHeight: 64, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: active ? COLORS.primary : palette.border, backgroundColor: active ? COLORS.primary : palette.surface, justifyContent: "center" }}>
        <Text style={{ fontSize: 8.5, fontWeight: "700", color: active ? "#FFFFFFC7" : palette.textSecondary }}>{day === null ? "LỊCH TRÌNH" : `Ngày ${day}`}</Text>
        <Text style={{ fontSize: 14, fontWeight: "800", color: active ? "white" : palette.textPrimary }}>{day === null ? "Tất cả" : date?.format("DD/MM")}</Text>
        <Text style={{ fontSize: 8.5, color: active ? "#FFFFFFC7" : palette.textSecondary }}>{day === null ? `${allData.length} hoạt động` : new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date!.toDate())}</Text>
      </TouchableOpacity>; })}
    </ScrollView>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="calendar-outline" size={19} color={COLORS.primary} /><Text style={{ flex: 1, fontSize: 11, color: COLORS.primary }}>{selectedDay === null ? "Tất cả các ngày" : dayjs(trip.startDate).add(selectedDay - 1, "day").format("DD/MM/YYYY")}</Text><Text style={{ fontSize: 11, color: palette.textSecondary }}>{filteredData.length} hoạt động</Text><TouchableOpacity onPress={() => setFilterModalVisible(true)} accessibilityLabel="Mở bộ lọc nâng cao" style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 8, minHeight: 30, borderRadius: 8, backgroundColor: activeFilters ? COLORS.primary : palette.surface }}><Ionicons name="options-outline" size={15} color={activeFilters ? "white" : COLORS.primary} /><Text style={{ fontSize: 10, color: activeFilters ? "white" : COLORS.primary }}>Lọc{activeFilters ? ` (${activeFilters})` : ""}</Text></TouchableOpacity></View>
  </View>;
  const renderDaySection = (day: number) => {
    const items = groupedData[day];
    if (!items?.length) return null;
    return <View key={day} style={{ marginBottom: 12 }}>
      {selectedDay === null && <View style={{ marginBottom: 9, marginTop: 4 }}><Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: "800", letterSpacing: .8 }}>NGÀY {day} · {dayjs(trip.startDate).add(day - 1, "day").format("DD/MM/YYYY")}</Text><Text style={{ fontSize: 16, fontWeight: "800", marginTop: 2 }}>{items.length} hoạt động</Text></View>}
      {items.map((item, index) => <View key={item.id || index} style={{ flexDirection: "row", gap: 3, minHeight: item.description?.trim() ? 116 : 82 }}>
        <View style={{ width: 42, alignItems: "center" }}>{index < items.length - 1 && <View style={{ position: "absolute", top: 31, bottom: -1, width: 2, backgroundColor: palette.border }} />}<View style={{ width: 34, height: 34, borderWidth: 4, borderColor: palette.surface, backgroundColor: palette.primaryLight, borderRadius: 17, alignItems: "center", justifyContent: "center" }}><TimelineTypeIcon type={item.type} /></View></View>
        <Surface elevation={0} style={{ flex: 1, marginBottom: 11, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="time-outline" size={14} color={COLORS.primary} /><Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: "800" }}>{timelineClock(item.time)}</Text>{item.notify && <Ionicons name="notifications" size={14} color="#F59E0B" />}<View style={{ flex: 1 }} />{trip.isLeader && !trip.isCloseTrip && <TouchableOpacity accessibilityLabel={`Tuỳ chọn hoạt động ${item.title}`} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }} onPress={() => { setSelectedItem(item); setActionOpen(true); }}><Ionicons name="ellipsis-horizontal" size={20} color={palette.textSecondary} /></TouchableOpacity>}</View>
          <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 19, fontWeight: "600" }}>{item.title}</Text>
          {!!item.description?.trim() && <Text style={{ fontSize: 11, lineHeight: 16, color: palette.textSecondary, marginTop: 4 }}>{item.description}</Text>}
        </Surface>
      </View>)}
    </View>;
  };

  const renderFilterModal = () => <Portal><Dialog visible={filterModalVisible} onDismiss={() => setFilterModalVisible(false)} style={{ backgroundColor: palette.surface }}>
    <Dialog.Title>Bộ lọc lịch trình</Dialog.Title>
    <Dialog.ScrollArea><ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
      <Text style={{ fontWeight: "800" }}>Buổi trong ngày</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[{ value: "all", label: "Tất cả" }, { value: "morning", label: "Buổi sáng" }, { value: "afternoon", label: "Buổi chiều" }, { value: "evening", label: "Buổi tối" }].map((option) => <Chip key={option.value} selected={timeFilter === option.value} onPress={() => setTimeFilter(option.value)}>{option.label}</Chip>)}</View>
      <Text style={{ fontWeight: "800" }}>Nhắc nhở</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[{ value: "all", label: "Tất cả" }, { value: "withReminder", label: "Có nhắc nhở" }, { value: "withoutReminder", label: "Không nhắc nhở" }].map((option) => <Chip key={option.value} selected={reminderFilter === option.value} onPress={() => setReminderFilter(option.value)}>{option.label}</Chip>)}</View>
      <Text style={{ fontWeight: "800" }}>Loại hoạt động</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{TIMELINE_TYPE_OPTIONS.map((option) => <Chip key={option.value} selected={typeFilters.includes(option.value)} onPress={() => setTypeFilters((current) => current.includes(option.value) ? current.filter((value) => value !== option.value) : [...current, option.value])}>{option.icon} {option.label}</Chip>)}</View>
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions><Button onPress={resetFilters}>Đặt lại</Button><Button onPress={() => setFilterModalVisible(false)}>Áp dụng</Button></Dialog.Actions>
  </Dialog></Portal>;
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const hasNoResults = filteredData.length === 0 && allData.length > 0;

  return (
    <TripContentScrollView
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
            getTimeline();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      {renderFilterChips()}

      {sortedDays.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Surface style={styles.emptyCard} elevation={0}>
            <Text style={styles.emptyEmoji}>{hasNoResults ? "🔍" : "📅"}</Text>
            <Text style={styles.emptyTitle}>
              {hasNoResults ? "Không tìm thấy kết quả" : "Chưa có lịch trình"}
            </Text>
            <Text style={styles.emptySubtext}>
              {hasNoResults
                ? "Thử thay đổi bộ lọc hoặc xem tất cả hoạt động"
                : "Thêm các hoạt động cho chuyến đi của bạn"}
            </Text>
            {hasNoResults && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  resetFilters();
                }}
              >
                <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </Surface>
        </View>
      ) : (
        <View style={styles.listContent}>
          {sortedDays.map((day) => renderDaySection(day))}
        </View>
      )}

      <ActionSheet
        open={createActionOpen && !!trip.isLeader && !trip.isCloseTrip}
        animated={false}
        onClose={onCreateActionClose}
        actions={[
          {
            label: "Tạo hoạt động thủ công",
            icon: "add-outline",
            onPress: () => router.push(`/trips/${trip.id}/timeline-form`),
          },
          {
            label: "Gợi ý lịch trình bằng AI",
            icon: "sparkles-outline",
            onPress: () => setAiOpen(true),
          },
        ]}
      />
      {renderFilterModal()}
      <AIChatModal
        open={aiOpen}
        trip={trip}
        existingTimeline={allData}
        onClose={() => setAiOpen(false)}
        onUpdated={() => {
          getTimeline();
          onUpdate?.();
        }}
      />
      <ActionSheet
        open={actionOpen}
        onClose={() => {
          setActionOpen(false);
          setSelectedItem(null);
        }}
        actions={[
          {
            label: "Sửa lịch trình",
            icon: "pencil-outline",
            onPress: () => {
              if (selectedItem) {
                  router.push(
                    `/trips/${trip.id}/timeline-form?timelineId=${selectedItem.id}` as any,
                  );
              }
            },
          },
          {
            label: "Xóa lịch trình",
            icon: "trash-outline",
            color: COLORS.error,
            onPress: () => handleConfirmDelete(selectedItem?.id),
          },
        ]}
      />
    </TripContentScrollView>
  );
}

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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 0,
  },
  filterChipsContainer: {
    backgroundColor: palette.surface,
    paddingVertical: 11,
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipWrapperActive: {
    backgroundColor: palette.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 32,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  clearFilterButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.primaryLight,
  },
  clearFilterText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  dayTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  currentBadge: {
    borderRadius: 12,
    overflow: "hidden",
  },
  currentBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 28,
  },
  verticalLine: {
    position: "absolute",
    left: 6,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: palette.border,
  },
  itemsContainer: {
    gap: 12,
  },
  itemWrapper: {
    position: "relative",
  },
  connectorDot: {
    position: "absolute",
    left: -25,
    top: 16,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: palette.background,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  connectorDotActive: {
    backgroundColor: COLORS.primary,
    width: 13,
    height: 13,
    borderRadius: 7,
    left: -26,
  },
  connectorDotLast: {
    // Style cho dot cuối cùng nếu cần
  },
  timelineItem: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    shadowColor: palette.isDark ? "#000000" : "#3D4E62",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  timelineItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: palette.primaryLight,
  },
  timelineItemContent: {
    flexDirection: "row",
    padding: 14,
  },
  timelineLeft: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  notifyBadge: {
    backgroundColor: palette.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  timelineActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  activeNowBadge: {
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeNowText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primary,
  },
  itemTitleActive: {
    color: COLORS.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
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
  daysContainer: {
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dayButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  dayButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: "30%",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statusCardActive: {
    backgroundColor: palette.primaryLight,
    borderColor: COLORS.primary,
  },
  statusIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statusName: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textPrimary,
    marginBottom: 2,
  },
  statusCount: {
    fontSize: 11,
    color: palette.textSecondary,
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
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
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

  filterContainer: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    overflow: "hidden",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipCount: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  activeCount: {
    backgroundColor: palette.primaryLight,
  },
  upcomingCount: {
    backgroundColor: palette.warningLight,
  },
  passedCount: {
    backgroundColor: palette.surfaceMuted,
  },
  todayCount: {
    backgroundColor: palette.successLight,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
  },
  upcomingDot: {
    backgroundColor: "#F59E0B",
  },
  passedDot: {
    backgroundColor: palette.textLight,
  },
  activeFilterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: "absolute",
    top: -2,
    right: -8,
  },
  upcomingText: {
    color: "#F59E0B",
  },
  passedText: {
    color: palette.textSecondary,
  },
  todayText: {
    color: "#10B981",
  },
  filterChip: {
    backgroundColor: palette.surfaceMuted,
  },
});
