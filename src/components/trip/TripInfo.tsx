import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import CollapsibleCard from "./CollapsibleCard";
import RouteCard from "./RouteCard";
import WeatherForecast from "./WeatherForecast";

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
  const [showInfo, setShowInfo] = useState(false);
  const [showWeather, setShowWeather] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  return (
    <ScrollView
      style={styles.container}
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
        <DetailRow
          label="Thời gian"
          value={`${dayjs(trip.startDate).format("DD/MM/YYYY")} → ${dayjs(
            trip.endDate,
          ).format("DD/MM/YYYY")}`}
        />
        <DetailRow label="Địa điểm" value={trip.location} />
        <DetailRow label="Thông tin" value={trip.infor} />
        <DetailRow label="Mô tả" value={trip.description} />
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
  content: { padding: 14, paddingBottom: 28 },
  tripName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 14,
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
