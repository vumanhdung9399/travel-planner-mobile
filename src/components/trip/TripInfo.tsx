import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import CollapsibleCard from "./CollapsibleCard";
import RouteCard from "./RouteCard";
import WeatherForecast from "./WeatherForecast";
import { useAppPalette } from "@/src/hook/useAppPalette";

interface TripInfoProps {
  trip: Trip;
}

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

export default function TripInfo({ trip }: TripInfoProps) {
  const palette = useAppPalette();
  const [showInfo, setShowInfo] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const duration = Math.max(
    dayjs(trip.endDate).diff(dayjs(trip.startDate), "day") + 1,
    1,
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <CollapsibleCard
        title="Thông tin chuyến đi"
        icon="information-circle"
        expanded={showInfo}
        onToggle={() => setShowInfo((value) => !value)}
      >
        <Text style={styles.tripName}>{trip.name}</Text>
        {(trip.description || trip.infor) && (
          <Text style={styles.tripDescription} numberOfLines={4}>
            {trip.description || trip.infor}
          </Text>
        )}
        <View style={styles.tripStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Ngày</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trip.group?.members?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Thành viên</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trip.timelines?.length || 0}</Text>
            <Text style={styles.statLabel}>Hoạt động</Text>
          </View>
        </View>
        <DetailRow
          label="Thời gian"
          value={`${dayjs(trip.startDate).format("DD/MM/YYYY")} → ${dayjs(
            trip.endDate,
          ).format("DD/MM/YYYY")}`}
        />
        <DetailRow label="Địa điểm" value={trip.location} />
        {trip.infor !== trip.description ? (
          <DetailRow label="Thông tin thêm" value={trip.infor} />
        ) : null}
        <View style={styles.divider} />
        <DetailRow label="Nhóm" value={trip.group?.name} />
        <DetailRow
          label="Thành viên"
          value={`${trip.group?.members?.length || 0} thành viên`}
        />
      </CollapsibleCard>

      {!!trip.location && !!trip.startDate && !!trip.endDate && (
        <CollapsibleCard
          title="Dự báo thời tiết"
          icon="sunny"
          iconColor="#f59e0b"
          expanded={showWeather}
          onToggle={() => setShowWeather((value) => !value)}
        >
          <WeatherForecast
            location={trip.location}
            startDate={trip.startDate}
            endDate={trip.endDate}
          />
        </CollapsibleCard>
      )}

      <CollapsibleCard
        title="Đường đi"
        icon="map"
        iconColor="#16a34a"
        expanded={showRoutes}
        onToggle={() => setShowRoutes((value) => !value)}
      >
        <RouteCard trip={trip} />
      </CollapsibleCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 12, paddingTop: 14, paddingBottom: 96 },
  tripName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  tripDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  tripStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  infoRow: { marginBottom: 12 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 3 },
  value: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 4,
    marginBottom: 14,
  },
});
