import { AppToast } from "@/src/components/AppToast";
import { Group } from "@/src/type/group";
import { useUserStore } from "@/src/store/user.store";
import { useFavoriteTripsStore } from "@/src/store/favorite-trips.store";
import { calendarDate, getTripPhase, tripPhaseOptions, TripPhase } from "@/src/utils/tripPhase";
import { api } from "@/src/services/api";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker, PageSubtitle, PageTitle } from "@/src/components/ui/AppTypography";
import { ListTrip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    ImageBackground,
    RefreshControl,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Avatar, Button, Dialog, Portal, ProgressBar, Surface, Text } from "react-native-paper";

const MyTripsScreen = () => {
  const router = useRouter();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [trips, setTrips] = useState<ListTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TripPhase>("upcoming");
  const [referenceTime, setReferenceTime] = useState(Date.now);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"nearest" | "farthest">("nearest");
  const [loadError, setLoadError] = useState(false);
  const userId = useUserStore((state) => state.user?.id) || "guest";
  const favoritesByUser = useFavoriteTripsStore((state) => state.byUser);
  const toggleFavorite = useFavoriteTripsStore((state) => state.toggle);
  const favoriteIds = favoritesByUser[userId] || [];
  const hasLoadedTripsRef = useRef(false);

  const fetchTrips = useCallback(async () => {
    try {
      if (!hasLoadedTripsRef.current) setLoading(true);
      setLoadError(false);
      const [res, groupRes] = await Promise.all([
        api.get<ListTrip[] | { data: ListTrip[] }>("/trips/all-by-user"),
        api.get<Group[] | { data: Group[] }>("/groups").catch(() => ({ data: [] as Group[] })),
      ]);
      const nextTrips = Array.isArray(res.data) ? res.data : res.data.data || [];
      setTrips(nextTrips);
      setGroups(Array.isArray(groupRes.data) ? groupRes.data : groupRes.data.data || []);
      const now = Date.now();
      setReferenceTime(now);
      if (!hasLoadedTripsRef.current) {
        setFilter(nextTrips.some((trip) => getTripPhase(trip, now) === "current") ? "current"
          : nextTrips.some((trip) => getTripPhase(trip, now) === "upcoming") ? "upcoming" : "past");
      }
      hasLoadedTripsRef.current = true;
    } catch (error) {
      setLoadError(true);
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh after edits/closing a trip; preserve filters while fetching.
      void fetchTrips();
    }, [fetchTrips]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchTrips();
  };

  const counts = { upcoming: 0, current: 0, past: 0 };
  trips.forEach((trip) => counts[getTripPhase(trip, referenceTime)]++);
  const filteredTrips = trips.filter((trip) => getTripPhase(trip, referenceTime) === filter)
    .filter((trip) => selectedGroup === "all" || trip.group?.id === selectedGroup)
    .filter((trip) => !favoritesOnly || favoriteIds.includes(trip.id))
    .sort((a, b) => (calendarDate(a.startDate) - calendarDate(b.startDate)) * (sortOrder === "nearest" ? 1 : -1));
  const tripGroups = Array.from(new Map(trips.filter((trip) => trip.group?.id).map((trip) => [trip.group.id, trip.group])).values());
  const creatableGroups = groups.filter((group) => group.canCreateTrip ?? group.isCreate);
  const activeFilterCount = Number(selectedGroup !== "all") + Number(favoritesOnly) + Number(sortOrder !== "nearest");
  const createInGroup = (id: string) => {
    setGroupPickerOpen(false);
    router.push({ pathname: "/groups/[id]/trip-form", params: { id } });
  };
  const openCreateTrip = () => {
    if (!creatableGroups.length) {
      AppToast.show({ title: "Không thể tạo chuyến đi", message: "Bạn cần là chủ nhóm hoặc quản trị viên để tạo chuyến đi", type: "info" });
    } else if (creatableGroups.length === 1) createInGroup(creatableGroups[0].id);
    else setGroupPickerOpen(true);
  };
  const handleTripPress = (trip: ListTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trips/${trip.id}`);
  };

  const getTripStatus = (trip: ListTrip) => {
    const phase = getTripPhase(trip, referenceTime);
    const today = new Date(referenceTime);
    today.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.ceil((calendarDate(trip.startDate) - today.getTime()) / 86400000));
    return {
      label: phase === "current" ? "Đang đi" : phase === "past" ? "Đã qua" : Number.isFinite(days) ? `${days} ngày nữa` : "Sắp tới",
      color: phase === "current" ? "#FFFFFF" : palette.textPrimary,
      bgColor: phase === "current" ? COLORS.primary : palette.surface,
    };
  };
  const renderTripCard = ({ item }: { item: ListTrip }) => {
    const status = getTripStatus(item);
    const phase = getTripPhase(item, referenceTime);
    const preparation = phase === "past" ? 100 : phase === "current" ? 82
      : Math.min(85, Math.max(24, ((item.timelines?.length || 0) + (item.expenses?.length || 0)) * 8));
    const memberCount = item.members?.length || 0;

    return (
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => handleTripPress(item)}
        activeOpacity={0.7}
      >
        <Surface
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          elevation={0}
        >
          <ImageBackground
            source={
              item.coverImage
                ? { uri: item.coverImage }
                : require("@/assets/images/trip-hero-cao-bang.webp")
            }
            style={[styles.cover, { backgroundColor: palette.primaryLight }]}
            imageStyle={styles.coverImage}
          >
            <LinearGradient
              colors={["rgba(9,24,42,.08)", "rgba(9,24,42,.78)"]}
              style={styles.coverOverlay}
            >
              <View style={styles.coverTop}>
                <View
                  style={[styles.statusBadge, { backgroundColor: status.bgColor }]}
                >
                  <Text style={[styles.statusBadgeText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                <TouchableOpacity style={styles.coverMenu} accessibilityRole="button"
                  accessibilityLabel={favoriteIds.includes(item.id) ? "Bỏ yêu thích" : "Yêu thích"}
                  accessibilityState={{ selected: favoriteIds.includes(item.id) }}
                  onPress={(event) => { event.stopPropagation(); toggleFavorite(userId, item.id); }}>
                  <Ionicons name={favoriteIds.includes(item.id) ? "heart" : "heart-outline"} size={20} color={favoriteIds.includes(item.id) ? "#ED7966" : "#FFFFFF"} />
                </TouchableOpacity>
              </View>
              <View style={{ position: "absolute", left: 12, bottom: 12, maxWidth: "85%", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(20,32,28,.62)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="location-outline" size={15} color="#FFFFFF" />
                <Text numberOfLines={1} style={{ color: "#FFFFFF", fontSize: 11.5, flexShrink: 1 }}>{item.location || "Điểm đến đang cập nhật"}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>

          <View style={styles.cardBody}>
            <Text style={styles.tripKicker} numberOfLines={1}>
              {item.group?.name || "Chuyến đi của tôi"}
            </Text>
            <Text
              style={[styles.tripName, { color: palette.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.metaText, { color: palette.textSecondary }]}>
                {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(item.startDate))}
                {" – "}
                {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(item.endDate))}
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.membersContainer}>
              {item.members?.slice(0, 4).map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberAvatar,
                    { borderColor: palette.surface },
                    { marginLeft: index > 0 ? -12 : 0 },
                  ]}
                >
                  {member.user?.avatar ? (
                    <Avatar.Image
                      source={{ uri: member.user.avatar }}
                      size={28}
                    />
                  ) : (
                    <Avatar.Text
                      size={28}
                      label={getNameFirstLetterUpper(member.user?.name || "")}
                      style={styles.memberAvatarFallback}
                    />
                  )}
                </View>
              ))}
              {memberCount > 4 && (
                  <View
                    style={[
                      styles.memberAvatar,
                      { borderColor: palette.surface, marginLeft: -12 },
                    ]}
                  >
                  <View
                    style={[
                      styles.moreMembers,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                    ]}
                  >
                    <Text style={[styles.moreMembersText, { color: palette.textSecondary }]}>
                      +{memberCount - 4}
                    </Text>
                  </View>
                </View>
              )}
              </View>

              <Text style={{ color: palette.textSecondary, fontSize: 11.5, marginLeft: 8, flex: 1 }}>
                {memberCount ? `${memberCount} người tham gia` : "Chưa có thành viên"}
              </Text>
            </View>
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "700" }}>Chuẩn bị chuyến đi</Text>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: COLORS.primary }}>{preparation}%</Text>
              </View>
              <ProgressBar progress={preparation / 100} color={COLORS.primary} style={{ height: 6, borderRadius: 6, backgroundColor: palette.primaryLight }} />
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Surface
        style={[
          styles.emptyCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        elevation={0}
      >
        <Text style={styles.emptyEmoji}>✈️</Text>
        <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Chưa có chuyến đi {tripPhaseOptions.find((option) => option.value === filter)?.label.toLowerCase()}</Text>
      </Surface>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View style={styles.header}>
        <PageKicker>Bộ sưu tập hành trình</PageKicker>
        <PageTitle style={styles.pageTitle}>Chuyến đi của tôi</PageTitle>
        <PageSubtitle style={styles.pageSubtitle}>
          Lưu giữ những hành trình đáng nhớ và tiếp tục khám phá.
        </PageSubtitle>
      </View>

      <View style={styles.filterTabs}>
        {tripPhaseOptions.map((option) => (
          <TouchableOpacity key={option.value} accessibilityRole="tab" accessibilityState={{ selected: filter === option.value }}
            style={[styles.filterTab, { backgroundColor: filter === option.value ? palette.surface : "transparent" }]}
            onPress={() => setFilter(option.value)}>
            <Text style={[styles.filterTabText, filter === option.value && { color: palette.textPrimary, fontWeight: "800" }]}>
              {option.label}{counts[option.value] > 0 ? ` ${counts[option.value]}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button mode="outlined" icon="tune" onPress={() => setFilterOpen(true)}
        style={{ marginHorizontal: 16, marginBottom: 12, borderColor: activeFilterCount ? COLORS.primary : palette.border }}>
        Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ""}
      </Button>
      {loadError && <View style={{ paddingHorizontal: 16 }}>
        <Text>Không thể tải danh sách chuyến đi.</Text>
        <Button onPress={handleRefresh}>Thử lại</Button>
      </View>}
      <Portal>
        <Dialog visible={filterOpen} onDismiss={() => setFilterOpen(false)} style={{ backgroundColor: palette.surface }}>
          <Dialog.Title>Bộ lọc chuyến đi</Dialog.Title>
          <Dialog.ScrollArea><ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 16 }}>
            <Text>Sắp xếp theo</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button mode={sortOrder === "nearest" ? "contained" : "outlined"} onPress={() => setSortOrder("nearest")}>Gần nhất</Button>
              <Button mode={sortOrder === "farthest" ? "contained" : "outlined"} onPress={() => setSortOrder("farthest")}>Xa nhất</Button>
            </View>
            <Text>Nhóm</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[{ id: "all", name: "Tất cả" }, ...tripGroups].map((group) => (
                <Button key={group.id} mode={selectedGroup === group.id ? "contained" : "outlined"} onPress={() => setSelectedGroup(group.id)}>{group.name}</Button>
              ))}
            </View>
            <Button icon={favoritesOnly ? "heart" : "heart-outline"} mode={favoritesOnly ? "contained" : "outlined"} onPress={() => setFavoritesOnly(!favoritesOnly)}>Chỉ hiện chuyến yêu thích</Button>
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => { setSelectedGroup("all"); setFavoritesOnly(false); setSortOrder("nearest"); }}>Đặt lại</Button>
            <Button onPress={() => setFilterOpen(false)}>Áp dụng</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={groupPickerOpen} onDismiss={() => setGroupPickerOpen(false)} style={{ backgroundColor: palette.surface }}>
          <Dialog.Title>Chọn nhóm tạo chuyến đi</Dialog.Title>
          <Dialog.ScrollArea><ScrollView>
            {creatableGroups.map((group) => <Button key={group.id} onPress={() => createInGroup(group.id)}>{group.name}</Button>)}
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setGroupPickerOpen(false)}>Đóng</Button></Dialog.Actions>
        </Dialog>
      </Portal>
      {/* Trip List */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={loadError ? null : renderEmptyState}
      />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Thêm chuyến đi" onPress={openCreateTrip}
        style={{ position: "absolute", right: 18, bottom: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", elevation: 5 }}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createStyles = (palette: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  pageTitle: { marginTop: 4 },
  pageSubtitle: { marginTop: 7 },
  headerSubtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    gap: 4,
    borderRadius: 12,
    backgroundColor: palette.surfaceMuted,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textSecondary,
  },
  filterBadge: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  cover: { height: 180, backgroundColor: palette.primaryLight },
  coverImage: { resizeMode: "cover" },
  coverOverlay: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-start",
  },
  coverTop: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverMenu: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,.26)",
  },
  coverTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  coverGroup: { color: "rgba(255,255,255,.82)", fontSize: 12, marginTop: 3 },
  cardBody: { padding: 16 },
  tripKicker: {
    color: COLORS.primary,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripIconText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  tripInfo: {
    flex: 1,
  },
  tripNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  tripName: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.textPrimary,
    flexShrink: 1,
    marginTop: 5,
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { flex: 1, marginLeft: 7, fontSize: 11.5 },
  tripGroup: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  leaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    flexShrink: 0,
  },
  leaderBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9A6500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  dateText: {
    fontSize: 13,
    color: palette.textSecondary,
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: palette.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  membersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
  },
  memberAvatarFallback: {
    backgroundColor: COLORS.primary,
  },
  moreMembers: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: "center",
    alignItems: "center",
  },
  moreMembersText: {
    fontSize: 10,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  expensesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  expensesText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textPrimary,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
  },
  createButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default MyTripsScreen;
