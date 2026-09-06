import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { ImageBackground, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Avatar, Button, Dialog, IconButton, Portal, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AppToast } from "@/src/components/AppToast";
import { api } from "@/src/services/api";
import { taskApi } from "@/src/services/task";
import { useUserStore } from "@/src/store/user.store";
import { useFavoriteTripsStore } from "@/src/store/favorite-trips.store";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker, PageSubtitle, PageTitle } from "@/src/components/ui/AppTypography";
import type { Group } from "@/src/type/group";
import type { ListTrip } from "@/src/type/trip";
import type { TripTask } from "@/src/type/task";
import type { TripFund } from "@/src/type/fund";
import { formatMoney } from "@/src/utils/helper";
import { COLORS } from "@/src/utils/constants";

type DashboardTrip = ListTrip & { createdAt?: string };
const boundary = (value: string, end = false) => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (end) date.setHours(23, 59, 59, 999);
  return date.getTime();
};
const inProgress = (trip: DashboardTrip, now: number) => !trip.isCloseTrip && boundary(trip.startDate) <= now && boundary(trip.endDate, true) >= now;

export default function OverviewScreen() {
  const focused = useIsFocused();
  const palette = useAppPalette();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const favorites = useFavoriteTripsStore((state) => state.byUser);
  const toggleFavorite = useFavoriteTripsStore((state) => state.toggle);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trip, setTrip] = useState<DashboardTrip | null>(null);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [funds, setFunds] = useState<TripFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    // Reset request status when revisiting this screen or pulling to refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    setDetailError(false);
    void (async () => {
      try {
        const [tripResponse, groupResponse] = await Promise.all([
          api.get<DashboardTrip[]>("/trips/all-by-user"), api.get<Group[]>("/groups"),
        ]);
        if (!active) return;
        const time = Date.now();
        const trips = tripResponse.data;
        const current = trips.filter((item) => inProgress(item, time)).sort((a, b) => boundary(b.startDate) - boundary(a.startDate))[0];
        const next = current || trips.filter((item) => !item.isCloseTrip).sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0))[0] || null;
        setNow(time); setTrip(next); setGroups(groupResponse.data); setTasks([]); setFunds([]);
        if (next) {
          const [taskResult, fundResult] = await Promise.allSettled([taskApi.list(next.id), api.get<TripFund[]>(`/trips/${next.id}/funds`)]);
          if (!active) return;
          setTasks(taskResult.status === "fulfilled" ? taskResult.value.data : []);
          setFunds(fundResult.status === "fulfilled" ? fundResult.value.data : []);
          setDetailError(taskResult.status === "rejected" || fundResult.status === "rejected");
        }
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [focused, revision]);
  const openTrip = (tab = "info") => trip && router.push({ pathname: "/trips/[id]", params: { id: trip.id, tab } });
  const spent = trip?.expenses?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
  const planned = funds.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const percent = planned ? Math.min(100, Math.round(spent / planned * 100)) : 0;
  const userId = user?.id || "guest";
  const creatableGroups = groups.filter((group) => group.canCreateTrip ?? group.isCreate);
  const createInGroup = (id: string) => {
    setCreateOpen(false);
    router.push({ pathname: "/groups/[id]/trip-form", params: { id } });
  };
  const createTrip = () => {
    if (!creatableGroups.length) AppToast.show({ title: "Không thể tạo chuyến đi", message: "Bạn cần là chủ nhóm hoặc quản trị viên để tạo chuyến đi", type: "info" });
    else if (creatableGroups.length === 1) createInGroup(creatableGroups[0].id);
    else setCreateOpen(true);
  };
  const cardStyle = { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 12, padding: 16 };
  const categories = Object.entries((trip?.expenses || []).reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category || "Khác"] = (totals[expense.category || "Khác"] || 0) + Number(expense.amount || 0);
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const budgetColors = ["#176B59", "#ED765E", "#E5A33D"];
  const shortMoney = (amount: number) => amount >= 1_000_000 ? `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : amount >= 1000 ? `${Math.round(amount / 1000)}k` : formatMoney(amount);
  const shortDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(value));
  const ringColor = (angle: number) => {
    let end = 0;
    for (let index = 0; index < categories.length; index++) {
      end += planned ? categories[index][1] / planned * 360 : 0;
      if (angle < end) return budgetColors[index];
    }
    return palette.surfaceMuted;
  };
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 90 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision((value) => value + 1)} />}>
      <PageKicker>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(now))}</PageKicker>
      <PageTitle style={{ marginTop: 6 }}>Chào {user?.name?.trim().split(/\s+/).pop() || "bạn"}, đi đâu tiếp nhỉ?</PageTitle>
      <PageSubtitle style={{ fontSize: 11, marginTop: 8 }}>Mọi thứ quan trọng cho những chuyến sắp tới, trong một góc nhìn.</PageSubtitle>
      {error && <Button onPress={() => setRevision((value) => value + 1)}>Không thể tải tổng quan. Thử lại</Button>}
      {trip ? <Pressable accessibilityRole="button" accessibilityLabel={`Mở chuyến đi ${trip.name}`} onPress={() => openTrip()} style={{ marginTop: 20, borderRadius: 16, overflow: "hidden" }}>
        <ImageBackground source={trip.coverImage ? { uri: trip.coverImage } : require("@/assets/images/trip-hero-cao-bang.webp")} style={{ height: 360 }}>
          <LinearGradient colors={["rgba(8,30,24,.04)", "rgba(8,30,24,.28)", "rgba(8,30,24,.94)"]} locations={[0.24,0.52,1]} style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "white", backgroundColor: "rgba(15,44,37,.48)", padding: 8, borderRadius: 20, fontSize: 9, fontWeight: "800" }}>{inProgress(trip, now) ? "Đang diễn ra" : `✈ Sắp khởi hành · ${Math.max(0, Math.ceil((boundary(trip.startDate) - now) / 86400000))} ngày nữa`}</Text>
              <IconButton style={{ margin: 0, backgroundColor: "rgba(15,44,37,.48)" }} icon={favorites[userId]?.includes(trip.id) ? "heart" : "heart-outline"} iconColor="white" accessibilityLabel={favorites[userId]?.includes(trip.id) ? "Bỏ yêu thích" : "Yêu thích"} onPress={(event) => { event.stopPropagation(); toggleFavorite(userId, trip.id); }} />
            </View>
            <View>
              <PageKicker style={{ color: "#BCE8D7" }}>Chuyến đi tiếp theo</PageKicker>
              <Text style={{ color: "white", fontFamily: "DMSerifDisplay", fontSize: 36, lineHeight: 39, marginTop: 6 }}>{trip.name}</Text>
              <Text style={{ color: "rgba(255,255,255,.75)", fontSize: 10, marginTop: 8 }}>⌖ {trip.location || "Điểm đến đang cập nhật"} · {shortDate(trip.startDate)} — {shortDate(trip.endDate)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                <View style={{ flexDirection: "row" }}>{(trip.members || []).slice(0, 4).map((member, index) => <View key={member.id} style={{ marginLeft: index ? -10 : 0, borderWidth: 2, borderColor: "white", borderRadius: 18 }}>{member.user.avatar ? <Avatar.Image size={32} source={{ uri: member.user.avatar }} /> : <Avatar.Text size={32} label={member.user.name?.[0] || "?"} />}</View>)}</View>
                <Button mode="contained" style={{ borderRadius: 10 }} onPress={() => openTrip()}>Mở chuyến đi →</Button>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable> : !loading && !error && <View style={[cardStyle, { marginTop: 20, borderStyle: "dashed" }]}><Text>Chưa có chuyến đi sắp tới</Text><Button onPress={() => router.push("/(tabs)")}>Tạo từ một nhóm</Button></View>}
      {detailError && <Button onPress={() => setRevision((value) => value + 1)}>Chưa tải đủ công việc hoặc ngân sách. Thử lại</Button>}
      <View style={[cardStyle, { marginTop: 16 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><View><PageKicker>Việc cần làm</PageKicker><Text style={{ fontSize: 20, fontWeight: "800", marginTop: 4 }}>Hôm nay</Text></View><IconButton icon="dots-horizontal" accessibilityLabel="Xem tất cả công việc" disabled={!trip} onPress={() => openTrip("tasks")} /></View>
        {tasks.filter((task) => !task.isCompleted).slice(0, 2).map((task, index) => <Pressable key={task.id} onPress={() => openTrip("tasks")} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 8 }}>
          <Text style={{ width: 45, fontSize: 9, fontWeight: "800" }}>{task.dueDate ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(task.dueDate)) : "Sớm"}</Text>
          <View style={{ width: 4, alignSelf: "stretch", borderRadius: 4, backgroundColor: index ? COLORS.primary : COLORS.secondary }} />
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 10, fontWeight: "800" }}>{task.title}</Text><Text style={{ fontSize: 8, color: palette.textLight, marginTop: 3 }}>{trip?.name}</Text></View>
          {task.assignee?.avatar ? <Avatar.Image size={29} source={{ uri: task.assignee.avatar }} /> : <Avatar.Text size={29} label={task.assignee?.name?.[0] || "•"} />}
        </Pressable>)}
        {!loading && !detailError && !tasks.some((task) => !task.isCompleted) && <Text style={{ fontSize: 11, paddingVertical: 16, color: palette.textSecondary }}>Không còn công việc đang chờ cho chuyến sắp tới.</Text>}
        {!!trip && tasks.length > 0 && <Button style={{ alignSelf: "flex-start" }} onPress={() => openTrip("tasks")}>Xem tất cả công việc →</Button>}
      </View>
      <View style={[cardStyle, { marginTop: 16, borderRadius: 22, padding: 18 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><View><PageKicker>Ngân sách chuyến tới</PageKicker><Text style={{ fontSize: 20, fontWeight: "800", marginTop: 4 }}>{planned ? shortMoney(planned) : "Chưa thiết lập"}</Text></View><Text style={{ fontSize: 10, color: palette.primary, backgroundColor: palette.primaryLight, alignSelf: "flex-start", padding: 8, borderRadius: 20 }}>↗ {percent}%</Text></View>
        <View accessible accessibilityLabel={`${percent}% ngân sách, ${formatMoney(spent)} đã dùng`} style={{ width: 135, height: 135, marginVertical: 20, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: 180 }, (_, index) => <View key={index} style={{ position: "absolute", width: 135, height: 135, alignItems: "center", transform: [{ rotate: `${index * 2}deg` }] }}><View style={{ width: 3.2, height: 20, backgroundColor: ringColor(index * 2) }} /></View>)}
          <Text style={{ fontSize: 18, fontWeight: "800" }}>{shortMoney(spent)}</Text><Text style={{ fontSize: 9, color: palette.textLight }}>đã dùng</Text>
        </View>
        {categories.map(([category, amount], index) => <View key={category} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: budgetColors[index] }} /><Text style={{ flex: 1, fontSize: 10, color: palette.textSecondary }}>{category}</Text><Text style={{ fontSize: 10, fontWeight: "800" }}>{shortMoney(amount)}</Text></View>)}
        {!categories.length && <Text style={{ fontSize: 9, color: palette.textLight }}>Chưa có khoản chi</Text>}
        <Button disabled={!trip} style={{ alignSelf: "flex-start" }} onPress={() => openTrip()}>Xem chi tiết →</Button>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 28, marginBottom: 12 }}><View><PageKicker>Cùng nhau lên đường</PageKicker><Text style={{ fontSize: 20, fontWeight: "800", marginTop: 4 }}>Nhóm đang hoạt động</Text></View><Button compact onPress={() => router.push("/(tabs)")}>Xem tất cả</Button></View>
      {groups.slice(0, 3).map((group, index) => <Pressable key={group.id} onPress={() => router.push(`/groups/${group.id}`)} style={{ flexDirection: "row", alignItems: "center", minHeight: 72, padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: [palette.primaryLight, palette.purpleLight, palette.warningLight][index] }}>
        <Image source={group.coverImage || group.trips?.find((item) => item.coverImage)?.coverImage ? { uri: group.coverImage || group.trips.find((item) => item.coverImage)!.coverImage } : require("@/assets/images/trip-hero-cao-bang.webp")} style={{ width: 45, height: 45, borderRadius: 12 }} />
        <View style={{ flex: 1, marginLeft: 10 }}><Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "800" }}>{group.name}</Text><Text style={{ fontSize: 8, color: palette.textSecondary, marginTop: 3 }}>{group.members?.length || 0} thành viên · {group.trips?.length || 0} chuyến</Text></View><Text>→</Text>
      </Pressable>)}
      <Button mode="outlined" style={{ borderStyle: "dashed", borderColor: palette.border, borderRadius: 12 }} contentStyle={{ minHeight: 58 }} onPress={() => router.push("/groups/create")}>＋ Tạo nhóm mới</Button>
    </ScrollView>
    <IconButton icon="plus" iconColor="white" mode="contained" containerColor={COLORS.primary} accessibilityLabel="Tạo chuyến đi" disabled={loading || error} onPress={createTrip} style={{ position: "absolute", right: 12, bottom: 12, width: 54, height: 54, borderRadius: 27 }} />
    <Portal><Dialog visible={createOpen} onDismiss={() => setCreateOpen(false)} style={{ backgroundColor: palette.surface }}><Dialog.Title>Chọn nhóm tạo chuyến đi</Dialog.Title><Dialog.ScrollArea><ScrollView>{creatableGroups.map((group) => <Button key={group.id} onPress={() => createInGroup(group.id)}>{group.name}</Button>)}</ScrollView></Dialog.ScrollArea><Dialog.Actions><Button onPress={() => setCreateOpen(false)}>Đóng</Button></Dialog.Actions></Dialog></Portal>
  </View>;
}