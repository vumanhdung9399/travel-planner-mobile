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
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface, Text } from "react-native-paper";

interface TimelineListProps {
  trip: Trip;
  onUpdate?: () => void;
}

type FilterType = "all" | "active" | "upcoming" | "passed" | "today";

export default function TimelineList({ trip, onUpdate }: TimelineListProps) {
  const router = useRouter();
  const [allData, setAllData] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());

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
    getTimeline();
  }, [trip]);

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
                  filterModalVisible ? COLORS.primary : COLORS.textSecondary
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
                    : COLORS.textSecondary
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
                      : COLORS.textSecondary
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
                  router.push(
                    `trips/${trip.id}/timeline-form?timelineId=${item.id}` as any,
                  );
                }}
              >
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleConfirmDelete(item.id);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
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
                color={COLORS.textSecondary}
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

  const hasFilterApplied = selectedStatus !== "all" || selectedDay !== null;
  const hasNoResults = filteredData.length === 0 && allData.length > 0;

  return (
    <View style={styles.container}>
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
        <FlatList
          data={sortedDays}
          keyExtractor={(day) => String(day)}
          renderItem={({ item: day }) => renderDaySection(day)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
        />
      )}

      {renderFilterModal()}
    </View>
  );
}

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
    paddingBottom: 80,
  },
  filterChipsContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipWrapperActive: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
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
  clearFilterButton: {
    marginTop: 16,
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
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
    paddingLeft: 24,
  },
  verticalLine: {
    position: "absolute",
    left: 5,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: COLORS.border,
  },
  itemsContainer: {
    gap: 12,
  },
  itemWrapper: {
    position: "relative",
  },
  connectorDot: {
    position: "absolute",
    left: -22,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
    zIndex: 1,
  },
  connectorDotActive: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
    left: -22,
  },
  connectorDotLast: {
    // Style cho dot cuối cùng nếu cần
  },
  timelineItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  timelineItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: "#F8FAFF",
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
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  notifyBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.primary + "20",
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
    backgroundColor: "#fff",
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
  daysContainer: {
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusCardActive: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary,
  },
  statusIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statusName: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statusCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
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

  filterContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipCount: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeCount: {
    backgroundColor: COLORS.primary + "20",
  },
  upcomingCount: {
    backgroundColor: "#FEF3C7",
  },
  passedCount: {
    backgroundColor: "#F3F4F6",
  },
  todayCount: {
    backgroundColor: "#D1FAE5",
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
    backgroundColor: "#9CA3AF",
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
    color: "#6B7280",
  },
  todayText: {
    color: "#10B981",
  },
  filterChip: {
    backgroundColor: "#F9FAFB",
  },
});
