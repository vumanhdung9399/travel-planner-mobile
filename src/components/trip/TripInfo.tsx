import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import type { TimelineItemType, Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import CollapsibleCard from "./CollapsibleCard";
import RouteCard from "./RouteCard";
import WeatherForecast from "./WeatherForecast";
import { downloadTripPack, getTripPack, removeTripPack } from '@/src/services/offline-pack';
import { AppToast } from '@/src/components/AppToast';

interface TripInfoProps {
  trip: Trip;
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
  contentInsetTop = 0,
  onScrollOffsetChange,
}: TripInfoProps) {
  const router = useRouter();
  const palette = useAppPalette();
  const [showWeather, setShowWeather] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [timelineCount, setTimelineCount] = useState(
    trip.timelines?.length || 0,
  );
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
        if (active) setTimelineCount(response.data.length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [trip.id]);

  useEffect(() => { let active = true; void getTripPack(trip.id).then((pack) => { if (active) setOfflineAt(pack?.generatedAt || null); }); return () => { active = false; }; }, [trip.id]);

  const values: Record<string, string> = {
    time: `${dayjs(trip.startDate).format("DD/MM")} – ${dayjs(
      trip.endDate,
    ).format("DD/MM/YYYY")}`,
    location: trip.location || "Chưa cập nhật",
    group: trip.group?.name || "Chưa cập nhật",
  };

  return (
    <ScrollView
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
                  borderColor: palette.isDark ? "#315C86" : "#C6E2FF",
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

      {!!trip.location && !!trip.startDate && !!trip.endDate ? (
        <CollapsibleCard
          title="Dự báo ngày khởi hành"
          icon="sunny-outline"
          iconColor="#F59E0B"
          expanded={showWeather}
          onToggle={() => setShowWeather((value) => !value)}
        >
          <WeatherForecast
            location={trip.location}
            startDate={trip.startDate}
            endDate={trip.endDate}
          />
        </CollapsibleCard>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingTop: 16, paddingBottom: 104, gap: 12 },
  card: {
    borderRadius: 20,
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
  documentCard: { minHeight: 76, padding: 14, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  documentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  documentTitle: { fontSize: 14, fontWeight: "800" },
  documentText: { marginTop: 3, fontSize: 11 },
  offlineCard: { minHeight: 76, padding: 14, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  offlineButton: { minWidth: 72, height: 34, paddingHorizontal: 10, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  offlineButtonText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
