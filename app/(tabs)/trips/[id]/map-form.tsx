import ConfirmDialog from "@/src/components/ConfirmDialog";
import { AppToast } from "@/src/components/AppToast";
import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import {
  getGooglePlaceLocation,
  type PlacePrediction,
  searchGooglePlaces,
} from "@/src/services/googleMaps";
import { ENV } from "@/src/constants/env";
import { useAuthStore } from "@/src/store/auth.store";
import type { RouteData, TripRoute } from "@/src/type/map";
import { COLORS } from "@/src/utils/constants";
import { showError, showSuccess } from "@/src/utils/errorHandler";
import { getSocket } from "@/src/utils/socket";
import {
  distanceToRoute,
  formatRouteDistance,
} from "@/src/utils/routeMap";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MapView, {
  LatLng,
  MapPressEvent,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "../../../../src/components/map/MapViewAdapter";
import { Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type TravelMode = "DRIVING" | "MOTORCYCLE";
type LocatedUser = LatLng & {
  userId: string;
  userName: string;
  color: string;
  hasLocation: boolean;
  lastUpdated: number;
};

interface DirectionsResponse {
  status: string;
  routes?: {
    overview_polyline: { points: string };
    legs: { distance?: { value: number }; duration?: { value: number } }[];
  }[];
  error_message?: string;
}

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

const DEFAULT_REGION = {
  latitude: 21.0285,
  longitude: 105.8542,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#172033" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A9B7CA" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B1220" }] },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1B293D" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8492A6" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2A384C" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3B526E" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1B293D" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0A2A43" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B8FA8" }],
  },
];

const decodePolyline = (encoded: string): LatLng[] => {
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }
  return points;
};

const toStoredPoint = (point: LatLng) => ({
  lat: point.latitude,
  lng: point.longitude,
});

const toNativePoint = (point: { lat: number; lng: number }): LatLng => ({
  latitude: point.lat,
  longitude: point.lng,
});

const isValidLatLng = (point: LatLng | null | undefined): point is LatLng =>
  !!point &&
  Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude);

const userColor = (id: string) => {
  const colors = ["#e53935", "#8e24aa", "#1e88e5", "#00897b", "#43a047", "#fb8c00"];
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
};

export default function NativeMapScreen() {
  const palette = useAppPalette();
  const paperTheme = useTheme();
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const previousOffRouteUsers = useRef<Set<string>>(new Set());
  const { id, mapId } = useLocalSearchParams<{ id: string; mapId?: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const isViewMode = !!mapId;
  const fallbackHref = useMemo(
    () => ({ pathname: "/trips/[id]" as const, params: { id } }),
    [id],
  );

  const [records, setRecords] = useState<TripRoute[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TripRoute | null>(null);
  const [savedRoute, setSavedRoute] = useState<RouteData | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const [routeName, setRouteName] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(!mapId);
  const [deleteRecord, setDeleteRecord] = useState<TripRoute | null>(null);
  const [users, setUsers] = useState<LocatedUser[]>([]);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(0.3);
  const allowEdit = isLeader && !isViewMode && !!id;
  const successColor = palette.isDark ? "#6EE7B7" : "#16A34A";
  const warningColor = palette.isDark ? "#FCD34D" : "#F59E0B";
  const errorColor = palette.isDark ? "#FDA4AF" : paperTheme.colors.error;
  const mapPointColor = palette.isDark ? "#60A5FA" : "#2563EB";
  const alertBackgroundColor = palette.isDark ? "#7F1D1D" : "#DC2626";

  const fitPoints = useCallback((items: LatLng[]) => {
    const validItems = items.filter(isValidLatLng);
    if (validItems.length) {
      mapRef.current?.fitToCoordinates(validItems, {
        edgePadding: { top: 90, right: 55, bottom: 220, left: 55 },
        animated: true,
      });
    }
  }, []);

  const calculateRoute = useCallback(
    async (waypoints: LatLng[], mode: TravelMode) => {
      if (waypoints.length < 2) throw new Error("Cần ít nhất 2 điểm");
      const calculateWithOsrm = async () => {
        const coordinates = waypoints
          .map((point) => `${point.longitude},${point.latitude}`)
          .join(";");
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
        );
        const data = (await response.json()) as OsrmResponse;
        const route = data.routes?.[0];
        if (!response.ok || data.code !== "Ok" || !route) {
          throw new Error("Không tìm được tuyến đường");
        }
        const path = route.geometry.coordinates.map(([longitude, latitude]) => ({
          latitude,
          longitude,
        }));
        setRoutePath(path);
        setDistance(route.distance);
        setDuration(route.duration);
        fitPoints(path);
        return { path, distance: route.distance, duration: route.duration };
      };

      if (!ENV.GOOGLE_MAPS_API_KEY) return calculateWithOsrm();
      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const middle = waypoints
        .slice(1, -1)
        .map((point) => `${point.latitude},${point.longitude}`)
        .join("|");
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: "driving",
        alternatives: middle ? "false" : "true",
        key: ENV.GOOGLE_MAPS_API_KEY,
      });
      if (middle) params.set("waypoints", middle);
      if (mode === "MOTORCYCLE") params.set("avoid", "highways|tolls");
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`,
      );
      const data = (await response.json()) as DirectionsResponse;
      if (!response.ok || data.status !== "OK" || !data.routes?.length)
        return calculateWithOsrm();
      const best = [...data.routes].sort(
        (a, b) =>
          a.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) -
          b.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0),
      )[0];
      const nextPath = decodePolyline(best.overview_polyline.points);
      const nextDistance = best.legs.reduce(
        (sum, leg) => sum + (leg.distance?.value || 0),
        0,
      );
      const nextDuration = best.legs.reduce(
        (sum, leg) => sum + (leg.duration?.value || 0),
        0,
      );
      setRoutePath(nextPath);
      setDistance(nextDistance);
      setDuration(nextDuration);
      fitPoints(nextPath);
      return { path: nextPath, distance: nextDistance, duration: nextDuration };
    },
    [fitPoints],
  );

  const loadRouteFile = useCallback(
    async (record: TripRoute) => {
      setBusy(true);
      try {
        const response = await fetch(record.routerFileName);
        if (!response.ok) throw new Error("Không tải được file tuyến đường");
        const route = (await response.json()) as RouteData;
        const nativePoints = (route.waypoints || [])
          .map(toNativePoint)
          .filter(isValidLatLng);
        let nativePath = (route.path || [])
          .map(toNativePoint)
          .filter(isValidLatLng);
        if (nativePath.length < 2 && nativePoints.length >= 2) {
          try {
            const calculated = await calculateRoute(
              nativePoints,
              route.travelMode || "DRIVING",
            );
            nativePath = calculated.path;
          } catch {
            nativePath = nativePoints;
          }
        }
        setSavedRoute(route);
        setSelectedRecord(record);
        setPoints(nativePoints);
        setRoutePath(nativePath);
        setTravelMode(route.travelMode || "DRIVING");
        setDistance(route.distance || 0);
        setDuration(route.duration || 0);
        fitPoints(nativePath.length ? nativePath : nativePoints);
      } catch {
        showError("Không thể tải tuyến đường");
      } finally {
        setBusy(false);
      }
    },
    [calculateRoute, fitPoints],
  );

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      if (mapId) {
        const response = await api.get<TripRoute & { tripId: string }>(
          `/maps/${mapId}`,
        );
        const record = response.data;
        setIsLeader(false);
        setRecords([record]);
        await loadRouteFile(record);
        return;
      }
      const response = await api.get<{ isLeader: boolean; data: TripRoute[] }>(
        `/maps/trip/${id}`,
      );
      const nextRecords = response.data.data || [];
      setIsLeader(response.data.isLeader);
      setRecords(nextRecords);
      const initial =
        nextRecords.find((record) => record.active) || nextRecords[0];
      if (initial) await loadRouteFile(initial);
    } finally {
      setLoading(false);
    }
  }, [id, loadRouteFile, mapId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const socket = getSocket();
    if (!isViewMode || !socket || !id || !currentUser?.id) return;
    socket.emit("join-trip", {
      tripId: id,
      userId: currentUser.id,
      userName: currentUser.name,
    });
    const update = (data: {
      userId: string;
      userName?: string;
      lat: number;
      lng: number;
      hasLocation?: boolean;
    }) => {
      setUsers((current) => {
        const existing = current.find((item) => item.userId === data.userId);
        const hasLocation =
          data.hasLocation !== false &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lng) &&
          !(data.lat === 0 && data.lng === 0);
        const user: LocatedUser = {
          userId: data.userId,
          userName: data.userName || existing?.userName || "Thành viên",
          latitude: hasLocation ? data.lat : existing?.latitude || 0,
          longitude: hasLocation ? data.lng : existing?.longitude || 0,
          color: existing?.color || userColor(data.userId),
          hasLocation,
          lastUpdated: Date.now(),
        };
        return existing
          ? current.map((item) => (item.userId === data.userId ? user : item))
          : [...current, user];
      });
    };
    const offline = (userId: string) =>
      setUsers((current) => current.filter((user) => user.userId !== userId));
    socket.on("location-update", update);
    socket.on("user-online", update);
    socket.on("user-offline", offline);
    return () => {
      socket.emit("leave-trip", { tripId: id });
      socket.off("location-update", update);
      socket.off("user-online", update);
      socket.off("user-offline", offline);
    };
  }, [currentUser?.id, currentUser?.name, id, isViewMode]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      if (!isViewMode) return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted || permission.status !== "granted") return;
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (location) => {
          const next = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setMyLocation(next);
          if (currentUser?.id) {
            setUsers((current) => {
              const self: LocatedUser = {
                ...next,
                userId: currentUser.id,
                userName: currentUser.name || "Bạn",
                color: userColor(currentUser.id),
                hasLocation: true,
                lastUpdated: Date.now(),
              };
              return current.some((user) => user.userId === currentUser.id)
                ? current.map((user) =>
                    user.userId === currentUser.id ? self : user,
                  )
                : [...current, self];
            });
            getSocket()?.emit("update-location", {
              tripId: id,
              userId: currentUser.id,
              lat: next.latitude,
              lng: next.longitude,
            });
          }
        },
      );
    };
    void start();
    return () => {
      mounted = false;
      locationSubscription.current?.remove();
    };
  }, [currentUser?.id, currentUser?.name, id, isViewMode]);

  const memberStatuses = useMemo(
    () =>
      users.map((user) => {
        const routeDistance =
          user.hasLocation && routePath.length >= 2
            ? distanceToRoute(user, routePath)
            : null;
        return {
          ...user,
          routeDistance,
          isOffRoute:
            routeDistance !== null && routeDistance > alertThreshold,
        };
      }),
    [alertThreshold, routePath, users],
  );

  const offRouteMembers = useMemo(
    () => memberStatuses.filter((user) => user.isOffRoute),
    [memberStatuses],
  );

  useEffect(() => {
    const currentOffRoute = new Set(
      offRouteMembers.map((member) => member.userId),
    );
    const newlyOffRoute = offRouteMembers.filter(
      (member) => !previousOffRouteUsers.current.has(member.userId),
    );
    if (isViewMode && newlyOffRoute.length) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      const first = newlyOffRoute[0];
      AppToast.show({
        type: "error",
        title: "Cảnh báo lệch lộ trình",
        message:
          newlyOffRoute.length === 1
            ? `${first.userName} cách tuyến ${formatRouteDistance(
                first.routeDistance || 0,
              )}`
            : `${newlyOffRoute.length} thành viên đang lệch khỏi lộ trình`,
      });
    }
    previousOffRouteUsers.current = currentOffRoute;
  }, [isViewMode, offRouteMembers]);

  const startDraft = useCallback(() => {
    setSelectedRecord(null);
    setSavedRoute(null);
    setPoints([]);
    setRoutePath([]);
    setRouteName("");
    setDistance(0);
    setDuration(0);
  }, []);

  const onMapPress = (event: MapPressEvent) => {
    if (!allowEdit) return;
    const coordinate = event?.nativeEvent?.coordinate;
    if (!isValidLatLng(coordinate)) return;
    if (selectedRecord) {
      startDraft();
      setPoints([coordinate]);
    } else {
      setPoints((current) => [...current, coordinate]);
    }
    setRoutePath([]);
    setDistance(0);
    setDuration(0);
  };

  const findPlaces = async () => {
    if (!allowEdit || !search.trim()) return;
    try {
      setBusy(true);
      const results = await searchGooglePlaces(search.trim());
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      if (!results.length) showError("Không tìm thấy địa điểm");
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
      showError(error instanceof Error ? error.message : "Không thể tìm địa điểm");
    } finally {
      setBusy(false);
    }
  };

  const selectPlace = async (prediction: PlacePrediction) => {
    if (!allowEdit) return;
    try {
      setBusy(true);
      const point = await getGooglePlaceLocation(prediction.placeId);
      if (selectedRecord) {
        startDraft();
        setPoints([point]);
      } else {
        setPoints((current) => [...current, point]);
      }
      setRoutePath([]);
      mapRef.current?.animateCamera({ center: point, zoom: 15 });
      setSearch(prediction.description);
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Không thể lấy vị trí địa điểm",
      );
    } finally {
      setBusy(false);
    }
  };

  const addMyLocation = async () => {
    if (!allowEdit) return;
    try {
      setBusy(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showError("Cần quyền vị trí để sử dụng vị trí của tôi");
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const point = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      if (selectedRecord) {
        startDraft();
        setPoints([point]);
      } else {
        setPoints((current) => [...current, point]);
      }
      setRoutePath([]);
      setDistance(0);
      setDuration(0);
      mapRef.current?.animateCamera({ center: point, zoom: 16 });
      setShowSuggestions(false);
    } catch {
      showError("Không thể lấy vị trí hiện tại");
    } finally {
      setBusy(false);
    }
  };

  const saveRoute = async () => {
    if (!allowEdit) return;
    if (!routeName.trim()) return showError("Vui lòng nhập tên tuyến đường");
    if (points.length < 2) return showError("Cần ít nhất 2 điểm");
    let temporaryFileUri: string | null = null;
    try {
      setBusy(true);
      const calculated =
        routePath.length >= 2
          ? { path: routePath, distance, duration }
          : await calculateRoute(points, travelMode);
      const route: RouteData = {
        id: `mobile-${Date.now()}`,
        name: routeName.trim(),
        waypoints: points.map(toStoredPoint),
        path: calculated.path.map(toStoredPoint),
        travelMode,
        distance: calculated.distance,
        duration: calculated.duration,
        createdAt: new Date().toISOString(),
      };
      const formData = new FormData();
      if (!FileSystem.cacheDirectory) {
        throw new Error("Không truy cập được thư mục cache");
      }
      const fileName = `route_${Date.now()}.json`;
      temporaryFileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        temporaryFileUri,
        JSON.stringify(route),
        { encoding: FileSystem.EncodingType.UTF8 },
      );
      formData.append(
        "file",
        {
          uri: temporaryFileUri,
          name: fileName,
          type: "application/json",
        } as any,
      );
      formData.append("name", route.name);
      formData.append("tripId", id);
      const response = await api.post<TripRoute>(`/maps/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSuccess("Lưu lộ trình thành công");
      setRouteName("");
      setPanelOpen(false);
      await loadRecords();
      if (response.data) await loadRouteFile(response.data);
    } catch (error) {
      const message =
        (error as any)?.response?.data?.message ||
        (error instanceof Error ? error.message : "Không thể lưu lộ trình");
      showError(Array.isArray(message) ? message[0] : message);
    } finally {
      if (temporaryFileUri) {
        await FileSystem.deleteAsync(temporaryFileUri, { idempotent: true }).catch(
          () => undefined,
        );
      }
      setBusy(false);
    }
  };

  const removeRoute = async () => {
    if (!allowEdit || !deleteRecord) return;
    try {
      setBusy(true);
      await api.delete(`/maps/${deleteRecord.id}`);
      setDeleteRecord(null);
      setSavedRoute(null);
      setSelectedRecord(null);
      setPoints([]);
      setRoutePath([]);
      await loadRecords();
      showSuccess("Đã xóa lộ trình");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={{ color: palette.textPrimary }}>Đang tải bản đồ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={["bottom"]}
    >
      <CommonHeader title="Bản đồ chuyến đi" fallbackHref={fallbackHref} />
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          onPress={onMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          userInterfaceStyle={palette.isDark ? "dark" : "light"}
          customMapStyle={palette.isDark ? DARK_MAP_STYLE : []}
        >
          {routePath.length >= 2 && (
            <Polyline
              coordinates={routePath}
              strokeColor={savedRoute ? successColor : warningColor}
              strokeWidth={6}
            />
          )}
          {points.map((point, index) => (
            <Marker
              key={`${point.latitude}-${point.longitude}-${index}`}
              coordinate={point}
              title={
                index === 0
                  ? "Điểm đi"
                  : index === points.length - 1
                    ? "Điểm đến"
                    : `Điểm ${index}`
              }
              pinColor={
                index === 0
                  ? successColor
                  : index === points.length - 1
                    ? errorColor
                    : mapPointColor
              }
            />
          ))}
          {users.filter((user) => user.hasLocation).map((user) => (
            <Marker
              key={user.userId}
              coordinate={user}
              title={user.userName}
              pinColor={user.color}
            />
          ))}
        </MapView>

        <View style={styles.topActions}>
          {isViewMode && (
            <Pressable
              style={[
                styles.fab,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => setMembersOpen(true)}
            >
              <View>
                <Ionicons
                  name="people"
                  size={22}
                  color={paperTheme.colors.primary}
                />
                {!!offRouteMembers.length && (
                  <View
                    style={[
                      styles.alertBadge,
                      { backgroundColor: paperTheme.colors.error },
                    ]}
                  >
                    <Text style={styles.alertBadgeText}>
                      {offRouteMembers.length}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          {allowEdit && (
            <Pressable
              style={[
                styles.fab,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => setPanelOpen(true)}
            >
              <Ionicons
                name="options"
                size={22}
                color={paperTheme.colors.primary}
              />
            </Pressable>
          )}
          {isViewMode && myLocation && (
            <Pressable
              style={[
                styles.fab,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() =>
                mapRef.current?.animateCamera({ center: myLocation, zoom: 16 })
              }
            >
              <Ionicons
                name="locate"
                size={22}
                color={paperTheme.colors.primary}
              />
            </Pressable>
          )}
        </View>

        {(selectedRecord || routePath.length >= 2) && (
          <View
            style={[
              styles.routeInfo,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.routeTitle, { color: palette.textPrimary }]}>
              {selectedRecord?.name || routeName || "Tuyến mới"}
            </Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>
              {distance ? formatDistance(distance) : "—"} ·{" "}
              {duration ? formatDuration(duration) : "—"} ·{" "}
              {travelMode === "DRIVING" ? "Ô tô" : "Xe máy"}
            </Text>
          </View>
        )}
        {isViewMode && !!offRouteMembers.length && (
          <Pressable
            onPress={() => setMembersOpen(true)}
            style={[
              styles.alertBanner,
              { backgroundColor: alertBackgroundColor },
            ]}
          >
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.alertBannerText}>
              {offRouteMembers.length === 1
                ? `${offRouteMembers[0].userName} đang lệch ${formatRouteDistance(
                    offRouteMembers[0].routeDistance || 0,
                  )}`
                : `${offRouteMembers.length} thành viên đang lệch lộ trình`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      <Modal
        visible={allowEdit && panelOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPanelOpen(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            {
              backgroundColor: palette.isDark
                ? "rgba(0,0,0,.58)"
                : "rgba(0,0,0,.25)",
            },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.panel, { backgroundColor: palette.surface }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: palette.textPrimary }]}>
                Quản lý lộ trình
              </Text>
              <Pressable onPress={() => setPanelOpen(false)}>
                <Ionicons
                  name="close"
                  size={26}
                  color={palette.textPrimary}
                />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!!selectedRecord && (
                <Pressable
                  style={[
                    styles.newRouteButton,
                    { backgroundColor: paperTheme.colors.primary },
                  ]}
                  onPress={startDraft}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={paperTheme.colors.onPrimary}
                  />
                  <Text
                    style={[
                      styles.newRouteText,
                      { color: paperTheme.colors.onPrimary },
                    ]}
                  >
                    Tạo lộ trình mới
                  </Text>
                </Pressable>
              )}
              <View style={styles.searchRow}>
                <TextInput
                  value={search}
                  placeholder="Tìm địa điểm để thêm..."
                  placeholderTextColor={palette.textLight}
                  selectionColor={paperTheme.colors.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    },
                  ]}
                  onChangeText={(value) => {
                    setSearch(value);
                    setShowSuggestions(false);
                  }}
                  onSubmitEditing={() => void findPlaces()}
                />
                <Pressable
                  style={[
                    styles.squareButton,
                    { backgroundColor: paperTheme.colors.primary },
                  ]}
                  onPress={() => void findPlaces()}
                >
                  <Ionicons
                    name="search"
                    size={21}
                    color={paperTheme.colors.onPrimary}
                  />
                </Pressable>
              </View>
              {showSuggestions && suggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestions,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  {suggestions.map((prediction) => (
                    <Pressable
                      key={prediction.placeId}
                      onPress={() => void selectPlace(prediction)}
                      style={[styles.suggestion, { borderColor: palette.border }]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color={paperTheme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.suggestionText,
                          { color: palette.textPrimary },
                        ]}
                      >
                        {prediction.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable
                disabled={busy}
                onPress={() => void addMyLocation()}
                style={[
                  styles.myLocationButton,
                  { borderColor: paperTheme.colors.primary },
                ]}
              >
                <Ionicons
                  name="locate"
                  size={20}
                  color={paperTheme.colors.primary}
                />
                <Text
                  style={[
                    styles.myLocationText,
                    { color: paperTheme.colors.primary },
                  ]}
                >
                  Sử dụng vị trí của tôi
                </Text>
              </Pressable>
              <Text style={[styles.help, { color: palette.textSecondary }]}>
                Chạm trực tiếp lên bản đồ hoặc tìm địa điểm để thêm waypoint.
              </Text>

              <View style={styles.modeRow}>
                {(["DRIVING", "MOTORCYCLE"] as TravelMode[]).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setTravelMode(mode);
                      setRoutePath([]);
                    }}
                    style={[
                      styles.mode,
                      { backgroundColor: palette.surfaceMuted },
                      travelMode === mode && styles.modeActive,
                      travelMode === mode && {
                        backgroundColor: paperTheme.colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={mode === "DRIVING" ? "car" : "bicycle"}
                      size={20}
                      color={
                        travelMode === mode
                          ? paperTheme.colors.onPrimary
                          : palette.textSecondary
                      }
                    />
                    <Text
                      style={[
                        travelMode === mode
                          ? styles.modeTextActive
                          : styles.modeText,
                        {
                          color:
                            travelMode === mode
                              ? paperTheme.colors.onPrimary
                              : palette.textSecondary,
                        },
                      ]}
                    >
                      {mode === "DRIVING" ? "Ô tô" : "Xe máy"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.pointHeader}>
                <Text
                  style={[styles.sectionTitle, { color: palette.textPrimary }]}
                >
                  Điểm đã chọn ({points.length})
                </Text>
                {!!points.length && (
                  <Pressable
                    onPress={() => {
                      setPoints([]);
                      setRoutePath([]);
                    }}
                  >
                    <Text style={[styles.clear, { color: errorColor }]}>
                      Xóa tất cả
                    </Text>
                  </Pressable>
                )}
              </View>
              {points.map((point, index) => (
                <View
                  key={`${point.latitude}-${index}`}
                  style={[styles.pointRow, { borderColor: palette.border }]}
                >
                  <Text
                    style={[
                      styles.pointIndex,
                      {
                        backgroundColor: paperTheme.colors.primary,
                        color: paperTheme.colors.onPrimary,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.coordinate, { color: palette.textSecondary }]}
                  >
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setPoints((current) => current.filter((_, position) => position !== index));
                      setRoutePath([]);
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={errorColor}
                    />
                  </Pressable>
                </View>
              ))}

              <Pressable
                disabled={busy || points.length < 2}
                onPress={() => void calculateRoute(points, travelMode)}
                style={[
                  styles.outlineButton,
                  { borderColor: paperTheme.colors.primary },
                  points.length < 2 && styles.disabled,
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={20}
                  color={paperTheme.colors.primary}
                />
                <Text
                  style={[
                    styles.outlineText,
                    { color: paperTheme.colors.primary },
                  ]}
                >
                  Tìm đường
                </Text>
              </Pressable>

              {!!routePath.length && (
                <>
                  <TextInput
                    value={routeName}
                    onChangeText={setRouteName}
                    placeholder="Tên lộ trình"
                    placeholderTextColor={palette.textLight}
                    selectionColor={paperTheme.colors.primary}
                    keyboardAppearance={palette.isDark ? "dark" : "light"}
                    style={[
                      styles.input,
                      styles.nameInput,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                      },
                    ]}
                  />
                  <Pressable
                    disabled={busy}
                    onPress={() => void saveRoute()}
                    style={[
                      styles.saveButton,
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={paperTheme.colors.onPrimary} />
                    ) : (
                      <Text
                        style={[
                          styles.saveText,
                          { color: paperTheme.colors.onPrimary },
                        ]}
                      >
                        Lưu lộ trình
                      </Text>
                    )}
                  </Pressable>
                </>
              )}

              {!!records.length && (
                <Text
                  style={[
                    styles.sectionTitle,
                    styles.savedTitle,
                    { color: palette.textPrimary },
                  ]}
                >
                  Lộ trình đã lưu
                </Text>
              )}
              {records.map((record) => (
                <Pressable
                  key={record.id}
                  onPress={() => void loadRouteFile(record)}
                  style={[
                    styles.record,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                    selectedRecord?.id === record.id && styles.recordActive,
                    selectedRecord?.id === record.id && {
                      backgroundColor: palette.primaryLight,
                      borderColor: paperTheme.colors.primary,
                    },
                  ]}
                >
                  <View style={styles.recordText}>
                    <Text
                      style={[styles.recordName, { color: palette.textPrimary }]}
                    >
                      {record.name}
                    </Text>
                    <Text
                      style={[
                        styles.recordStatus,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {record.active ? "Đang hoạt động" : "Chưa chọn"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setDeleteRecord(record)} hitSlop={8}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={errorColor}
                    />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isViewMode && membersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMembersOpen(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: palette.isDark
                ? "rgba(0,0,0,.58)"
                : "rgba(0,0,0,.25)",
            },
          ]}
        >
          <View
            style={[styles.membersPanel, { backgroundColor: palette.surface }]}
          >
            <View style={styles.panelHeader}>
              <View>
                <Text
                  style={[styles.panelTitle, { color: palette.textPrimary }]}
                >
                  Thành viên trên bản đồ
                </Text>
                <Text
                  style={[
                    styles.membersSummary,
                    { color: palette.textSecondary },
                  ]}
                >
                  {memberStatuses.filter((user) => user.hasLocation).length} có
                  vị trí · {offRouteMembers.length} lệch tuyến
                </Text>
              </View>
              <Pressable onPress={() => setMembersOpen(false)}>
                <Ionicons
                  name="close"
                  size={26}
                  color={palette.textPrimary}
                />
              </Pressable>
            </View>

            <View style={styles.thresholdRow}>
              <Text
                style={[
                  styles.thresholdLabel,
                  { color: palette.textSecondary },
                ]}
              >
                Ngưỡng cảnh báo
              </Text>
              {[0.1, 0.3, 0.5, 1].map((threshold) => (
                <Pressable
                  key={threshold}
                  onPress={() => setAlertThreshold(threshold)}
                  style={[
                    styles.threshold,
                    { backgroundColor: palette.surfaceMuted },
                    alertThreshold === threshold && styles.thresholdActive,
                    alertThreshold === threshold && {
                      backgroundColor: paperTheme.colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      alertThreshold === threshold
                        ? styles.thresholdTextActive
                        : styles.thresholdText,
                      {
                        color:
                          alertThreshold === threshold
                            ? paperTheme.colors.onPrimary
                            : palette.textSecondary,
                      },
                    ]}
                  >
                    {threshold < 1 ? `${threshold * 1000}m` : "1km"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView>
              {!memberStatuses.length && (
                <View style={styles.noMembers}>
                  <Ionicons
                    name="people-outline"
                    size={38}
                    color={palette.textLight}
                  />
                  <Text
                    style={[
                      styles.noMembersText,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Chưa có thành viên online trên bản đồ.
                  </Text>
                </View>
              )}
              {memberStatuses.map((user) => (
                <Pressable
                  key={user.userId}
                  disabled={!user.hasLocation}
                  onPress={() => {
                    mapRef.current?.animateCamera({
                      center: user,
                      zoom: 17,
                    });
                    setMembersOpen(false);
                  }}
                  style={[
                    styles.memberRow,
                    { backgroundColor: palette.surfaceMuted },
                    user.isOffRoute && styles.memberOffRoute,
                    user.isOffRoute && {
                      backgroundColor: palette.errorLight,
                      borderColor: errorColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: user.color },
                    ]}
                  >
                    <Text style={styles.memberAvatarText}>
                      {user.userName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberText}>
                    <Text
                      style={[styles.memberName, { color: palette.textPrimary }]}
                    >
                      {user.userName}
                      {user.userId === currentUser?.id ? " (Bạn)" : ""}
                    </Text>
                    <Text
                      style={[
                        styles.memberStatus,
                        user.isOffRoute && styles.memberStatusWarning,
                        {
                          color: user.isOffRoute
                            ? errorColor
                            : user.hasLocation
                              ? successColor
                              : palette.textSecondary,
                        },
                      ]}
                    >
                      {!user.hasLocation
                        ? "Chưa chia sẻ vị trí"
                        : routePath.length < 2
                          ? "Đang chia sẻ vị trí"
                          : user.isOffRoute
                            ? `Lệch ${formatRouteDistance(
                                user.routeDistance || 0,
                              )}`
                            : "Đúng lộ trình"}
                    </Text>
                  </View>
                  {user.hasLocation && (
                    <Ionicons
                      name={user.isOffRoute ? "warning" : "navigate-circle"}
                      size={24}
                      color={user.isOffRoute ? errorColor : successColor}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={allowEdit && !!deleteRecord}
        title="Xóa lộ trình?"
        message={deleteRecord ? `Lộ trình "${deleteRecord.name}" sẽ bị xóa.` : undefined}
        confirmText="Xóa"
        loading={busy}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => void removeRoute()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapWrap: { flex: 1 },
  topActions: { position: "absolute", top: 14, right: 14, gap: 10 },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  alertBadge: {
    position: "absolute",
    top: -8,
    right: -9,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  alertBanner: {
    position: "absolute",
    left: 14,
    right: 74,
    top: 14,
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 12,
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 5,
  },
  alertBannerText: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 13 },
  routeInfo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    elevation: 5,
  },
  routeTitle: { fontSize: 15, fontWeight: "700" },
  routeMeta: { color: COLORS.textSecondary, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.25)" },
  panel: {
    maxHeight: "82%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  membersPanel: {
    maxHeight: "72%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  membersSummary: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  thresholdLabel: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  threshold: {
    minWidth: 43,
    minHeight: 30,
    paddingHorizontal: 7,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceMuted,
  },
  thresholdActive: { backgroundColor: COLORS.primary },
  thresholdText: { fontSize: 11, color: COLORS.textSecondary },
  thresholdTextActive: { fontSize: 11, color: "#fff", fontWeight: "700" },
  memberRow: {
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surfaceMuted,
  },
  memberOffRoute: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: "#fecaca" },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { color: "#fff", fontWeight: "800" },
  memberText: { flex: 1 },
  memberName: { fontWeight: "600" },
  memberStatus: { fontSize: 11, color: "#16a34a", marginTop: 3 },
  memberStatusWarning: { color: COLORS.error, fontWeight: "600" },
  noMembers: { alignItems: "center", paddingVertical: 28 },
  noMembersText: { color: COLORS.textSecondary, marginTop: 8 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  panelTitle: { fontSize: 19, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8 },
  newRouteButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 12,
  },
  newRouteText: { color: "#fff", fontWeight: "700" },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    color: COLORS.textPrimary,
  },
  squareButton: { width: 48, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  suggestions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  suggestion: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  suggestionText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  myLocationButton: {
    minHeight: 44,
    marginTop: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  myLocationText: { color: COLORS.primary, fontWeight: "700" },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 7 },
  modeRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  mode: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.surfaceMuted, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeActive: { backgroundColor: COLORS.primary },
  modeText: { color: COLORS.textSecondary, fontWeight: "600" },
  modeTextActive: { color: "#fff", fontWeight: "700" },
  pointHeader: { marginTop: 20, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  clear: { color: COLORS.error, fontSize: 12 },
  pointRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  pointIndex: { width: 24, height: 24, borderRadius: 12, textAlign: "center", lineHeight: 24, color: "#fff", backgroundColor: COLORS.primary, fontWeight: "700", fontSize: 11 },
  coordinate: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  outlineButton: { minHeight: 46, marginTop: 14, borderRadius: 13, borderWidth: 1, borderColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  outlineText: { color: COLORS.primary, fontWeight: "700" },
  nameInput: { marginTop: 14 },
  saveButton: { minHeight: 48, marginTop: 10, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.45 },
  savedTitle: { marginTop: 24, marginBottom: 8 },
  record: { minHeight: 54, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  recordActive: { borderColor: COLORS.primary, backgroundColor: COLORS.infoLight },
  recordText: { flex: 1 },
  recordName: { fontWeight: "600" },
  recordStatus: { fontSize: 11, color: COLORS.textSecondary },
});
