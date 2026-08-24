import { api } from "@/src/services/api";
import type { TimelineItemType, Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface, Text } from "react-native-paper";
import ActionSheet from "../ActionSheet";
import AIChatModal from "./AIChatModal";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";

interface TimelineListProps {
  trip: Trip;
  refreshKey?: number;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
  onUpdate?: () => void;
  onSummaryChange?: (summary: {
    eyebrow: string;
    value: string;
    pill?: string;
  }) => void;
}

type FilterType = "all" | "active" | "upcoming" | "passed" | "today";

export default function TimelineList({
  trip,
  refreshKey = 0,
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
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItemType | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FilterType>("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getItemStatus = (item: TimelineItemType): FilterType => {
    if (!trip.startDate) return "upcoming";

    const now = currentTime;
    const itemDateTime = dayjs(trip.startDate)
      .add(item.day - 1, "day")
      .set("hour", dayjs(item.time, "HH:mm").hour())
      .set("minute", dayjs(item.time, "HH:mm").minute());

    const diffMinutes = now.diff(itemDateTime, "minute");

    if (diffMinutes >= 0 && diffMinutes < 60) {
      return "active";
    } else if (diffMinutes < 0) {
      return "upcoming";
    } else {
      return "passed";
    }
  };

  const isItemActive = (item: TimelineItemType): boolean => {
    return getItemStatus(item) === "active";
  };

  const isCurrentDay = (day: number): boolean => {
    if (!trip.startDate) return false;
    const tripStart = dayjs(trip.startDate);
    const currentTripDay = currentTime.diff(tripStart, "day") + 1;
    return day === currentTripDay;
  };

  const getTimeline = async () => {
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
  };

  useEffect(() => {
    void getTimeline();
  }, [refreshKey, trip.id]);

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...allData];

    // Filter by status
    if (selectedStatus !== "all") {
      if (selectedStatus === "today") {
        const currentDay = currentTime.diff(dayjs(trip.startDate), "day") + 1;
        data = data.filter((item) => item.day === currentDay);
      } else {
        data = data.filter((item) => getItemStatus(item) === selectedStatus);
      }
    }

    // Filter by specific day
    if (selectedDay !== null) {
      data = data.filter((item) => item.day === selectedDay);
    }

    return data;
  }, [allData, selectedStatus, selectedDay, currentTime, trip.startDate]);

  const groupedData = useMemo(() => {
    const map: Record<number, TimelineItemType[]> = {};
    filteredData.forEach((item) => {
      if (!map[item.day]) map[item.day] = [];
      map[item.day].push(item);
    });
    Object.keys(map).forEach((day) => {
      map[Number(day)].sort((a, b) => a.time.localeCompare(b.time));
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

  const getStatusCount = () => {
    const counts = {
      all: allData.length,
      active: 0,
      upcoming: 0,
      passed: 0,
      today: 0,
    };

    const currentDay = currentTime.diff(dayjs(trip.startDate), "day") + 1;

    allData.forEach((item) => {
      const status = getItemStatus(item);
      if (status === "active") counts.active++;
      if (status === "upcoming") counts.upcoming++;
      if (status === "passed") counts.passed++;
      if (item.day === currentDay) counts.today++;
    });

    return counts;
  };

  const statusCounts = getStatusCount();

  const availableDays = useMemo(() => {
    const days = new Set<number>();
    allData.forEach((item) => days.add(item.day));
    return Array.from(days).sort((a, b) => a - b);
  }, [allData]);

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
  const renderFilterChips = () => {
    if (allData.length === 0) return null;

    return (
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsContainer}
          contentContainerStyle={styles.filterChipsContent}
        >
          {/* Filter button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.chipWrapper,
              styles.filterChip,
              filterModalVisible && styles.chipWrapperActive,
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <View style={styles.chipContent}>
              <Ionicons
                name="filter-outline"
                size={16}
                color={
                  filterModalVisible ? COLORS.primary : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.chipText,
                  filterModalVisible && styles.chipTextActive,
                ]}
              >
                Bộ lọc
              </Text>
              {(selectedDay !== null || selectedStatus !== "all") && (
                <View style={styles.activeFilterDot} />
              )}
            </View>
          </TouchableOpacity>
          {/* All filter */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.chipWrapper,
              selectedStatus === "all" &&
                selectedDay === null &&
                styles.chipWrapperActive,
            ]}
            onPress={() => {
              setSelectedStatus("all");
              setSelectedDay(null);
            }}
          >
            <View style={styles.chipContent}>
              <Ionicons
                name="apps-outline"
                size={16}
                color={
                  selectedStatus === "all" && selectedDay === null
                    ? COLORS.primary
                    : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.chipText,
                  selectedStatus === "all" &&
                    selectedDay === null &&
                    styles.chipTextActive,
                ]}
              >
                Tất cả
              </Text>
              <View style={styles.chipCount}>
                <Text style={styles.chipCountText}>{statusCounts.all}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Active filter */}
          {statusCounts.active > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.chipWrapper,
                selectedStatus === "active" && styles.chipWrapperActive,
              ]}
              onPress={() => {
                setSelectedStatus("active");
                setSelectedDay(null);
              }}
            >
              <View style={styles.chipContent}>
                <View style={[styles.chipDot, styles.activeDot]} />
                <Text
                  style={[
                    styles.chipText,
                    selectedStatus === "active" && styles.chipTextActive,
                  ]}
                >
                  Đang diễn ra
                </Text>
                <View style={[styles.chipCount, styles.activeCount]}>
                  <Text style={styles.chipCountText}>
                    {statusCounts.active}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Upcoming filter */}
          {statusCounts.upcoming > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.chipWrapper,
                selectedStatus === "upcoming" && styles.chipWrapperActive,
              ]}
              onPress={() => {
                setSelectedStatus("upcoming");
                setSelectedDay(null);
              }}
            >
              <View style={styles.chipContent}>
                <View style={[styles.chipDot, styles.upcomingDot]} />
                <Text
                  style={[
                    styles.chipText,
                    selectedStatus === "upcoming" && styles.upcomingText,
                  ]}
                >
                  Sắp tới
                </Text>
                <View style={[styles.chipCount, styles.upcomingCount]}>
                  <Text style={styles.chipCountText}>
                    {statusCounts.upcoming}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Passed filter */}
          {statusCounts.passed > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.chipWrapper,
                selectedStatus === "passed" && styles.chipWrapperActive,
              ]}
              onPress={() => {
                setSelectedStatus("passed");
                setSelectedDay(null);
              }}
            >
              <View style={styles.chipContent}>
                <View style={[styles.chipDot, styles.passedDot]} />
                <Text
                  style={[
                    styles.chipText,
                    selectedStatus === "passed" && styles.passedText,
                  ]}
                >
                  Đã qua
                </Text>
                <View style={[styles.chipCount, styles.passedCount]}>
                  <Text style={styles.chipCountText}>
                    {statusCounts.passed}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Today filter */}
          {statusCounts.today > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.chipWrapper,
                selectedStatus === "today" && styles.chipWrapperActive,
              ]}
              onPress={() => {
                setSelectedStatus("today");
                setSelectedDay(null);
              }}
            >
              <View style={styles.chipContent}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={
                    selectedStatus === "today"
                      ? "#10B981"
                      : palette.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedStatus === "today" && styles.todayText,
                  ]}
                >
                  Hôm nay
                </Text>
                <View style={[styles.chipCount, styles.todayCount]}>
                  <Text style={styles.chipCountText}>{statusCounts.today}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderTimelineItem = (item: TimelineItemType, isActive: boolean) => {
    const isLeader = trip.isLeader && !trip.isCloseTrip;

    return (
      <Surface
        style={[styles.timelineItem, isActive && styles.timelineItemActive]}
        elevation={isActive ? 2 : 0}
      >
        <View style={styles.timelineItemContent}>
          <View style={styles.timelineLeft}>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {dayjs(item.time, "HH:mm").format("HH:mm")}
              </Text>
              {item.notify && (
                <View style={styles.notifyBadge}>
                  <Ionicons name="notifications" size={12} color="#F59E0B" />
                </View>
              )}
              {isActive && (
                <View style={styles.activeNowBadge}>
                  <Text style={styles.activeNowText}>Đang diễn ra</Text>
                </View>
              )}
            </View>

            <Text
              style={[styles.itemTitle, isActive && styles.itemTitleActive]}
            >
              {item.title}
            </Text>

            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

          {isLeader && (
            <View style={styles.timelineActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedItem(item);
                  setActionOpen(true);
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={22}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  const renderDaySection = (day: number) => {
    const items = groupedData[day];
    const isCurrent = isCurrentDay(day);

    if (!items || items.length === 0) return null;

    return (
      <View key={day} style={styles.daySection}>
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderLeft}>
            <Text style={[styles.dayText, isCurrent && styles.dayTextActive]}>
              Ngày {day}
            </Text>
          </View>
          {isCurrent && (
            <View style={styles.currentBadge}>
              <LinearGradient
                colors={COLORS.primaryGradient as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.currentBadgeGradient}
              >
                <Text style={styles.currentBadgeText}>Hôm nay</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        <View style={styles.timelineContainer}>
          <View style={styles.verticalLine} />
          <View style={styles.itemsContainer}>
            {items.map((item, index) => {
              const itemActive = isItemActive(item);
              const isLast = index === items.length - 1;
              return (
                <View key={item.id} style={styles.itemWrapper}>
                  <View
                    style={[
                      styles.connectorDot,
                      itemActive && styles.connectorDotActive,
                      isLast && styles.connectorDotLast,
                    ]}
                  />
                  {renderTimelineItem(item, itemActive)}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

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
            <Text style={styles.modalTitle}>Bộ lọc</Text>
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
            {/* Filter by Day */}
            {availableDays.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>📅 Ngày</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.daysContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.dayButton,
                      selectedDay === null && styles.dayButtonActive,
                    ]}
                    onPress={() => setSelectedDay(null)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDay === null && styles.dayButtonTextActive,
                      ]}
                    >
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {availableDays.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        selectedDay === day && styles.dayButtonActive,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          selectedDay === day && styles.dayButtonTextActive,
                        ]}
                      >
                        Ngày {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Filter by Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>⏰ Trạng thái</Text>
              <View style={styles.statusGrid}>
                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    selectedStatus === "all" && styles.statusCardActive,
                  ]}
                  onPress={() => setSelectedStatus("all")}
                >
                  <Text style={styles.statusIcon}>📋</Text>
                  <Text style={styles.statusName}>Tất cả</Text>
                  <Text style={styles.statusCount}>{statusCounts.all}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    selectedStatus === "active" && styles.statusCardActive,
                  ]}
                  onPress={() => setSelectedStatus("active")}
                >
                  <Text style={styles.statusIcon}>⚡</Text>
                  <Text style={styles.statusName}>Đang diễn ra</Text>
                  <Text style={styles.statusCount}>{statusCounts.active}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    selectedStatus === "upcoming" && styles.statusCardActive,
                  ]}
                  onPress={() => setSelectedStatus("upcoming")}
                >
                  <Text style={styles.statusIcon}>⏳</Text>
                  <Text style={styles.statusName}>Sắp tới</Text>
                  <Text style={styles.statusCount}>
                    {statusCounts.upcoming}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    selectedStatus === "passed" && styles.statusCardActive,
                  ]}
                  onPress={() => setSelectedStatus("passed")}
                >
                  <Text style={styles.statusIcon}>✅</Text>
                  <Text style={styles.statusName}>Đã qua</Text>
                  <Text style={styles.statusCount}>{statusCounts.passed}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    selectedStatus === "today" && styles.statusCardActive,
                  ]}
                  onPress={() => setSelectedStatus("today")}
                >
                  <Text style={styles.statusIcon}>📆</Text>
                  <Text style={styles.statusName}>Hôm nay</Text>
                  <Text style={styles.statusCount}>{statusCounts.today}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Show active filters info */}
            {(selectedStatus !== "all" || selectedDay !== null) && (
              <View style={styles.activeFiltersSection}>
                <Text style={styles.activeFiltersTitle}>
                  Bộ lọc đang áp dụng:
                </Text>
                <View style={styles.activeFiltersContainer}>
                  {selectedStatus !== "all" && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>
                        {selectedStatus === "active"
                          ? "Đang diễn ra"
                          : selectedStatus === "upcoming"
                            ? "Sắp tới"
                            : selectedStatus === "passed"
                              ? "Đã qua"
                              : "Hôm nay"}
                      </Text>
                    </View>
                  )}
                  {selectedDay !== null && (
                    <View style={styles.activeFilterBadge}>
                      <Text style={styles.activeFilterText}>
                        Ngày {selectedDay}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedStatus("all");
                setSelectedDay(null);
              }}
            >
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
                <Text style={styles.applyButtonText}>Xem kết quả</Text>
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

  const hasNoResults = filteredData.length === 0 && allData.length > 0;

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
            getTimeline();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      {trip.isLeader && !trip.isCloseTrip && (
        <View style={styles.aiToolbar}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.aiButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAiOpen(true);
            }}
          >
            <LinearGradient
              colors={
                palette.isDark
                  ? [palette.purpleLight, palette.primaryLight]
                  : ["#F5F3FF", "#EEF2FF"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiButtonGradient}
            >
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={17} color="#fff" />
              </View>
              <View style={styles.aiButtonCopy}>
                <Text style={styles.aiButtonTitle}>Lên lịch bằng AI</Text>
                <Text style={styles.aiButtonSubtitle}>
                  Tạo và tối ưu lịch trình tự động
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={palette.isDark ? "#C4B5FD" : "#7C3AED"}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
                  setSelectedStatus("all");
                  setSelectedDay(null);
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
    </ScrollView>
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
    paddingBottom: 96,
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
  aiToolbar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: palette.surface,
  },
  aiButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.isDark ? "#4C3E73" : "#DDD6FE",
  },
  aiButtonGradient: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  aiButtonCopy: {
    flex: 1,
  },
  aiButtonTitle: {
    color: palette.isDark ? "#E9D5FF" : "#4C1D95",
    fontSize: 14,
    fontWeight: "700",
  },
  aiButtonSubtitle: {
    color: palette.isDark ? "#C4B5FD" : "#7C3AED",
    fontSize: 11,
    marginTop: 2,
  },
});
