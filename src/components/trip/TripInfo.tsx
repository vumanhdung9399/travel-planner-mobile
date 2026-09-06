import TimelineTypeIcon from "../timeline/TimelineTypeIcon";
import { nearestTimelineDay, timelineClock } from "@/src/utils/tripDetail";
import { TripContentScrollView } from '@/src/components/trip/TripDetailContent';
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import type { TimelineItemType, Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import CollapsibleCard from "./CollapsibleCard";
import RouteCard from "./RouteCard";
import WeatherForecast from "./WeatherForecast";
import { downloadTripPack, getTripPack, removeTripPack } from '@/src/services/offline-pack';
import { AppToast } from '@/src/components/AppToast';
import { taskApi } from '@/src/services/task';
import type { TripTask } from '@/src/type/task';
import { useTripStore } from '@/src/store/trip.store';


interface TripInfoProps {
  trip: Trip;
  onOpenSection?: (section: "info" | "timeline" | "tasks" | "finance" | "leader", finance?: "expenses" | "fund" | "balance") => void;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
}

const detailRows = [
  {
    key: "time",
    label: "Thời gian",
    icon: "calendar-outline" as const,
    color: "#157EEA",
  },
  {
    key: "location",
    label: "Điểm đến",
    icon: "location-outline" as const,
    color: "#EF7D38",
  },
  {
    key: "group",
    label: "Nhóm",
    icon: "people-outline" as const,
    color: "#1B9F68",
  },
];

export default function TripInfo({
  trip,
  onOpenSection,
  contentInsetTop = 0,
  onScrollOffsetChange,
}: TripInfoProps) {
  const router = useRouter();
  const palette = useAppPalette();
  const [showWeather, setShowWeather] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const contentRevision = useTripStore(state => state.contentRevision);
  const [timelineItems, setTimelineItems] = useState(trip.timelines || []);
  const timelineCount = timelineItems.length;
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [offlineAt, setOfflineAt] = useState<string | null>(null);
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState(0);

  const duration = Math.max(
    dayjs(trip.endDate).diff(dayjs(trip.startDate), "day") + 1,
    1,
  );

  useEffect(() => {
    let active = true;
    api
      .get<TimelineItemType[]>(`/timelines/trip/${trip.id}`)
      .then((response) => {
        if (active) setTimelineItems(response.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [trip.id, contentRevision]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([taskApi.list(trip.id), api.get<{ amount: number | string }[]>(`/trips/${trip.id}/funds`)]).then(([taskResult, fundResult]) => {
      if (!active) return;
      setTasks(taskResult.status === "fulfilled" ? taskResult.value.data : []);
      setFundTotal(fundResult.status === "fulfilled" ? fundResult.value.data.reduce((sum, item) => sum + Number(item.amount || 0), 0) : 0);
    });
    return () => { active = false; };
  }, [trip.id, contentRevision]);

  const today = dayjs().startOf("day");
  const targetDay = Math.min(Math.max(today.diff(dayjs(trip.startDate).startOf("day"), "day") + 1, 1), duration);
  const previewDay = nearestTimelineDay(timelineItems.map(item => Number(item.day)), targetDay, duration);
  const previewItems = timelineItems.filter(item => (Number(item.day) || 1) === previewDay).sort((a, b) => timelineClock(a.time).localeCompare(timelineClock(b.time))).slice(0, 3);
  const previewEyebrow = previewDay === 1 ? "HÔM ĐẦU TIÊN" : previewDay === duration ? "HÔM CUỐI CÙNG" : today.isBefore(dayjs(trip.startDate), "day") || today.isAfter(dayjs(trip.endDate), "day") || previewDay !== targetDay ? `NGÀY ${previewDay}` : `NGÀY ${previewDay} · HÔM NAY`;
  const previewTitle = previewDay === 1 ? trip.location ? `Chạm ${trip.location}` : "Khởi đầu hành trình" : previewDay === duration ? "Khép lại hành trình" : trip.location ? `Một ngày tại ${trip.location}` : `Ngày ${previewDay} của hành trình`;
  const pendingTasks = tasks.filter(task => !task.isCompleted).length;
  const hasBasics = Boolean(trip.startDate && trip.endDate && trip.group?.members?.length);
  const availableFund = Math.max(fundTotal - (trip.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0), 0);
  const readiness = Math.round((hasBasics ? 25 : 0) + (timelineCount ? 25 : 0) + (tasks.length ? (tasks.length - pendingTasks) / tasks.length * 25 : 0) + (fundTotal > 0 ? 25 : 0));
  const readinessTitle = readiness >= 85 ? "Sẵn sàng lên đường!" : readiness >= 60 ? "Gần xong rồi!" : readiness >= 30 ? "Đang chuẩn bị" : "Bắt đầu chuẩn bị";
  const readinessItems = [
    { label: "Chốt ngày & thành viên", done: hasBasics },
    { label: timelineCount ? `${timelineCount} hoạt động trong lịch trình` : "Hoàn thiện lịch trình", done: timelineCount > 0, action: () => onOpenSection?.("timeline") },
    { label: pendingTasks ? `${pendingTasks} công việc chưa hoàn thành` : tasks.length ? "Tất cả công việc đã hoàn thành" : "Thêm công việc chuẩn bị", done: tasks.length > 0 && pendingTasks === 0, action: () => onOpenSection?.("tasks") },
    { label: fundTotal ? availableFund > 0 ? `Quỹ còn ${formatMoney(availableFund)}` : "Quỹ chuyến đi đã được sử dụng hết" : "Thiết lập quỹ chuyến đi", done: fundTotal > 0, action: () => onOpenSection?.("finance", "fund") },
  ];

  useEffect(() => { let active = true; void getTripPack(trip.id).then((pack) => { if (active) setOfflineAt(pack?.generatedAt || null); }); return () => { active = false; }; }, [trip.id]);

  const values: Record<string, string> = {
    time: `${dayjs(trip.startDate).format("DD/MM")} – ${dayjs(
      trip.endDate,
    ).format("DD/MM/YYYY")}`,
    location: trip.location || "Chưa cập nhật",
    group: trip.group?.name || "Chưa cập nhật",
  };

  return (
    <TripContentScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: contentInsetTop + 16 }]}
      showsVerticalScrollIndicator={false}
      onScroll={(event) =>
        onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
      }
      scrollEventThrottle={16}
    >
      <Surface
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        elevation={0}
      >
        <View style={styles.overviewHeader}>
          <View style={styles.overviewTitleWrap}>
            <Text style={styles.eyebrow}>TỔNG QUAN</Text>
            <Text
              style={[styles.tripName, { color: palette.textPrimary }]}
            >
              {trip.name}
            </Text>
          </View>
          {trip.isLeader && !trip.isCloseTrip ? (
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: palette.primaryLight,
                  borderColor: palette.isDark ? "#4EAD91" : "#BFE2D4",
                },
              ]}
              onPress={() =>
                router.push(
                  `/groups/${trip.group?.id}/trip-form?tripId=${trip.id}`,
                )
              }
              accessibilityLabel="Sửa thông tin chuyến đi"
            >
              <Ionicons name="pencil" size={17} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text
          style={[styles.description, { color: palette.textSecondary }]}
          numberOfLines={4}
        >
          {trip.description ||
            trip.infor ||
            "Thông tin chi tiết cho hành trình sắp tới của nhóm."}
        </Text>

        <View
          style={[styles.stats, { borderTopColor: palette.border }]}
        >
          {[
            [duration, "Ngày"],
            [trip.group?.members?.length || 0, "Thành viên"],
            [timelineCount, "Hoạt động"],
          ].map(([value, label], index) => (
            <View
              key={String(label)}
              style={[
                styles.statItem,
                index < 2 && {
                  borderRightWidth: StyleSheet.hairlineWidth,
                  borderRightColor: palette.border,
                },
              ]}
            >
              <Text style={styles.statValue}>{value}</Text>
              <Text
                style={[styles.statLabel, { color: palette.textSecondary }]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Surface>
      <Surface
        style={[
          styles.card,
          styles.detailsCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        elevation={0}
      >
        {detailRows.map((detail, index) => (
          <View
            key={detail.key}
            style={[
              styles.detailRow,
              index < detailRows.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.detailIcon,
                {
                  backgroundColor:
                    detail.key === "time"
                      ? palette.primaryLight
                      : detail.key === "location"
                        ? palette.orangeLight
                        : palette.successLight,
                },
              ]}
            >
              <Ionicons name={detail.icon} size={19} color={detail.color} />
            </View>
            <View style={styles.detailCopy}>
              <Text
                style={[styles.detailLabel, { color: palette.textSecondary }]}
              >
                {detail.label}
              </Text>
              <Text
                style={[styles.detailValue, { color: palette.textPrimary }]}
                numberOfLines={1}
              >
                {values[detail.key]}
              </Text>
            </View>
            {detail.key === "group" ? (
              <View style={styles.memberAvatars}>
                {(trip.group?.members || []).slice(0, 4).map((member, memberIndex) =>
                  member.avatar ? (
                    <Image
                      key={member.id}
                      source={{ uri: member.avatar }}
                      style={[
                        styles.memberAvatar,
                        memberIndex > 0 && styles.memberAvatarOverlap,
                      ]}
                    />
                  ) : (
                    <View
                      key={member.id}
                      style={[
                        styles.memberAvatar,
                        styles.memberFallback,
                        { backgroundColor: palette.primaryLight },
                        memberIndex > 0 && styles.memberAvatarOverlap,
                      ]}
                    >
                      <Text style={styles.memberLetter}>
                        {getNameFirstLetterUpper(member.name)}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </View>
        ))}
      </Surface>
      <Surface elevation={0} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View><Text style={styles.eyebrow}>MỨC ĐỘ SẴN SÀNG</Text><Text style={{ fontSize: 17, fontWeight: "700", marginTop: 4 }}>{readinessTitle}</Text></View><Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.primary }}>{readiness}%</Text></View>
        <View style={{ height: 7, borderRadius: 99, backgroundColor: palette.primaryLight, marginTop: 11, marginBottom: 10, overflow: "hidden" }}><View style={{ width: `${readiness}%`, height: 7, backgroundColor: COLORS.primary }} /></View>
        {readinessItems.map((item, index) => <TouchableOpacity key={item.label} disabled={!item.action} onPress={item.action} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderTopColor: palette.border }}><Ionicons name={item.done ? "checkmark-circle" : "ellipse-outline"} size={18} color={item.done ? COLORS.primary : palette.textSecondary} /><Text style={{ flex: 1, fontSize: 12, color: palette.textPrimary }}>{item.label}</Text>{item.action && <Ionicons name="chevron-forward" size={14} color={palette.textSecondary} />}</TouchableOpacity>)}
      </Surface>
      <Surface elevation={0} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{previewEyebrow}</Text><Text style={{ fontSize: 17, fontWeight: "700", marginTop: 4 }}>{previewTitle}</Text></View><TouchableOpacity onPress={() => onOpenSection?.("timeline")}><Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: "700" }}>Xem lịch trình →</Text></TouchableOpacity></View>
        {previewItems.length ? previewItems.map((item, index) => <View key={item.id || index} style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 13, borderBottomWidth: index < previewItems.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: palette.border }}><Text style={{ width: 44, fontSize: 11, fontWeight: "700" }}>{timelineClock(item.time)}</Text><View style={{ backgroundColor: palette.primaryLight, width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" }}><TimelineTypeIcon type={item.type} size={28} /></View><View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: "700" }}>{item.title}</Text>{!!item.description && <Text style={{ fontSize: 10, color: palette.textSecondary, marginTop: 3 }} numberOfLines={2}>{item.description}</Text>}</View></View>) : <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 16 }}>Chưa có hoạt động. Thêm lịch trình để bắt đầu hành trình.</Text>}
      </Surface>


      <TouchableOpacity
        onPress={() => router.push(`/trips/${trip.id}/documents`)}
        style={[styles.documentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <View style={[styles.documentIcon, { backgroundColor: palette.primaryLight }]}><Ionicons name="folder-open-outline" size={23} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.documentTitle, { color: palette.textPrimary }]}>Ví tài liệu chuyến đi</Text><Text style={[styles.documentText, { color: palette.textSecondary }]}>Vé, booking, bảo hiểm và giấy tờ của nhóm</Text></View>
        <Ionicons name="chevron-forward" size={21} color={palette.textLight} />
      </TouchableOpacity>

      {!trip.isCloseTrip ? <View style={[styles.offlineCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.documentIcon, { backgroundColor: palette.successLight }]}><Ionicons name="cloud-download-outline" size={23} color={COLORS.success} /></View>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => AppToast.show({ title: 'Cách dùng offline', message: 'Nhấn Tải offline. Khi mất mạng, bạn chỉ cần mở lại chuyến đi này như bình thường; thay đổi sẽ tự đồng bộ khi có mạng.' })}>
          <Text style={[styles.documentTitle, { color: palette.textPrimary }]}>Chế độ offline</Text>
          <Text style={[styles.documentText, { color: offlineAt ? COLORS.success : palette.textSecondary }]}>{offlineAt ? `Sẵn sàng offline · cập nhật ${dayjs(offlineAt).format('HH:mm DD/MM')}` : 'Tải trước rồi mở chuyến đi bình thường khi mất mạng'}</Text>
        </TouchableOpacity>
        {offlineAt && !trip.isCloseTrip ? <TouchableOpacity hitSlop={8} onPress={() => void removeTripPack(trip.id).then(() => setOfflineAt(null))}><Ionicons name="trash-outline" size={20} color={COLORS.error} /></TouchableOpacity> : null}
        <TouchableOpacity disabled={offlineSaving} style={styles.offlineButton} onPress={() => { setOfflineSaving(true); void downloadTripPack(trip.id, setOfflineProgress).then((pack) => { setOfflineAt(pack.generatedAt); AppToast.show({ title: 'Đã bật chế độ offline', message: 'Khi mất mạng, hãy mở chuyến đi này như bình thường.' }); }).finally(() => setOfflineSaving(false)); }}><Text style={styles.offlineButtonText}>{offlineSaving ? `${Math.round(offlineProgress * 100)}%` : offlineAt ? 'Cập nhật' : 'Tải offline'}</Text></TouchableOpacity>
      </View> : null}



      {!!trip.location && !!trip.startDate && !!trip.endDate ? (
        <Surface elevation={0} style={[styles.card, { padding: 0, overflow: "hidden", backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TouchableOpacity onPress={() => setShowWeather(value => !value)} accessibilityState={{ expanded: showWeather }} style={{ padding: 15, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.warningLight }}><Ionicons name="sunny" size={22} color="#FDB813" /><View style={{ flex: 1 }}><Text style={{ fontSize: 10, color: palette.textSecondary }}>Dự báo ngày khởi hành</Text><Text style={{ fontSize: 13, fontWeight: "700" }}>Xem thời tiết chuyến đi</Text></View><Text style={{ fontSize: 10, color: "#AD7F1D", fontWeight: "700" }}>{showWeather ? "Thu gọn" : "Xem dự báo"}</Text></TouchableOpacity>
          {showWeather && <View style={{ padding: 16 }}><WeatherForecast location={trip.location!} startDate={trip.startDate} endDate={trip.endDate} /></View>}
        </Surface>
      ) : null}

      {!trip.isCloseTrip ? (
        <CollapsibleCard
          title="Đường đi chuyến đi"
          icon="map-outline"
          iconColor="#16A34A"
          expanded={showRoutes}
          onToggle={() => setShowRoutes((value) => !value)}
        >
          <RouteCard trip={trip} />
        </CollapsibleCard>
      ) : null}
      <Surface elevation={0} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={styles.eyebrow}>TRUY CẬP NHANH</Text>
        {[{ label: "Bản đồ & tuyến đường", icon: "map-outline" as const, action: () => router.push(`/trips/${trip.id}/map-form`) }, { label: "Vé & tài liệu", icon: "document-text-outline" as const, action: () => router.push(`/trips/${trip.id}/documents`) }, { label: "Thông báo cho nhóm", icon: "notifications-outline" as const, action: () => router.push(`/groups/${trip.group.id}/chat`) }].map((item, index) => <TouchableOpacity key={item.label} onPress={item.action} style={{ minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: index < 2 ? StyleSheet.hairlineWidth : 0, borderBottomColor: palette.border }}><Ionicons name={item.icon} size={19} color={COLORS.primary} /><Text style={{ flex: 1, fontSize: 11.5, fontWeight: "700" }}>{item.label}</Text><Ionicons name="chevron-forward" size={18} color={palette.textSecondary} /></TouchableOpacity>)}
      </Surface>
    </TripContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingTop: 16, paddingBottom: 104, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 17,
    shadowColor: "#3D4E62",
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  overviewTitleWrap: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tripName: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  description: { marginVertical: 11, fontSize: 12, lineHeight: 19 },
  stats: {
    flexDirection: "row",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: COLORS.primary, fontSize: 17, fontWeight: "800" },
  statLabel: { marginTop: 2, fontSize: 10 },
  detailsCard: { paddingVertical: 0, paddingHorizontal: 16 },
  detailRow: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 10, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "700" },
  memberAvatars: { flexDirection: "row", paddingLeft: 8 },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  memberAvatarOverlap: { marginLeft: -8 },
  memberFallback: { alignItems: "center", justifyContent: "center" },
  memberLetter: { color: COLORS.primary, fontSize: 9, fontWeight: "800" },
  documentCard: { minHeight: 76, padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  documentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  documentTitle: { fontSize: 14, fontWeight: "800" },
  documentText: { marginTop: 3, fontSize: 11 },
  offlineCard: { minHeight: 76, padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  offlineButton: { minWidth: 72, height: 34, paddingHorizontal: 10, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  offlineButtonText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
