import GroupChatFab from "@/src/components/group/GroupChatFab";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  ImageBackground,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { TabView } from "react-native-tab-view";

// Tab Components
import BalanceList from "@/src/components/balance/BalanceList";
import ExpenseList from "@/src/components/expense/ExpenseList";
import Leader from "@/src/components/leader/Leader";
import TaskChecklist from "@/src/components/task/TaskChecklist";
import TimelineList from "@/src/components/timeline/TimelineList";
import TripInfo from "@/src/components/trip/TripInfo";
import TripFundList from "@/src/components/tripfund/TripFundList";
import { useTripStore } from "@/src/store/trip.store";
import { formatMoney } from "@/src/utils/helper";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type HeroSummary = {
  eyebrow: string;
  value: string;
  pill?: string;
};

const TRIP_HERO_HEIGHT = 160;
const COMPACT_HEADER_SCROLL_OFFSET = 110;

const tabKeyToIndex: Record<string, number> = {
  info: 0,
  timeline: 1,
  expenses: 2,
  balance: 3,
  fund: 4,
  tasks: 5,
  leader: 6,
};

const TripDetailScreen = () => {
  const router = useRouter();
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { loading, trip, setTrip, fetchTrip, contentRevision } = useTripStore();
  const { id, tab, originGroupId } = useLocalSearchParams<{
    id: string;
    tab?: string;
    originGroupId?: string;
  }>();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [tabIndex, setTabIndex] = useState(0);
  const [tabSummaries, setTabSummaries] = useState<
    Partial<Record<string, HeroSummary>>
  >({});
  const expenseExportRef = useRef<(() => Promise<void>) | null>(null);
  const balanceExportRef = useRef<(() => Promise<void>) | null>(null);
  const scrollOffsets = useRef<Record<string, number>>({});
  const isHandlingBackRef = useRef(false);
  const sceneScrollY = useRef(new Animated.Value(0)).current;
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const hasProcessedInitialTab = useRef(false);
  const pendingTab = useRef<string | undefined>(tab);

  const [routes, setRoutes] = useState([
    { key: "info", title: "Thông tin", icon: "information-circle-outline" },
    { key: "timeline", title: "Lịch trình", icon: "calendar-outline" },
    { key: "expenses", title: "Chi phí", icon: "wallet-outline" },
    { key: "balance", title: "Thanh toán", icon: "card-outline" },
    { key: "fund", title: "Quỹ", icon: "analytics-outline" },
    { key: "tasks", title: "Việc", icon: "checkbox-outline" },
  ]);

  const updateTabSummary = useCallback((key: string, summary: HeroSummary) => {
    setTabSummaries((current) => {
      const previous = current[key];
      if (
        previous?.eyebrow === summary.eyebrow &&
        previous.value === summary.value &&
        previous.pill === summary.pill
      ) {
        return current;
      }
      return { ...current, [key]: summary };
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      hasProcessedInitialTab.current = false;
      pendingTab.current = tab;
      if (trip.id !== id) {
        void fetchTrip(id);
      }
    }, [fetchTrip, id, tab, trip.id]),
  );

  const handleSceneScroll = useCallback(
    (key: string, offset: number) => {
      scrollOffsets.current[key] = offset;
      if (routes[tabIndex]?.key === key) {
        sceneScrollY.setValue(offset);
        const nextScrolled = offset > COMPACT_HEADER_SCROLL_OFFSET;
        setHeaderScrolled((current) =>
          current === nextScrolled ? current : nextScrolled,
        );
      }
    },
    [routes, sceneScrollY, tabIndex],
  );

  useEffect(() => {
    const activeKey = routes[tabIndex]?.key;
    sceneScrollY.setValue(
      activeKey ? scrollOffsets.current[activeKey] || 0 : 0,
    );
    setHeaderScrolled(
      activeKey
        ? (scrollOffsets.current[activeKey] || 0) >
          COMPACT_HEADER_SCROLL_OFFSET
        : false,
    );
  }, [routes, sceneScrollY, tabIndex]);

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
        { key: "tasks", title: "Việc", icon: "checkbox-outline" },
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
          return (
            <TripInfo
              trip={trip}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("info", offset)
              }
            />
          );
        case "timeline":
          return (
            <TimelineList
              trip={trip}
              refreshKey={contentRevision}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("timeline", offset)
              }
              onSummaryChange={(summary) =>
                updateTabSummary("timeline", summary)
              }
            />
          );
        case "expenses":
          return (
            <ExpenseList
              trip={trip}
              refreshKey={contentRevision}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("expenses", offset)
              }
              onSummaryChange={(summary) =>
                updateTabSummary("expenses", summary)
              }
              onExportReady={(handler) => {
                expenseExportRef.current = handler;
              }}
            />
          );
        case "balance":
          return (
            <BalanceList
              trip={trip}
              refreshKey={contentRevision}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("balance", offset)
              }
              onSummaryChange={(summary) =>
                updateTabSummary("balance", summary)
              }
              onExportReady={(handler) => {
                balanceExportRef.current = handler;
              }}
            />
          );
        case "fund":
          return (
            <TripFundList
              trip={trip}
              refreshKey={contentRevision}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("fund", offset)
              }
              onSummaryChange={(summary) => updateTabSummary("fund", summary)}
            />
          );
        case "leader":
          return (
            <Leader
              trip={trip}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              setTrip={setTrip}
              isActive={routes[tabIndex]?.key === "leader"}
              onOpenTasks={() => {
                const taskIndex = routes.findIndex(
                  (item) => item.key === "tasks",
                );
                if (taskIndex >= 0) setTabIndex(taskIndex);
              }}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("leader", offset)
              }
            />
          );
        case "tasks":
          return (
            <TaskChecklist
              trip={trip}
              contentInsetTop={TRIP_HERO_HEIGHT + insets.top}
              onScrollOffsetChange={(offset) =>
                handleSceneScroll("tasks", offset)
              }
            />
          );
        default:
          return null;
      }
    },
    [
      contentRevision,
      handleSceneScroll,
      insets.top,
      routes,
      setTrip,
      tabIndex,
      trip,
      updateTabSummary,
    ],
  );

  const getDefaultSummary = (): HeroSummary => {
    const key = routes[tabIndex]?.key || "info";
    const approvedExpenses = (trip.expenses || []).filter(
      (expense) => expense.status === "approved",
    );
    const totalExpense = approvedExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    switch (key) {
      case "info": {
        const duration = Math.max(
          dayjs(trip.endDate).diff(dayjs(trip.startDate), "day") + 1,
          1,
        );
        return {
          eyebrow: `Chuyến đi ${duration} ngày ${Math.max(duration - 1, 0)} đêm`,
          value: trip.name || trip.location || "Chuyến đi",
        };
      }
      case "timeline":
        return {
          eyebrow: "Lịch trình chuyến đi",
          value: `${trip.timelines?.length || 0} hoạt động`,
        };
      case "expenses":
        return {
          eyebrow: "Tổng chi chuyến đi",
          value: formatMoney(totalExpense),
        };
      case "balance":
        return {
          eyebrow: "Thanh toán chuyến đi",
          value: trip.isCloseTrip ? "Đã chốt sổ" : "Đang cập nhật",
        };
      case "fund":
        return { eyebrow: "Quỹ chuyến đi", value: "Đang cập nhật" };
      case "tasks":
        return { eyebrow: "Checklist nhóm", value: "Công việc chuyến đi" };
      case "leader":
        return { eyebrow: "Quản lý chuyến đi", value: "Leader" };
      default:
        return { eyebrow: "Chi tiết chuyến đi", value: trip.name };
    }
  };

  const activeRouteKey = routes[tabIndex]?.key || "info";
  const activeSummary = tabSummaries[activeRouteKey] || getDefaultSummary();

  const shouldShowHeaderButton = () => {
    if (trip.isCloseTrip) return false;

    switch (tabIndex) {
      case 0:
        return false;

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

      case 6:
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
        return "add";
      case 2:
        return "add";
      case 4:
        return "add";
      default:
        return "add";
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

  const handleShareTrip = useCallback(async () => {
    if (!trip.id) return;

    const url = Linking.createURL(`/trips/${trip.id}`);
    await Share.share({
      title: trip.name,
      message: `${trip.name}\n${url}`,
      url,
    });
  }, [trip.id, trip.name]);

  const handleBack = useCallback(() => {
    if (isHandlingBackRef.current) return;
    isHandlingBackRef.current = true;

    if (originGroupId) {
      router.dismissTo("/trips");
      router.navigate({
        pathname: "/groups/[id]",
        params: {
          id: originGroupId,
          tripReturnToken: Date.now().toString(),
        },
      } as any);
      return;
    }

    router.dismissTo({
      pathname: "/trips",
      params: { tripReturnToken: Date.now().toString() },
    });
  }, [originGroupId, router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [handleBack]),
  );

  const renderHeaderRight = () => {
    const iconColor =
      headerScrolled && !palette.isDark ? palette.textPrimary : "#FFFFFF";
    const buttonStyle = [
      styles.headerButton,
      headerScrolled && { backgroundColor: palette.surfaceMuted },
    ];
    const shareButton = (
      <TouchableOpacity
        onPress={() => void handleShareTrip()}
        style={buttonStyle}
        accessibilityLabel={`Chia sẻ chuyến đi ${trip.name}`}
      >
        <Ionicons name="share-outline" size={20} color={iconColor} />
      </TouchableOpacity>
    );

    if (tabIndex === 2) {
      return (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => void expenseExportRef.current?.()}
            style={buttonStyle}
            accessibilityLabel="Tải xuống PDF chi phí"
          >
            <Ionicons name="download-outline" size={21} color={iconColor} />
          </TouchableOpacity>
          {shareButton}
        </View>
      );
    }

    if (tabIndex === 3) {
      return (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => void balanceExportRef.current?.()}
            style={buttonStyle}
            accessibilityLabel="Tải xuống PDF thanh toán"
          >
            <Ionicons name="download-outline" size={21} color={iconColor} />
          </TouchableOpacity>
          {shareButton}
        </View>
      );
    }

    return shareButton;
  };

  const renderFloatingAction = () => {
    if (!shouldShowHeaderButton()) return null;

    const labels: Record<number, string> = {
      0: "Chỉnh sửa",
      1: "Thêm hoạt động",
      2: "Thêm chi phí",
      4: "Thêm đóng góp",
    };

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={handleHeaderButtonPress}
        style={styles.floatingAction}
        accessibilityLabel={labels[tabIndex] || "Thêm mới"}
      >
        <LinearGradient
          colors={COLORS.primaryGradient as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatingActionGradient}
        >
          <Ionicons
            name={getHeaderButtonIcon() as keyof typeof Ionicons.glyphMap}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.floatingActionText}>
            {labels[tabIndex] || "Thêm mới"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => {
    return (
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          <View style={[styles.tabBar, { backgroundColor: palette.surface }]}>
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
                      color={isActive ? COLORS.primary : palette.textLight}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: palette.textSecondary },
                      isActive && styles.tabLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {route.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

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
      edges={["bottom"]}
    >
      <StatusBar
        style={headerScrolled && !palette.isDark ? "dark" : "light"}
        backgroundColor="transparent"
        translucent
      />
      <View
        style={[
          styles.compactHeader,
          { height: insets.top + 56, paddingTop: insets.top },
          headerScrolled && {
            backgroundColor: palette.surface,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={10}
          style={[
            styles.headerButton,
            styles.backButton,
            headerScrolled && { backgroundColor: palette.surfaceMuted },
          ]}
          accessibilityLabel="Quay lại"
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={
              headerScrolled && !palette.isDark
                ? palette.textPrimary
                : "#FFFFFF"
            }
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.tripName,
            headerScrolled && { color: palette.textPrimary },
          ]}
          numberOfLines={1}
        >
          {trip.name}
        </Text>
        {renderHeaderRight() || <View style={styles.headerButtonPlaceholder} />}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroLayer,
          {
            height: TRIP_HERO_HEIGHT + insets.top,
            transform: [
              {
                translateY: sceneScrollY.interpolate({
                  inputRange: [0, TRIP_HERO_HEIGHT + insets.top],
                  outputRange: [0, -(TRIP_HERO_HEIGHT + insets.top)],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <ImageBackground
          source={
            trip.coverImage
              ? { uri: trip.coverImage }
              : require("@/assets/images/trip-hero-cao-bang.png")
          }
          style={[styles.hero, { height: TRIP_HERO_HEIGHT + insets.top }]}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={[
              "rgba(3,22,38,.62)",
              "rgba(3,22,38,.08)",
              "rgba(3,22,38,.68)",
            ]}
            locations={[0, 0.48, 1]}
            style={[styles.heroOverlay, { paddingTop: insets.top + 56 }]}
          >
            {!headerScrolled ? (
              <View style={styles.heroSummary}>
                <Text style={styles.heroEyebrow}>{activeSummary.eyebrow}</Text>
                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue} numberOfLines={1}>
                    {activeSummary.value}
                  </Text>
                  {activeSummary.pill ? (
                    <View style={styles.heroPill}>
                      <Text style={styles.heroPillText}>
                        {activeSummary.pill}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      {Object.keys(trip).length > 0 ? (
        <View
          style={[
            styles.tabViewContainer,
            { backgroundColor: palette.background },
          ]}
        >
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
        <View
          style={[styles.centered, { backgroundColor: palette.background }]}
        >
          <Text style={{ color: palette.textPrimary }}>
            Không tìm thấy chuyến đi
          </Text>
        </View>
      )}
      {renderFloatingAction()}
      {trip.group?.id ? (
        <GroupChatFab
          groupId={trip.group.id}
          side={shouldShowHeaderButton() ? "left" : "right"}
        />
      ) : null}
    </SafeAreaView>
  );
};

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    compactHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
      elevation: 30,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "transparent",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: palette.background,
    },
    tabViewContainer: {
      flex: 1,
    },
    hero: {
      height: TRIP_HERO_HEIGHT,
      backgroundColor: COLORS.primaryDark,
    },
    heroLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      elevation: 2,
    },
    heroImage: {
      resizeMode: "cover",
    },
    heroOverlay: {
      flex: 1,
      paddingHorizontal: 14,
      paddingBottom: 14,
      justifyContent: "flex-end",
    },
    tripName: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
      marginHorizontal: 10,
      textShadowColor: "rgba(0,0,0,.28)",
      textShadowRadius: 8,
    },
    heroSummary: {
      paddingHorizontal: 2,
    },
    heroEyebrow: {
      color: "rgba(255,255,255,.92)",
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 6,
      textShadowColor: "rgba(0,0,0,.28)",
      textShadowRadius: 8,
    },
    heroValueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    heroValue: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      letterSpacing: -0.6,
      textShadowColor: "rgba(0,0,0,.3)",
      textShadowRadius: 10,
    },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,.72)",
      backgroundColor: "rgba(15,23,42,.24)",
    },
    heroPillText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    tabBarContainer: {
      backgroundColor: palette.surface,
      paddingBottom: 12,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: palette.surface,
      paddingHorizontal: 4,
      paddingVertical: 2,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0,
      elevation: 0,
    },
    tabBarScroll: {
      flexGrow: 1,
    },
    tabItem: {
      width: 68,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      position: "relative",
    },
    tabIconContainer: {
      width: 34,
      height: 30,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 1,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: palette.textLight,
      textAlign: "center",
    },
    tabLabelActive: {
      color: COLORS.primary,
      fontWeight: "600",
    },
    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(15,23,42,.26)",
    },
    backButton: {
      backgroundColor: "transparent",
    },
    headerButtonPlaceholder: {
      width: 38,
      height: 38,
    },
    floatingAction: {
      position: "absolute",
      right: 16,
      bottom: 102,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 9,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      zIndex: 18,
    },
    floatingActionGradient: {
      minHeight: 46,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    floatingActionText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
  });

export default TripDetailScreen;
