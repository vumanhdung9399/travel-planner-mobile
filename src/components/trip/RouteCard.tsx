import { api } from "@/src/services/api";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import { useAppPalette } from "@/src/hook/useAppPalette";
import type { TripRoute } from "@/src/type/map";
import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { showSuccess } from "@/src/utils/errorHandler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";

interface Props {
  trip: Trip;
}

export default function RouteCard({ trip }: Props) {
  const router = useRouter();
  const palette = useAppPalette();
  const [routes, setRoutes] = useState<TripRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<TripRoute | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ data: TripRoute[] }>(
        `/maps/trip/${trip.id}`,
      );
      setRoutes(response.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRoute = async (route: TripRoute) => {
    router.push({
      pathname: "/trips/[id]/map-form",
      params: { id: trip.id, mapId: route.id },
    } as any);
  };

  const activate = async (route: TripRoute) => {
    try {
      await api.patch(`/maps/${trip.id}/change-active/${route.id}`);
      showSuccess(`Đã chọn tuyến đường "${route.name}"`);
      await load();
    } catch {
      // The API interceptor displays the error.
    }
  };

  const remove = async (route: TripRoute) => {
    try {
      await api.delete(`/maps/${route.id}`);
      showSuccess(`Đã xóa tuyến đường "${route.name}"`);
      setDeleting(null);
      await load();
    } catch {
      // The API interceptor displays the error.
    }
  };

  if (loading) return <ActivityIndicator color={COLORS.primary} />;

  const createButton =
    trip.isLeader && !trip.isCloseTrip ? (
      <Pressable
        onPress={() => router.push(`/trips/${trip.id}/map-form`)}
        style={styles.createButton}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createText}>Tạo tuyến mới</Text>
      </Pressable>
    ) : null;

  if (!routes.length) {
    return (
      <View>
        {createButton}
        <View style={styles.empty}>
        <Ionicons name="map-outline" size={34} color={palette.textLight} />
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          Chưa có tuyến đường nào.
        </Text>
        {trip.isLeader && (
          <Text style={[styles.hint, { color: palette.textLight }]}>
            Tạo tuyến đầu tiên cho chuyến đi.
          </Text>
        )}
        </View>
      </View>
    );
  }

  return (
    <View>
      {createButton}
      {routes.map((route) => (
        <View key={route.id} style={[styles.route, { borderColor: palette.border }]}>
          <Pressable
            disabled={!route.active}
            onPress={() => void openRoute(route)}
            style={styles.routeMain}
          >
            <Ionicons
              name={route.active ? "navigate-circle" : "navigate-circle-outline"}
              size={30}
              color={route.active ? "#16a34a" : palette.textLight}
            />
            <View style={styles.routeText}>
              <Text style={[styles.routeName, { color: palette.textPrimary }]}>
                {route.name}
              </Text>
              <Text style={[styles.status, { color: palette.textSecondary }]}>
                {route.active ? "Đang hoạt động · Mở bản đồ" : "Chưa chọn"}
              </Text>
            </View>
          </Pressable>
          {trip.isLeader && !trip.isCloseTrip && (
            <View style={styles.actions}>
              {!route.active && (
                <Pressable onPress={() => void activate(route)} hitSlop={8}>
                  <Ionicons name="checkmark-circle-outline" size={23} color="#16a34a" />
                </Pressable>
              )}
              <Pressable onPress={() => setDeleting(route)} hitSlop={8}>
                <Ionicons name="trash-outline" size={21} color={COLORS.error} />
              </Pressable>
            </View>
          )}
        </View>
      ))}
      <ConfirmDialog
        visible={!!deleting}
        title="Xóa tuyến đường?"
        message={
          deleting
            ? `Tuyến "${deleting.name}" sẽ bị xóa khỏi chuyến đi.`
            : undefined
        }
        confirmText="Xóa"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
  },
  createText: { color: "#fff", fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { marginTop: 8, color: COLORS.textSecondary },
  hint: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 12,
    textAlign: "center",
  },
  route: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingVertical: 10,
  },
  routeMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeText: { flex: 1 },
  routeName: { fontWeight: "600" },
  status: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  actions: { flexDirection: "row", gap: 14, paddingLeft: 10 },
});
