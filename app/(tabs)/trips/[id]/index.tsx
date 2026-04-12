import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

// Tab Components
import BalanceList from "@/src/components/balance/BalanceList";
import ExpenseList from "@/src/components/expense/ExpenseList";
import Leader from "@/src/components/leader/Leader";
import TimelineList from "@/src/components/timeline/TimelineList";
import TripInfo from "@/src/components/trip/TripInfo";
import { useTripStore } from "@/src/store/trip.store";
import { LinearGradient } from "expo-linear-gradient";

const TripDetailScreen = () => {
  const router = useRouter();
  const layout = useWindowDimensions();
  const { loading, trip, setTrip, fetchTrip } = useTripStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tabIndex, setTabIndex] = useState(0);

  const [routes, setRoutes] = useState([
    { key: "info", title: "Thông tin", icon: "information-circle-outline" },
    { key: "timeline", title: "Lịch trình", icon: "calendar-outline" },
    { key: "expenses", title: "Chi phí", icon: "wallet-outline" },
    { key: "balance", title: "Thanh toán", icon: "card-outline" },
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchTrip(id);
    }, [id]),
  );

  useEffect(() => {
    if (trip.id) {
      const baseRoutes = [
        { key: "info", title: "Thông tin", icon: "information-circle-outline" },
        { key: "timeline", title: "Lịch trình", icon: "calendar-outline" },
        { key: "expenses", title: "Chi phí", icon: "wallet-outline" },
        { key: "balance", title: "Thanh toán", icon: "card-outline" },
      ];

      if (trip.isLeader && !trip.isCloseTrip) {
        setRoutes([
          ...baseRoutes,
          { key: "leader", title: "Leader", icon: "settings-outline" },
        ]);
      } else {
        setRoutes(baseRoutes);
      }

      if (trip.isCloseTrip) {
        setTabIndex(0);
      }
    }
  }, [trip]);

  const renderScene = SceneMap({
    info: () => <TripInfo trip={trip} />,
    timeline: () => <TimelineList trip={trip} />,
    expenses: () => <ExpenseList trip={trip} />,
    balance: () => <BalanceList trip={trip} />,
    leader: () => <Leader trip={trip} setTrip={setTrip} />,
  });

  // Kiểm tra có nên hiển thị nút thêm trên header không
  const shouldShowHeaderButton = () => {
    // Trip đã close thì không hiển thị gì
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

      default:
        break;
    }
  };

  const renderHeaderRight = () => {
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
