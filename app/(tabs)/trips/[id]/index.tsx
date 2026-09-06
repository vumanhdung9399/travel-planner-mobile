import { resolveTripDetailTab } from "@/src/utils/tripDetail";
import GroupChatFab from "@/src/components/group/GroupChatFab";
import BalanceList from "@/src/components/balance/BalanceList";
import ExpenseList from "@/src/components/expense/ExpenseList";
import Leader from "@/src/components/leader/Leader";
import TaskChecklist from "@/src/components/task/TaskChecklist";
import TimelineList from "@/src/components/timeline/TimelineList";
import TripInfo from "@/src/components/trip/TripInfo";
import { TripDetailContentContext } from "@/src/components/trip/TripDetailContent";
import TripFundList from "@/src/components/tripfund/TripFundList";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { useTripStore } from "@/src/store/trip.store";
import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import { formatMoney } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, ImageBackground, RefreshControl, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Section = "info" | "timeline" | "tasks" | "finance" | "leader";
type Finance = "expenses" | "fund" | "balance";
const sections: { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "info", label: "Tổng quan", icon: "information-circle-outline" },
  { key: "timeline", label: "Lịch trình", icon: "calendar-outline" },
  { key: "tasks", label: "Công việc", icon: "checkbox-outline" },
  { key: "finance", label: "Tài chính", icon: "wallet-outline" },
  { key: "leader", label: "Quản lý", icon: "settings-outline" },
];
const financeSections: { key: Finance; label: string }[] = [{ key: "expenses", label: "Chi phí" }, { key: "fund", label: "Quỹ" }, { key: "balance", label: "Thanh toán" }];

export default function TripDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return <TripDetailPage key={`${id}/${tab || "info"}`} />;
}

function TripDetailPage() {
  const router = useRouter();
  const { id, tab, originGroupId } = useLocalSearchParams<{ id: string; tab?: string; originGroupId?: string }>();
  const { trip, loading, fetchTrip, setTrip, contentRevision, markContentChanged } = useTripStore();
  const palette = useAppPalette();
  const [requestedSection, setSection] = useState<Section>(() => resolveTripDetailTab(tab, true).section);
  const [finance, setFinance] = useState<Finance>(() => resolveTripDetailTab(tab, true).finance);
  const [refreshing, setRefreshing] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [funds, setFunds] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [financeError, setFinanceError] = useState(false);
  const expenseExport = useRef<(() => Promise<void>) | null>(null);
  const balanceExport = useRef<(() => Promise<void>) | null>(null);
  const backPending = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const sectionY = useRef(0);
  const canManage = trip.isLeader && !trip.isCloseTrip;
  const section = requestedSection === "leader" && !canManage ? "info" : requestedSection;

  useFocusEffect(useCallback(() => {
    backPending.current = false;
    if (trip.id !== id) void fetchTrip(id);
  }, [fetchTrip, id, trip.id]));
  useEffect(() => {
    if (trip.id !== id) return;
    let active = true;
    Promise.all([
      api.get<{ amount: number | string }[]>(`/trips/${id}/funds`),
      api.get<{ amount: number | string; status: string }[]>(`/expenses/${id}`),
    ]).then(([fundResult, expenseResult]) => {
      if (!active) return;
      setFunds(fundResult.data.reduce((sum, item) => sum + Number(item.amount || 0), 0));
      setExpenses(expenseResult.data.filter(item => item.status === "approved").reduce((sum, item) => sum + Number(item.amount || 0), 0));
      setFinanceError(false);
    }).catch(() => { if (active) setFinanceError(true); });
    return () => { active = false; };
  }, [id, trip.id, contentRevision]);

  const back = useCallback(() => {
    if (backPending.current) return;
    backPending.current = true;
    if (originGroupId) {
      router.dismissTo("/trips");
      router.navigate({ pathname: "/groups/[id]", params: { id: originGroupId, tripReturnToken: Date.now().toString() } });
    } else router.dismissTo({ pathname: "/trips", params: { tripReturnToken: Date.now().toString() } });
  }, [originGroupId, router]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));
  const openSection = (next: Section, nextFinance?: Finance) => {
    setSection(next);
    if (nextFinance) setFinance(nextFinance);
    scroll.current?.scrollTo({ y: sectionY.current, animated: true });
  };
  const refresh = async () => {
    setRefreshing(true);
    try { await fetchTrip(id); markContentChanged(); } finally { setRefreshing(false); }
  };
  const share = async () => {
    const url = Linking.createURL(`/trips/${id}`);
    await Share.share({ title: trip.name, message: `${trip.name}\n${url}`, url });
  };
  const action = !trip.isCloseTrip && (section === "timeline" && trip.isLeader || section === "finance" && (finance === "expenses" || finance === "fund" && trip.isLeader));
  const actionLabel = section === "timeline" ? "Thêm hoạt động" : finance === "fund" ? "Thêm đóng góp" : "Thêm chi phí";
  const add = () => {
    if (section === "timeline") {
      setCreateActivityOpen(true);
      return;
    }
    router.push(finance === "fund" ? `/trips/${id}/fund-form` : `/trips/${id}/expense-form`);
  };
  const members = trip.group?.members || [];
  const duration = Math.max(dayjs(trip.endDate).diff(dayjs(trip.startDate), "day") + 1, 1);
  const usage = funds > 0 ? Math.min(Math.round(expenses / funds * 100), 100) : 0;
  const common = { trip, refreshKey: contentRevision };
  const card = { backgroundColor: palette.surface, borderColor: palette.border };


  if (trip.id !== id) return <SafeAreaView style={[styles.centered, { backgroundColor: palette.background }]}>
    {loading ? <ActivityIndicator color={COLORS.primary} /> : <><Text>Không tải được chuyến đi</Text><TouchableOpacity onPress={() => void fetchTrip(id)}><Text>Thử lại</Text></TouchableOpacity></>}
  </SafeAreaView>;

  return <SafeAreaView edges={["top", "left", "right"]} style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={palette.isDark ? "light" : "dark"} />
    <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 88 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.topButton} onPress={back} accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={21} color={palette.textPrimary} /></TouchableOpacity>
        <Text style={[styles.topTitle, { color: palette.textPrimary }]}>Tổng quan chuyến</Text>
        <TouchableOpacity style={styles.topButton} onPress={() => router.push("/notification")} accessibilityLabel="Thông báo"><Ionicons name="notifications-outline" size={21} color={palette.textPrimary} /></TouchableOpacity>
      </View>
      <ImageBackground source={trip.coverImage ? { uri: trip.coverImage } : require("../../../../assets/images/trip-hero-cao-bang.webp")} style={styles.hero} imageStyle={{ borderRadius: 16 }}>
        <LinearGradient colors={["rgba(2,20,33,.56)", "rgba(2,20,33,.12)", "rgba(2,22,31,.68)"]} locations={[0, .42, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => router.dismissTo("/trips")} style={styles.heroButton}><Ionicons name="arrow-back" size={15} color="white" /><Text style={styles.heroSmall}>Các chuyến đi</Text></TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 7 }}>
            <TouchableOpacity style={styles.heroButton} onPress={() => void share()} accessibilityLabel="Chia sẻ chuyến đi"><Ionicons name="share-outline" size={17} color="white" /></TouchableOpacity>
            {canManage && <TouchableOpacity style={styles.heroButton} onPress={() => openSection("leader")} accessibilityLabel="Tuỳ chọn chuyến đi"><Ionicons name="ellipsis-horizontal" size={17} color="white" /></TouchableOpacity>}
          </View>
        </View>
        <View style={styles.heroSummary}>
          <Text style={styles.pill}>Sắp khởi hành · {Math.max(dayjs(trip.startDate).diff(dayjs(), "day"), 0)} ngày nữa</Text>
          <Text style={styles.heroTitle}>{trip.name}</Text>
          <View style={styles.meta}>
            {!!trip.location && <Text style={styles.heroSmall}><Ionicons name="location-outline" size={12} /> {trip.location}</Text>}
            <Text style={styles.heroSmall}><Ionicons name="calendar-outline" size={12} /> {dayjs(trip.startDate).format("DD/MM")} — {dayjs(trip.endDate).format("DD/MM/YYYY")}</Text>
            <Text style={styles.heroSmall}>{duration} ngày {Math.max(duration - 1, 0)} đêm</Text>
          </View>
          <View style={styles.members}>{members.slice(0, 5).map((member, index) => member.avatar ? <Image key={member.id} source={{ uri: member.avatar }} style={[styles.avatar, { marginLeft: index ? -7 : 0 }]} /> : <View key={member.id} style={[styles.avatar, styles.initial, { marginLeft: index ? -7 : 0 }]}><Text style={{ color: "white", fontSize: 10 }}>{member.name?.charAt(0)}</Text></View>)}<Text style={[styles.heroSmall, { marginLeft: 8 }]}>{members.length} người cùng đi</Text></View>
        </View>
      </ImageBackground>
      <View onLayout={event => { sectionY.current = event.nativeEvent.layout.y; }} style={[styles.sectionFrame, card]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionBar}>
          {sections.filter(item => item.key !== "leader" || canManage).map(item => <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: section === item.key }} style={[styles.sectionTab, section === item.key && { backgroundColor: COLORS.primary }]} onPress={() => setSection(item.key)}>
            <Ionicons name={item.icon} size={17} color={section === item.key ? "white" : palette.textSecondary} /><Text style={[styles.sectionLabel, { color: section === item.key ? "white" : palette.textSecondary }]}>{item.label}</Text>
          </TouchableOpacity>)}
        </ScrollView>
      </View>
      <View style={{ paddingTop: 16 }}>
        <TripDetailContentContext.Provider value>
          {section === "info" && <TripInfo trip={trip} onOpenSection={openSection} />}
          {section === "timeline" && <TimelineList {...common} createActionOpen={createActivityOpen} onCreateActionClose={() => setCreateActivityOpen(false)} />}
          {section === "tasks" && <TaskChecklist {...common} />}
          {section === "leader" && canManage && <Leader {...common} setTrip={setTrip} isActive onOpenTasks={() => openSection("tasks")} />}
          {section === "finance" && <>
            <View style={[styles.financeTabs, card]}>{financeSections.map(item => <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: finance === item.key }} onPress={() => setFinance(item.key)} style={[styles.financeTab, finance === item.key && { backgroundColor: COLORS.primary }]}><Text style={{ fontSize: 12, fontWeight: "700", color: finance === item.key ? "white" : palette.textSecondary }}>{item.label}</Text></TouchableOpacity>)}</View>
            {finance !== "balance" && <View style={[styles.financeCard, card]}>
              <Text style={{ fontSize: 14, fontWeight: "800" }}>Tài chính chuyến đi</Text>
              {financeError ? <Text style={{ marginTop: 10 }}>Chưa tải được tổng tài chính. Kéo xuống để thử lại.</Text> : <>
                <View style={styles.moneyRow}>{[{ label: "Tổng chi phí", value: expenses }, { label: "Tổng quỹ", value: funds }, { label: funds >= expenses ? "Quỹ còn lại" : "Còn thiếu", value: Math.abs(funds - expenses) }].map(item => <View key={item.label} style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 10, color: palette.textSecondary }}>{item.label}</Text><Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.primary }}>{formatMoney(item.value)}</Text></View>)}</View>
                <View style={[styles.track, { backgroundColor: palette.border }]}><View style={{ width: `${usage}%`, height: 6, backgroundColor: COLORS.primary }} /></View>
                <Text style={{ fontSize: 10, color: palette.textSecondary, marginTop: 6 }}>Đã sử dụng {usage}% quỹ chuyến đi</Text>
              </>}
            </View>}
            {finance !== "fund" && <TouchableOpacity style={styles.exportButton} onPress={() => void (finance === "balance" ? balanceExport.current?.() : expenseExport.current?.())}><Ionicons name="download-outline" size={16} color={COLORS.primary} /><Text style={{ fontSize: 12, color: COLORS.primary }}>Xuất PDF</Text></TouchableOpacity>}
            {finance === "expenses" ? <ExpenseList {...common} onExportReady={handler => { expenseExport.current = handler; }} /> : finance === "fund" ? <TripFundList {...common} /> : <BalanceList {...common} onExportReady={handler => { balanceExport.current = handler; }} />}
          </>}
        </TripDetailContentContext.Provider>
      </View>
    </ScrollView>
    {action && <TouchableOpacity style={[styles.addButton, { bottom: 16 }]} onPress={add}><Ionicons name="add" size={20} color="white" /><Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{actionLabel}</Text></TouchableOpacity>}
    {!!trip.group?.id && <GroupChatFab groupId={trip.group.id} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  topbar: { minHeight: 64, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" }, topButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, topTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800" },
  hero: { minHeight: 280, justifyContent: "space-between", gap: 24, margin: 16, marginTop: 16, borderRadius: 16, overflow: "hidden", paddingVertical: 20, paddingHorizontal: 18 }, heroTop: { flexDirection: "row", justifyContent: "space-between" }, heroButton: { flexDirection: "row", alignItems: "center", gap: 6, padding: 9, borderRadius: 9, backgroundColor: "rgba(255,255,255,.15)" }, heroSmall: { color: "white", fontSize: 10.5 }, heroSummary: { gap: 0 }, pill: { color: "white", alignSelf: "flex-start", fontSize: 10, backgroundColor: "rgba(255,255,255,.2)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, overflow: "hidden" }, heroTitle: { color: "white", fontFamily: "DMSerifDisplay", fontWeight: "400", fontSize: 30, lineHeight: 34, marginTop: 10, marginBottom: 10 }, meta: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, members: { flexDirection: "row", alignItems: "center", marginTop: 12 }, avatar: { width: 29, height: 29, borderRadius: 15, borderWidth: 2, borderColor: "white" }, initial: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary },
  sectionFrame: { marginHorizontal: 16, borderWidth: 1, borderRadius: 10 }, sectionBar: { padding: 5, gap: 5 }, sectionTab: { minWidth: 84, minHeight: 39, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, sectionLabel: { fontSize: 9.5, fontWeight: "700" },
  financeTabs: { flexDirection: "row", marginHorizontal: 12, marginBottom: 12, padding: 3, borderWidth: 1, borderRadius: 999 }, financeTab: { flex: 1, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" }, financeCard: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderWidth: 1, borderRadius: 12 }, moneyRow: { flexDirection: "row", gap: 8, marginVertical: 12 }, track: { height: 6, borderRadius: 3, overflow: "hidden" }, exportButton: { alignSelf: "flex-end", flexDirection: "row", gap: 6, alignItems: "center", marginRight: 16, marginBottom: 12 },
  addButton: { position: "absolute", right: 16, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 24, backgroundColor: COLORS.primary, padding: 13 },
});
