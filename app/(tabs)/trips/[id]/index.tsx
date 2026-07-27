import { CommonHeader } from "@/src/components/layout/CommonHeader";
import GroupChatFab from "@/src/components/group/GroupChatFab";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";
import { TabView } from "react-native-tab-view";

// Tab Components
import BalanceList from "@/src/components/balance/BalanceList";
import ExpenseList from "@/src/components/expense/ExpenseList";
import Leader from "@/src/components/leader/Leader";
import TimelineList from "@/src/components/timeline/TimelineList";
import TripInfo from "@/src/components/trip/TripInfo";
import TripFundList from "@/src/components/tripfund/TripFundList";
import { useTripStore } from "@/src/store/trip.store";
import { LinearGradient } from "expo-linear-gradient";

const tabKeyToIndex: Record<string, number> = {
  info: 0,
  timeline: 1,
  expenses: 2,
  balance: 3,
  fund: 4,
  leader: 5,
};

const TripDetailScreen = () => {
  const router = useRouter();
  const layout = useWindowDimensions();
  const { loading, trip, setTrip, fetchTrip } = useTripStore();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();

  const [tabIndex, setTabIndex] = useState(0);
  const expenseExportRef = useRef<(() => Promise<void>) | null>(null);
  const balanceExportRef = useRef<(() => Promise<void>) | null>(null);

  const hasProcessedInitialTab = useRef(false);
  const pendingTab = useRef<string | undefined>(tab);

  const [routes, setRoutes] = useState([
    { key: "info", title: "Thông tin", icon: "information-circle-outline" },
    { key: "timeline", title: "Lịch trình", icon: "calendar-outline" },
    { key: "expenses", title: "Chi phí", icon: "wallet-outline" },
    { key: "balance", title: "Thanh toán", icon: "card-outline" },
    { key: "fund", title: "Quỹ", icon: "analytics-outline" },
  ]);

  useFocusEffect(
    useCallback(() => {
      hasProcessedInitialTab.current = false;
      pendingTab.current = tab;
      fetchTrip(id);
    }, [fetchTrip, id, tab]),
  );

  useEffect(() => {
    if (!loading && trip.id && !hasProcessedInitialTab.current) {
      hasProcessedInitialTab.current = true;

      if (
        pendingTab.current &&
        tabKeyToIndex[pendingTab.current] !== undefined
      ) {
        const targetIndex = tabKeyToIndex[pendingTab.current];

        if (
          pendingTab.current === "leader" &&
          (!trip.isLeader || trip.isCloseTrip)
        ) {
          setTabIndex(0);
        } else {
          setTabIndex(targetIndex);
        }

        pendingTab.current = undefined;
      }
    }
  }, [loading, trip.id, trip.isLeader, trip.isCloseTrip]);

  useEffect(() => {
    if (trip.id) {
      const baseRoutes = [
        { key: "info", title: "Thông tin", icon: "information-circle-outline" },
        { key: "timeline", title: "Lịch trình", icon: "calendar-outline" },
        { key: "expenses", title: "Chi phí", icon: "wallet-outline" },
        { key: "balance", title: "Thanh toán", icon: "card-outline" },
        { key: "fund", title: "Quỹ", icon: "analytics-outline" },
      ];

      if (trip.isLeader && !trip.isCloseTrip) {
        setRoutes([
          ...baseRoutes,
          { key: "leader", title: "Leader", icon: "settings-outline" },
        ]);
      } else {
        setRoutes(baseRoutes);
      }
    }
  }, [trip]);

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      switch (route.key) {
        case "info":
          return <TripInfo trip={trip} />;
        case "timeline":
          return <TimelineList trip={trip} />;
        case "expenses":
          return (
            <ExpenseList
              trip={trip}
              onExportReady={(handler) => {
                expenseExportRef.current = handler;
              }}
            />
          );
        case "balance":
          return (
            <BalanceList
              trip={trip}
              onExportReady={(handler) => {
                balanceExportRef.current = handler;
              }}
            />
          );
        case "fund":
          return <TripFundList trip={trip} />;
        case "leader":
          return <Leader trip={trip} setTrip={setTrip} />;
        default:
          return null;
      }
    },
    [setTrip, trip],
  );

  const shouldShowHeaderButton = () => {
    if (trip.isCloseTrip) return false;

    switch (tabIndex) {
      case 0:
        return trip.isLeader;

      case 1:
        return trip.isLeader;

      case 2:
        return true;

      case 3:
        return false;

      case 4:
        return trip.isLeader;

      case 5:
        return false;

      default:
        return false;
    }
  };

  const getHeaderButtonIcon = (): string => {
    switch (tabIndex) {
      case 0:
        return "pencil";
      case 1:
        return "plus";
      case 2:
        return "plus";
      case 4:
        return "plus";
      default:
        return "plus";
    }
  };

  const handleHeaderButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (tabIndex) {
      case 0:
        router.push(`/groups/${trip.group?.id}/trip-form?tripId=${trip.id}`);
        break;

      case 1:
        router.push(`/trips/${trip.id}/timeline-form`);
        break;

      case 2:
        router.push(`/trips/${trip.id}/expense-form`);
        break;

      case 4:
        router.push(`/trips/${trip.id}/fund-form`);
        break;

      default:
        break;
    }
  };

  const renderHeaderRight = () => {
    if (tabIndex === 2) {
      return (
        <View style={styles.headerActions}>
          {!trip.isCloseTrip && (
            <TouchableOpacity
              onPress={handleHeaderButtonPress}
              style={styles.headerActionButton}
              accessibilityLabel="Tạo chi phí"
            >
              <IconButton icon="plus" size={22} iconColor={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => void expenseExportRef.current?.()}
            style={styles.headerActionButton}
            accessibilityLabel="Tải xuống PDF chi phí"
          >
            <IconButton
              icon="download-outline"
              size={22}
              iconColor={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      );
    }

    if (tabIndex === 3) {
      return (
        <TouchableOpacity
          onPress={() => void balanceExportRef.current?.()}
          style={styles.headerButton}
          accessibilityLabel="Tải xuống PDF thanh toán"
        >
          <IconButton
            icon="download-outline"
            size={22}
            iconColor={COLORS.primary}
          />
        </TouchableOpacity>
      );
    }

    if (!shouldShowHeaderButton()) return undefined;

    return (
      <TouchableOpacity
        onPress={handleHeaderButtonPress}
        style={styles.headerButton}
      >
        <IconButton
          icon={getHeaderButtonIcon()}
          size={22}
          iconColor={COLORS.primary}
        />
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => {
    return (
      <View style={styles.tabBarContainer}>
        <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.tabBar}>
          {routes.map((route, index) => {
            const isActive = tabIndex === index;
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTabIndex(index);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIconContainer]}>
                  <Ionicons
                    name={route.icon as any}
                    size={22}
                    color={isActive ? COLORS.primary : COLORS.textLight}
                  />
                </View>
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {route.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        title={trip.name || "Chi tiết chuyến đi"}
        fallbackHref="/trips"
        rightElement={renderHeaderRight()}
      />

      {Object.keys(trip).length > 0 ? (
        <View style={styles.tabViewContainer}>
          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={renderScene}
            onIndexChange={setTabIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
            lazy
            swipeEnabled={!trip.isCloseTrip}
            tabBarPosition="bottom"
          />
        </View>
      ) : (
        <View style={styles.centered}>
          <Text>Không tìm thấy chuyến đi</Text>
        </View>
      )}
      {trip.group?.id ? <GroupChatFab groupId={trip.group.id} /> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionButton: {
    marginLeft: -6,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  tabViewContainer: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingBottom: 20,
    paddingTop: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    position: "relative",
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight,
    textAlign: "center",
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  headerButton: {
    marginRight: 8,
  },
});

export default TripDetailScreen;
