import { getWeatherByLocation } from "@/src/services/weather";
import { useAppPalette } from "@/src/hook/useAppPalette";
import type { WeatherData } from "@/src/type/weather";
import { COLORS } from "@/src/utils/constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";

interface Props {
  location: string;
  startDate: string;
  endDate: string;
}

const weatherMeta = (code: number) => {
  if (code === 0) return { icon: "sunny" as const, label: "Trời quang" };
  if (code <= 3) return { icon: "partly-sunny" as const, label: "Có mây" };
  if (code <= 48) return { icon: "cloud" as const, label: "Sương mù" };
  if (code <= 67) return { icon: "rainy" as const, label: "Có mưa" };
  if (code <= 77) return { icon: "snow" as const, label: "Có tuyết" };
  if (code <= 82) return { icon: "rainy" as const, label: "Mưa rào" };
  return { icon: "thunderstorm" as const, label: "Dông" };
};

export default function WeatherForecast(props: Props) {
  const palette = useAppPalette();
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(
        await getWeatherByLocation(
          props.location,
          props.startDate,
          props.endDate,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải dự báo thời tiết",
      );
    } finally {
      setLoading(false);
    }
  }, [props.endDate, props.location, props.startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ActivityIndicator color={COLORS.primary} />;
  if (error) {
    return (
      <Pressable
        onPress={() => void load()}
        style={[styles.error, { backgroundColor: palette.warningLight }]}
      >
        <Ionicons name="cloud-offline-outline" size={22} color="#b45309" />
        <View style={styles.errorText}>
          <Text style={{ color: palette.textPrimary }}>{error}</Text>
          <Text style={styles.retry}>Chạm để thử lại</Text>
        </View>
      </Pressable>
    );
  }
  if (!data) return null;

  const current = weatherMeta(data.current.weatherCode);
  return (
    <View>
      <View style={styles.current}>
        <View>
          <Text style={styles.location}>{props.location}</Text>
          <Text style={styles.temperature}>{data.current.temperature}°</Text>
          <Text style={styles.condition}>
            {current.label} · Cảm giác {data.current.feelsLike}°
          </Text>
        </View>
        <Ionicons name={current.icon} size={64} color="#fff" />
      </View>
      <View style={styles.metrics}>
        <Text style={[styles.metric, { color: palette.textSecondary }]}>💧 {data.current.humidity}%</Text>
        <Text style={[styles.metric, { color: palette.textSecondary }]}>💨 {data.current.windSpeed} km/h</Text>
      </View>
      {data.forecast.length ? (
        data.forecast.map((day) => {
          const meta = weatherMeta(day.weatherCode);
          return (
            <View key={day.date} style={[styles.day, { borderColor: palette.border }]}>
              <View style={styles.dayLabel}>
                <Text style={[styles.dayTitle, { color: palette.textPrimary }]}>
                  {day.date === dayjs().format("YYYY-MM-DD")
                    ? "Hôm nay"
                    : dayjs(day.date).format("DD/MM")}
                </Text>
                <Text style={[styles.dayCondition, { color: palette.textSecondary }]}>
                  {meta.label}
                </Text>
              </View>
              <Ionicons name={meta.icon} size={24} color="#f59e0b" />
              <Text style={[styles.rain, { color: palette.textSecondary }]}>
                {day.precipitationProbability}% mưa
              </Text>
              <Text style={[styles.range, { color: palette.textPrimary }]}>
                {day.temperatureMax}° / {day.temperatureMin}°
              </Text>
            </View>
          );
        })
      ) : (
        <Text style={[styles.empty, { color: palette.textSecondary }]}>
          Chuyến đi nằm ngoài phạm vi dự báo 16 ngày.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  location: { color: "#dbeafe", fontSize: 13 },
  temperature: { color: "#fff", fontSize: 48, fontWeight: "300" },
  condition: { color: COLORS.infoLight },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  metric: { color: COLORS.textSecondary },
  day: {
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayLabel: { flex: 1 },
  dayTitle: { fontWeight: "600" },
  dayCondition: { fontSize: 11, color: COLORS.textSecondary },
  rain: { width: 62, fontSize: 11, color: COLORS.textSecondary },
  range: { width: 66, textAlign: "right", fontWeight: "600" },
  error: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.warningLight,
  },
  errorText: { flex: 1 },
  retry: { color: COLORS.primary, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.textSecondary, textAlign: "center", padding: 12 },
});
