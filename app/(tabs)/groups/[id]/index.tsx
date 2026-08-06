import ActionSheet from "@/src/components/ActionSheet";
import { AppToast } from "@/src/components/AppToast";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import GroupChatFab from "@/src/components/group/GroupChatFab";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useGroupStore } from "@/src/store/group.store";
import type { Trip } from "@/src/type/trip";
import { COLORS, GROUP_ROLE } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuMode = "group" | "cover" | "member" | "trip" | null;

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const { loading, group, fetchGroup } = useGroupStore();
  const [menuMode, setMenuMode] = useState<MenuMode>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverDeleteOpen, setCoverDeleteOpen] = useState(false);
  const [tripDeleteOpen, setTripDeleteOpen] = useState(false);
  const [tripDeleting, setTripDeleting] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGroup(id);
    }, [fetchGroup, id]),
  );

  const leader = useMemo(
    () =>
      group?.members?.find(
        (member) =>
          member.role === GROUP_ROLE.LEADER ||
          member.role === GROUP_ROLE.OWNER,
      ) || group?.members?.[0],
    [group?.members],
  );
  const canEdit =
    !!group?.isCreate || (!!leader && leader.user.id === currentUser?.id);
  const canManageCover =
    group?.canManageCover ?? (!!leader && leader.user.id === currentUser?.id);

  const pickGroupCover = async () => {
    if (!group || coverLoading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      AppToast.show({
        title: "Chưa có quyền truy cập ảnh",
        message: "Vui lòng cấp quyền thư viện ảnh để chọn ảnh nhóm.",
        type: "info",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.uri) return;
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      AppToast.show({
        title: "Ảnh quá lớn",
        message: "Vui lòng chọn ảnh có kích thước tối đa 5 MB.",
        type: "error",
      });
      return;
    }

    try {
      setCoverLoading(true);
      const extension =
        asset.fileName?.split(".").pop()?.toLowerCase() ||
        asset.uri.split(".").pop()?.toLowerCase() ||
        "jpg";
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: `group-cover.${extension}`,
        type:
          asset.mimeType ||
          (extension === "png"
            ? "image/png"
            : extension === "webp"
              ? "image/webp"
              : "image/jpeg"),
      } as any);
      await api.patch(`/groups/${group.id}/cover`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchGroup(group.id);
      AppToast.show({
        title: "Đã cập nhật ảnh nhóm",
        message: "Ảnh mới đã được hiển thị trên banner và danh sách nhóm.",
      });
    } catch {
      AppToast.show({
        title: "Không thể cập nhật ảnh",
        message: "Vui lòng thử lại sau.",
        type: "error",
      });
    } finally {
      setCoverLoading(false);
    }
  };

  const deleteGroupCover = async () => {
    if (!group) return;
    try {
      setCoverLoading(true);
      await api.delete(`/groups/${group.id}/cover`);
      await fetchGroup(group.id);
      AppToast.show({
        title: "Đã xóa ảnh nhóm",
        message: "Banner đang dùng ảnh chuyến đi hoặc ảnh mặc định.",
      });
    } catch {
      AppToast.show({
        title: "Không thể xóa ảnh",
        message: "Vui lòng thử lại sau.",
        type: "error",
      });
    } finally {
      setCoverLoading(false);
      setCoverDeleteOpen(false);
    }
  };

  const removeMember = async () => {
    if (!group || !selectedMember) return;
    try {
      await api.delete(
        `/groups/${group.id}/members/${selectedMember.user.id}`,
      );
      await fetchGroup(group.id);
    } finally {
      setMenuMode(null);
      setSelectedMember(null);
    }
  };

  const removeTrip = async () => {
    if (!group || !selectedTrip) return;
    try {
      setTripDeleting(true);
      await api.delete(`/trips/${selectedTrip.id}`);
      await fetchGroup(group.id);
      AppToast.show({
        title: "Đã xóa chuyến đi",
        message: `Chuyến đi “${selectedTrip.name}” đã được xóa khỏi nhóm.`,
      });
    } catch {
      AppToast.show({
        title: "Không thể xóa chuyến đi",
        message: "Vui lòng thử lại sau.",
        type: "error",
      });
    } finally {
      setTripDeleting(false);
      setTripDeleteOpen(false);
      setMenuMode(null);
      setSelectedTrip(null);
    }
  };

  if (loading && !group) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Không tìm thấy nhóm</Text>
      </SafeAreaView>
    );
  }

  const groupCoverUri =
    group.coverImage ||
    group.trips?.find((trip) => Boolean(trip.coverImage))?.coverImage;

  const actions =
    menuMode === "group"
      ? [
          ...(canEdit
            ? [
                {
                  label: "Chỉnh sửa nhóm",
                  icon: "create-outline",
                  onPress: () => {
                    setMenuMode(null);
                    router.push(`/groups/${group.id}/edit`);
                  },
                },
              ]
            : []),
          {
            label: "Đóng",
            icon: "close-outline",
            onPress: () => setMenuMode(null),
          },
        ]
      : menuMode === "cover"
        ? [
            {
              label: group.coverImage ? "Đổi ảnh nhóm" : "Thêm ảnh nhóm",
              icon: "image-outline",
              onPress: () => setTimeout(() => void pickGroupCover(), 300),
            },
            ...(group.coverImage
              ? [
                  {
                    label: "Xóa ảnh nhóm",
                    icon: "trash-outline",
                    color: COLORS.error,
                    onPress: () =>
                      setTimeout(() => setCoverDeleteOpen(true), 300),
                  },
                ]
              : []),
          ]
        : menuMode === "member"
        ? [
            {
              label: "Xóa khỏi nhóm",
              icon: "person-remove-outline",
              color: COLORS.error,
              onPress: removeMember,
            },
          ]
        : selectedTrip?.isCloseTrip
          ? [
              {
                label: "Xóa chuyến đi",
                icon: "trash-outline",
                color: COLORS.error,
                onPress: () =>
                  setTimeout(() => setTripDeleteOpen(true), 300),
              },
            ]
          : [
              {
                label: "Chỉnh sửa chuyến đi",
                icon: "create-outline",
                onPress: () => {
                  if (!selectedTrip) return;
                  setMenuMode(null);
                  router.push(
                    `/groups/${group.id}/trip-form?tripId=${selectedTrip.id}`,
                  );
                },
              },
            ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={[styles.header, headerScrolled && styles.headerScrolled]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.headerHit,
            !headerScrolled && styles.headerHitOnBanner,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={headerScrolled ? COLORS.textPrimary : "#FFFFFF"}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            headerScrolled && styles.headerTitleScrolled,
          ]}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <TouchableOpacity
          onPress={() => setMenuMode("group")}
          style={[
            styles.headerHit,
            !headerScrolled && styles.headerHitOnBanner,
          ]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color={headerScrolled ? COLORS.textPrimary : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const nextScrolled = event.nativeEvent.contentOffset.y > 140;
          setHeaderScrolled((current) =>
            current === nextScrolled ? current : nextScrolled,
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchGroup(group.id)}
            tintColor={COLORS.primary}
          />
        }
      >
        <ImageBackground
          source={
            groupCoverUri
              ? { uri: groupCoverUri }
              : require("@/assets/images/trip-hero-cao-bang.png")
          }
          style={styles.hero}
        >
          <View style={styles.heroOverlay}>
            {canManageCover ? (
              <TouchableOpacity
                style={styles.coverButton}
                onPress={() => setMenuMode("cover")}
                disabled={coverLoading}
              >
                {coverLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera-outline" size={21} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.heroBottom}>
              <View style={styles.heroAvatars}>
                {group.members.slice(0, 5).map((member, index) =>
                  member.user.avatar ? (
                    <Image
                      key={member.id}
                      source={{ uri: member.user.avatar }}
                      style={[
                        styles.heroAvatar,
                        index > 0 && styles.avatarOverlap,
                      ]}
                    />
                  ) : (
                    <View
                      key={member.id}
                      style={[
                        styles.heroAvatar,
                        styles.avatarFallback,
                        index > 0 && styles.avatarOverlap,
                      ]}
                    >
                      <Text style={styles.avatarLetter}>
                        {getNameFirstLetterUpper(member.user.name)}
                      </Text>
                    </View>
                  ),
                )}
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {group.members.length} thành viên
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.leaderSection}>
          <Text style={styles.sectionTitle}>Trưởng nhóm</Text>
          <View style={styles.leaderCard}>
            {leader?.user.avatar ? (
              <Image
                source={{ uri: leader.user.avatar }}
                style={styles.leaderAvatar}
              />
            ) : (
              <View style={[styles.leaderAvatar, styles.avatarFallback]}>
                <Text style={styles.leaderLetter}>
                  {getNameFirstLetterUpper(leader?.user.name)}
                </Text>
              </View>
            )}
            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName} numberOfLines={1}>
                {leader?.user.name || "Chưa có thông tin"}
              </Text>
              {leader?.user.email ? (
                <View style={styles.contactRow}>
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {leader.user.email}
                  </Text>
                </View>
              ) : null}
              {leader?.user.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.contactText}>{leader.user.phone}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.leaderPill}>
              <Text style={styles.leaderPillText}>Leader</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thành viên</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={() => router.push(`/groups/${group.id}/add-member`)}
            >
              <Text style={styles.actionText}>Thêm</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.members}
        >
          {group.members.map((member) => {
            const isLeader =
              member.role === GROUP_ROLE.LEADER ||
              member.role === GROUP_ROLE.OWNER;
            return (
              <TouchableOpacity
                key={member.id}
                style={styles.member}
                onLongPress={() => {
                  if (!canEdit || isLeader) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMember(member);
                  setMenuMode("member");
                }}
              >
                {member.user.avatar ? (
                  <Image
                    source={{ uri: member.user.avatar }}
                    style={styles.memberAvatar}
                  />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarFallback]}>
                    <Text style={styles.memberLetter}>
                      {getNameFirstLetterUpper(member.user.name)}
                    </Text>
                  </View>
                )}
                {isLeader ? (
                  <View style={styles.leaderBadge}>
                    <Text style={styles.leaderText}>Trưởng nhóm</Text>
                  </View>
                ) : null}
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chuyến đi</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={() => router.push(`/groups/${group.id}/trip-form`)}
            >
              <Text style={styles.actionText}>Tạo mới</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {group.trips.length ? (
          group.trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripRow}
              onPress={() => router.push(`/trips/${trip.id}`)}
              onLongPress={() => {
                if (!canEdit) return;
                setSelectedTrip(trip);
                setMenuMode("trip");
              }}
            >
              <Image
                source={
                  trip.coverImage
                    ? { uri: trip.coverImage }
                    : require("@/assets/images/trip-hero-cao-bang.png")
                }
                style={styles.tripCover}
              />
              <View style={styles.tripBody}>
                <Text style={styles.tripName}>{trip.name}</Text>
                <View
                  style={[
                    styles.tripStatus,
                    trip.isCloseTrip && styles.tripStatusClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.tripStatusText,
                      trip.isCloseTrip && styles.tripStatusClosedText,
                    ]}
                  >
                    {trip.isCloseTrip ? "Đã kết thúc" : "Đang diễn ra"}
                  </Text>
                </View>
                <Text style={styles.tripDate}>
                  {dayjs(trip.startDate).format("DD/MM")} –{" "}
                  {dayjs(trip.endDate).format("DD/MM/YYYY")}
                </Text>
              </View>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.tripAction}
                  accessibilityRole="button"
                  accessibilityLabel={
                    trip.isCloseTrip
                      ? `Xóa chuyến đi ${trip.name}`
                      : `Chỉnh sửa chuyến đi ${trip.name}`
                  }
                  onPress={(event) => {
                    event.stopPropagation();
                    setSelectedTrip(trip);
                    if (trip.isCloseTrip) {
                      setTripDeleteOpen(true);
                    } else {
                      router.push(
                        `/groups/${group.id}/trip-form?tripId=${trip.id}`,
                      );
                    }
                  }}
                >
                  <Ionicons
                    name={trip.isCloseTrip ? "trash-outline" : "create-outline"}
                    size={20}
                    color={trip.isCloseTrip ? COLORS.error : COLORS.textSecondary}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.textLight}
                />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="airplane-outline"
              size={34}
              color={COLORS.textLight}
            />
            <Text style={styles.emptyText}>Chưa có chuyến đi</Text>
          </View>
        )}
      </ScrollView>

      <GroupChatFab groupId={group.id} />
      <ActionSheet
        open={menuMode !== null}
        onClose={() => setMenuMode(null)}
        actions={actions}
      />
      <ConfirmDialog
        visible={coverDeleteOpen}
        title="Xóa ảnh nhóm"
        message="Sau khi xóa, banner sẽ dùng ảnh của một chuyến đi hoặc ảnh mặc định."
        confirmText="Xóa ảnh"
        loading={coverLoading}
        onConfirm={deleteGroupCover}
        onCancel={() => setCoverDeleteOpen(false)}
      />
      <ConfirmDialog
        visible={tripDeleteOpen}
        title="Xóa chuyến đi"
        message={`Bạn có chắc chắn muốn xóa chuyến đi “${selectedTrip?.name || ""}” không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={tripDeleting}
        onConfirm={removeTrip}
        onCancel={() => {
          setTripDeleteOpen(false);
          setSelectedTrip(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 56,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  headerScrolled: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerHitOnBanner: {
    width: 40,
    height: 40,
    marginHorizontal: 2,
    borderRadius: 20,
    backgroundColor: "rgba(3,22,38,.28)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  headerTitleScrolled: {
    color: COLORS.textPrimary,
    textShadowColor: "transparent",
  },
  hero: { height: 242 },
  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(3,22,38,.18)",
  },
  coverButton: {
    position: "absolute",
    top: 64,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,22,38,.48)",
  },
  heroBottom: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "rgba(3,22,38,.22)",
  },
  heroAvatars: { flexDirection: "row", paddingLeft: 4 },
  heroAvatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarOverlap: { marginLeft: -8 },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  avatarLetter: { color: COLORS.primary, fontWeight: "800", fontSize: 11 },
  countBadge: {
    backgroundColor: "rgba(3,22,38,.58)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,.34)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  leaderSection: { paddingHorizontal: 16, paddingTop: 18 },
  leaderCard: {
    marginTop: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  leaderAvatar: { width: 54, height: 54, borderRadius: 27 },
  leaderLetter: { color: COLORS.primary, fontWeight: "800", fontSize: 18 },
  leaderInfo: { flex: 1, minWidth: 0, marginLeft: 12 },
  leaderName: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  contactText: { flexShrink: 1, fontSize: 11, color: COLORS.textSecondary },
  leaderPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.successLight,
  },
  leaderPillText: { color: COLORS.success, fontSize: 10, fontWeight: "700" },
  sectionHeader: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  actionText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  members: { paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
  member: { width: 66, alignItems: "center" },
  memberAvatar: { width: 52, height: 52, borderRadius: 26 },
  memberLetter: { color: COLORS.primary, fontWeight: "800" },
  memberName: {
    marginTop: 5,
    width: 66,
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 10,
  },
  leaderBadge: {
    marginTop: -5,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  leaderText: { color: "#FFFFFF", fontSize: 7, fontWeight: "700" },
  divider: { height: 8, backgroundColor: COLORS.background },
  tripRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 114,
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tripCover: { width: 94, height: 94, borderRadius: 9 },
  tripBody: { flex: 1, alignSelf: "stretch", paddingHorizontal: 11, paddingTop: 5 },
  tripName: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  tripStatus: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tripStatusText: { fontSize: 10, color: COLORS.success, fontWeight: "700" },
  tripStatusClosed: { backgroundColor: COLORS.surfaceMuted },
  tripStatusClosedText: { color: COLORS.textSecondary },
  tripDate: { marginTop: 8, color: COLORS.textSecondary, fontSize: 11 },
  tripAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 34 },
  emptyText: { marginTop: 7, color: COLORS.textSecondary },
});
