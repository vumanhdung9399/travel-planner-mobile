import MapView, { PROVIDER_GOOGLE } from "@/src/components/map/MapViewAdapter";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, RefreshControl, View } from "react-native";
import { Button, Searchbar, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { api } from "@/src/services/api";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker } from "@/src/components/ui/AppTypography";

interface ActiveMap {
  id: string;
  name: string;
  trip: { id: string; name: string; location?: string; startDate: string; endDate: string; coverImage?: string | null };
}

export default function MapsScreen() {
  const focused = useIsFocused();
  const palette = useAppPalette();
  const router = useRouter();
  const [maps, setMaps] = useState<ActiveMap[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    // Reset request status when revisiting this screen or pulling to refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(false);
    void api.get<ActiveMap[]>("/maps/accessible/active")
      .then((response) => { if (active) setMaps(response.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [focused, revision]);
  const query = search.trim().toLocaleLowerCase("vi-VN");
  const visible = maps.filter((map) => `${map.name} ${map.trip.name} ${map.trip.location || ""}`.toLocaleLowerCase("vi-VN").includes(query));
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
      initialRegion={{ latitude: 21.0285, longitude: 105.8542, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
      onMapReady={() => setMapReady(true)}
      onMapLoaded={() => setMapReady(true)}
    />
    <View style={{ position: "absolute", top: 14, left: 14, right: 14, gap: 8 }}>
      <Button mode="contained" buttonColor={palette.surface} textColor={palette.textPrimary} icon="map-marker-outline" style={{ alignSelf: "flex-start", borderRadius: 10 }} onPress={() => router.push("/trips")}>{maps.length ? `${maps.length} bản đồ đang hoạt động` : "Bản đồ của tôi"}</Button>
      <Searchbar placeholder="Tìm bản đồ hoặc chuyến đi..." value={search} onChangeText={setSearch} style={{ backgroundColor: palette.surface, borderRadius: 10, height: 48 }} inputStyle={{ minHeight: 48, fontSize: 12 }} />
    </View>
    <View style={{ position: "absolute", bottom: 14, left: 14, right: 14, maxHeight: "46%", padding: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><View><PageKicker>Bản đồ của tôi</PageKicker><Text style={{ fontSize: 20, fontWeight: "800", marginTop: 4 }}>Đang hoạt động</Text></View><Text style={{ backgroundColor: palette.primaryLight, color: palette.textPrimary, borderRadius: 18, minWidth: 34, height: 34, textAlign: "center", paddingTop: 8, fontSize: 11, fontWeight: "800" }}>{maps.length}</Text></View>
      <Text style={{ fontSize: 10.5, color: palette.textSecondary, marginTop: 4, marginBottom: 12 }}>Các tuyến đang hoạt động thuộc chuyến đi mà bạn có quyền truy cập.</Text>
      {error && <Button onPress={() => setRevision((value) => value + 1)}>Không thể tải bản đồ. Thử lại</Button>}
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision((value) => value + 1)} />}>
        {!loading && !error && !visible.length && <Text style={{ padding: 16 }}>Chưa có tuyến đường phù hợp.</Text>}
        {visible.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={`Mở bản đồ ${item.name}`} key={item.id} onPress={() => router.push({ pathname: "/trips/[id]/map-form", params: { id: item.trip.id, mapId: item.id } })} style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 10, minHeight: 70, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ padding: 10, backgroundColor: palette.primaryLight, borderRadius: 10 }}>⌁</Text>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "800" }}>{item.name}</Text><Text numberOfLines={1} style={{ fontSize: 10, color: palette.textSecondary, marginTop: 3 }}>{item.trip.name} · {item.trip.location}</Text><Text style={{ fontSize: 9, marginTop: 3, color: palette.textLight }}>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(item.trip.startDate))} — {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(item.trip.endDate))}</Text></View><Text>›</Text>
        </Pressable>)}
      </ScrollView>
    </View>
    {!mapReady && !error && <View pointerEvents="none" style={{ position: "absolute", top: 124, alignSelf: "center", backgroundColor: palette.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: palette.textSecondary, fontSize: 11 }}>Đang tải bản đồ…</Text></View>}
  </View>;
}
