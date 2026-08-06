import { api } from "@/src/services/api";
import { ListTrip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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

  const [trips, setTrips] = useState<ListTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, []),
  );

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get<ListTrip[]>("/trips/all-by-user");
      setTrips(res.data);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrips();
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
        color: COLORS.textLight,
        bgColor: COLORS.surfaceMuted,
      };
    }
    return {
      label: "Đang diễn ra",
      color: COLORS.success,
      bgColor: COLORS.successLight,
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
        <Surface style={styles.card} elevation={0}>
          <ImageBackground
            source={
              item.coverImage
                ? { uri: item.coverImage }
                : require("@/assets/images/trip-hero-cao-bang.png")
            }
            style={styles.cover}
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
            <Text style={styles.tripName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.membersContainer}>
              {item.members?.slice(0, 4).map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberAvatar,
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
                <View style={[styles.memberAvatar, { marginLeft: -12 }]}>
                  <View style={styles.moreMembers}>
                    <Text style={styles.moreMembersText}>
                      +{memberCount - 4}
                    </Text>
                  </View>
                </View>
              )}
              </View>

              <View style={styles.expensesContainer}>
                <Ionicons
                  name="wallet-outline"
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.expensesText}>
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
      <Surface style={styles.emptyCard} elevation={0}>
        <Text style={styles.emptyEmoji}>✈️</Text>
        <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
      </Surface>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chuyến đi của tôi</Text>
        <Ionicons name="filter-outline" size={22} color={COLORS.textPrimary} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "active" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "active" && styles.filterTabTextActive,
            ]}
          >
            Đang diễn ra
          </Text>
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "completed" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "completed" && styles.filterTabTextActive,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 8,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: "#fff",
  },
  filterBadge: {
    backgroundColor: COLORS.surface,
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
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 80,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cover: { height: 148, backgroundColor: COLORS.primaryLight },
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
  cardBody: { padding: 12 },
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
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  tripGroup: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  leaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningLight,
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
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  moreMembersText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  expensesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  expensesText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
