import { api } from "@/src/services/api";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker, PageSubtitle, PageTitle } from "@/src/components/ui/AppTypography";
import { ListTrip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    ImageBackground,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Avatar, Surface, Text } from "react-native-paper";

const MyTripsScreen = () => {
  const router = useRouter();
  const { tripReturnToken } = useLocalSearchParams<{
    tripReturnToken?: string;
  }>();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [trips, setTrips] = useState<ListTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const hasLoadedTripsRef = useRef(false);
  const handledTripReturnRef = useRef<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ListTrip[]>("/trips/all-by-user");
      setTrips(res.data);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      hasLoadedTripsRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (
        tripReturnToken &&
        handledTripReturnRef.current !== tripReturnToken &&
        hasLoadedTripsRef.current
      ) {
        handledTripReturnRef.current = tripReturnToken;
        return;
      }

      void fetchTrips();
    }, [fetchTrips, tripReturnToken]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchTrips();
  };

  const filteredTrips = trips.filter((trip) => {
    if (filter === "active") return !trip.isCloseTrip;
    if (filter === "completed") return trip.isCloseTrip;
    return true;
  });

  const activeCount = trips.filter((t) => !t.isCloseTrip).length;

  const handleTripPress = (trip: ListTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trips/${trip.id}`);
  };

  const getTripStatus = (trip: ListTrip) => {
    if (trip.isCloseTrip) {
      return {
        label: "Đã kết thúc",
        color: palette.textLight,
        bgColor: palette.surfaceMuted,
      };
    }
    return {
      label: "Đang diễn ra",
      color: COLORS.success,
      bgColor: palette.successLight,
    };
  };

  const renderTripCard = ({ item }: { item: ListTrip }) => {
    const status = getTripStatus(item);
    const totalExpenses =
      item.expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
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
                : require("@/assets/images/trip-hero-cao-bang.png")
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
                <View style={styles.coverMenu}>
                  <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
                </View>
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
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.metaText, { color: palette.textSecondary }]} numberOfLines={1}>
                {item.location || "Điểm đến đang cập nhật"}
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

              <View
                style={[
                  styles.expensesContainer,
                  { backgroundColor: palette.surfaceMuted },
                ]}
              >
                <Ionicons
                  name="wallet-outline"
                  size={14}
                  color={palette.textSecondary}
                />
                <Text style={[styles.expensesText, { color: palette.textPrimary }]}>
                  {formatMoney(totalExpenses)}
                </Text>
              </View>
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
        <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Chưa có chuyến đi nào</Text>
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

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: palette.surface, borderColor: palette.border },
            filter === "all" && { backgroundColor: palette.surface },
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: palette.textSecondary },
              filter === "all" && { color: palette.textPrimary, fontWeight: "800" },
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: palette.surface, borderColor: palette.border },
            filter === "active" && { backgroundColor: palette.surface },
          ]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: palette.textSecondary },
              filter === "active" && { color: palette.textPrimary, fontWeight: "800" },
            ]}
          >
            Đang diễn ra
          </Text>
          {activeCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: palette.surface }]}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: palette.surface, borderColor: palette.border },
            filter === "completed" && { backgroundColor: palette.surface },
          ]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: palette.textSecondary },
              filter === "completed" && { color: palette.textPrimary, fontWeight: "800" },
            ]}
          >
            Đã kết thúc
          </Text>
        </TouchableOpacity>
      </View>

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
        ListEmptyComponent={renderEmptyState}
      />
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
    width: 30,
    height: 30,
    borderRadius: 15,
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
