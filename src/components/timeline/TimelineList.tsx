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
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface, Text } from "react-native-paper";

interface TimelineListProps {
  trip: Trip;
  onUpdate?: () => void;
}

export default function TimelineList({ trip, onUpdate }: TimelineListProps) {
  const router = useRouter();
  const [allData, setAllData] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItemType | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isItemActive = (item: TimelineItemType): boolean => {
    if (!trip.startDate) return false;

    const now = currentTime;
    const itemDateTime = dayjs(trip.startDate)
      .add(item.day - 1, "day")
      .set("hour", dayjs(item.time, "HH:mm").hour())
      .set("minute", dayjs(item.time, "HH:mm").minute());

    const diffMinutes = now.diff(itemDateTime, "minute");

    return diffMinutes >= 0 && diffMinutes < 60;
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

  const groupedData = useMemo(() => {
    const map: Record<number, TimelineItemType[]> = {};
    allData.forEach((item) => {
      if (!map[item.day]) map[item.day] = [];
      map[item.day].push(item);
    });
    Object.keys(map).forEach((day) => {
      map[Number(day)].sort((a, b) => a.time.localeCompare(b.time));
    });
    return map;
  }, [allData]);

  const sortedDays = useMemo(() => {
    return Object.keys(groupedData)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedData]);

  const handleConfirmDelete = async (id?: string) => {
    if (!id) {
      return;
    }
    try {
      await api.delete(`/timelines/${id}`);
      getTimeline();
      onUpdate?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
    }
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
            {/* Time + Notify */}
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {dayjs(item.time).format("HH:mm")}
              </Text>
              {item.notify && (
                <View style={styles.notifyBadge}>
                  <Ionicons name="notifications" size={14} color="#F59E0B" />
                </View>
              )}
              {isActive && (
                <View style={styles.activeNowBadge}>
                  <Text style={styles.activeNowText}>Đang diễn ra</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text
              style={[styles.itemTitle, isActive && styles.itemTitleActive]}
            >
              {item.title}
            </Text>

            {/* Description */}
            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

          {/* Actions */}
          {isLeader && (
            <View style={styles.timelineActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(
                    `trips/${trip.id}/timeline-form?timelineId=${item.id}`,
                  );
                }}
              >
                <Ionicons
                  name="pencil"
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
                <Ionicons name="trash" size={18} color={COLORS.error} />
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

    return (
      <View key={day} style={styles.daySection}>
        {/* Day Header */}
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

        {/* Timeline Items */}
        <View style={styles.timelineContainer}>
          <View style={styles.verticalLine} />
          <View style={styles.itemsContainer}>
            {items.map((item) => {
              const itemActive = isItemActive(item);
              return (
                <View key={item.id} style={styles.itemWrapper}>
                  <View
                    style={[
                      styles.connectorDot,
                      itemActive && styles.connectorDotActive,
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

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sortedDays.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Surface style={styles.emptyCard} elevation={0}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Chưa có lịch trình</Text>
            <Text style={styles.emptySubtext}>
              Thêm các hoạt động cho chuyến đi của bạn
            </Text>
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
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  notifyBadge: {
    marginLeft: 8,
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
  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
  },
  activeNowBadge: {
    marginLeft: 8,
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
});
