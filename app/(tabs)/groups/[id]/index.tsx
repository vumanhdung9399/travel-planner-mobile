import ActionSheet from "@/src/components/ActionSheet";
import { AppToast } from "@/src/components/AppToast";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import GroupChatFab from "@/src/components/group/GroupChatFab";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useGroupStore } from "@/src/store/group.store";
import type { Member } from "@/src/type/group";
import type { Trip } from "@/src/type/trip";
import { COLORS, GROUP_ROLE } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type MenuMode = "group" | "cover" | "member" | "trip" | null;

const TRIP_CARD_WIDTH = 230;
const TRIP_CARD_GAP = 12;

const withImageRevision = (uri: string, revision?: string | number | null) => {
  if (!revision) return uri;
  return `${uri}${uri.includes("?") ? "&" : "?"}tpv=${encodeURIComponent(String(revision))}`;
};

const getTripStatus = (trip: Trip, darkMode: boolean) => {
  const today = dayjs().startOf("day");
  const startDate = dayjs(trip.startDate).startOf("day");

  if (trip.isCloseTrip) {
    return {
      label: "ĐÃ KẾT THÚC",
      background: darkMode ? "#3C1D22" : "#FDEAEA",
      color: darkMode ? "#FF9B9F" : "#D64D55",
    };
  }
  if (today.isBefore(startDate)) {
    return {
      label: "SẮP DIỄN RA",
      background: darkMode ? "#3B2C11" : "#FFF3C9",
      color: darkMode ? "#FFD36A" : "#C89113",
    };
  }
  return {
    label: "ĐANG DIỄN RA",
    background: darkMode ? "#123429" : "#DFF7E9",
    color: darkMode ? "#63D7A8" : "#159A6F",
  };
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { id, tripReturnToken } = useLocalSearchParams<{
    id: string;
    tripReturnToken?: string;
  }>();
  const currentUser = useAuthStore((state) => state.user);
  const { loading, group, fetchGroup } = useGroupStore();
  const [menuMode, setMenuMode] = useState<MenuMode>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverDeleteOpen, setCoverDeleteOpen] = useState(false);
  const [tripDeleteOpen, setTripDeleteOpen] = useState(false);
  const [tripDeleting, setTripDeleting] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [memberPreviewOpen, setMemberPreviewOpen] = useState(false);
  const [memberDeleteOpen, setMemberDeleteOpen] = useState(false);
  const [memberDeleting, setMemberDeleting] = useState(false);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [coverRevision, setCoverRevision] = useState<number | null>(null);
  const tripListRef = useRef<FlatList<Trip>>(null);
  const isHandlingBackRef = useRef(false);
  const handledTripReturnRef = useRef<string | null>(null);

  useEffect(() => {
    setHeaderScrolled(false);
    setActiveTripIndex(0);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const currentGroup = useGroupStore.getState().group;
      if (
        tripReturnToken &&
        handledTripReturnRef.current !== tripReturnToken &&
        currentGroup?.id === id
      ) {
        handledTripReturnRef.current = tripReturnToken;
        return;
      }

      void fetchGroup(id);
    }, [fetchGroup, id, tripReturnToken]),
  );

  const tripCount = group?.trips?.length ?? 0;

  const handleBack = useCallback(() => {
    if (isHandlingBackRef.current) return;
    isHandlingBackRef.current = true;

    const tabsNavigation = navigation.getParent();

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "index" }],
      }),
    );
    tabsNavigation?.navigate("index");
  }, [navigation]);

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

  useEffect(() => {
    setActiveTripIndex((current) =>
      tripCount > 0 ? Math.min(current, tripCount - 1) : 0,
    );
  }, [tripCount]);

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

  const callLeader = useCallback(async () => {
    const phone = leader?.user.phone?.trim();
    if (!phone) return;

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      AppToast.show({
        title: "Không thể thực hiện cuộc gọi",
        message: "Thiết bị không hỗ trợ gọi điện hoặc số điện thoại không hợp lệ.",
        type: "error",
      });
    }
  }, [leader?.user.phone]);

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

    const extension =
      asset.fileName?.split(".").pop()?.toLowerCase() ||
      asset.uri.split(".").pop()?.toLowerCase() ||
      "jpg";
    const mimeType =
      asset.mimeType ||
      (extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : "");
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      AppToast.show({
        title: "Ảnh không hợp lệ",
        message: "Vui lòng chọn ảnh JPG, PNG hoặc WEBP.",
        type: "error",
      });
      return;
    }

    try {
      setCoverLoading(true);
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: `group-cover.${extension}`,
        type: mimeType,
      } as any);
      await api.patch(`/groups/${group.id}/cover`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCoverRevision(Date.now());
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
      setCoverRevision(Date.now());
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
    if (!group || !selectedMember || memberDeleting) return;
    try {
      setMemberDeleting(true);
      await api.delete(
        `/groups/${group.id}/members/${selectedMember.user.id}`,
      );
      await fetchGroup(group.id);
      AppToast.show({
        title: "Đã xóa thành viên",
        message: `${selectedMember.user.name} đã được xóa khỏi nhóm.`,
      });
    } catch {
      AppToast.show({
        title: "Không thể xóa thành viên",
        message: "Vui lòng thử lại sau.",
        type: "error",
      });
    } finally {
      setMemberDeleting(false);
      setMemberDeleteOpen(false);
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
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.surface }]}
      >
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.surface }]}
      >
        <Text style={{ color: palette.textPrimary }}>
          Không tìm thấy nhóm
        </Text>
      </SafeAreaView>
    );
  }

  const rawGroupCoverUri =
    group.coverImage ||
    group.trips?.find((trip) => Boolean(trip.coverImage))?.coverImage;
  const groupCoverUri = rawGroupCoverUri
    ? withImageRevision(rawGroupCoverUri, coverRevision || group.updatedAt)
    : undefined;

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
              onPress: () => void pickGroupCover(),
            },
            ...(group.coverImage
              ? [
                  {
                    label: "Xóa ảnh nhóm",
                    icon: "trash-outline",
                    color: COLORS.error,
                    onPress: () => setCoverDeleteOpen(true),
                  },
                ]
              : []),
          ]
        : menuMode === "member"
        ? [
            {
              label: "Xem thông tin",
              icon: "information-circle-outline",
              onPress: () => setMemberPreviewOpen(true),
            },
            ...(!selectedMember ||
            selectedMember.role === GROUP_ROLE.LEADER ||
            selectedMember.role === GROUP_ROLE.OWNER ||
            !canEdit
              ? []
              : [
                  {
                    label: "Xóa khỏi nhóm",
                    icon: "person-remove-outline",
                    color: COLORS.error,
                    onPress: () => setMemberDeleteOpen(true),
                  },
                ]),
          ]
        : selectedTrip?.isCloseTrip
          ? [
              {
                label: "Xóa chuyến đi",
                icon: "trash-outline",
                color: COLORS.error,
                onPress: () => setTripDeleteOpen(true),
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={["bottom"]}
    >
      <StatusBar
        style={
          memberPreviewOpen
            ? "light"
            : headerScrolled && !palette.isDark
              ? "dark"
              : "light"
        }
        backgroundColor="transparent"
        translucent
      />
      <View
        style={[
          styles.header,
          { height: insets.top + 56, paddingTop: insets.top },
          headerScrolled && styles.headerScrolled,
          headerScrolled && {
            backgroundColor: palette.surface,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.headerHit,
            !headerScrolled && styles.headerHitOnBanner,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={headerScrolled ? palette.textPrimary : "#FFFFFF"}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            headerScrolled && styles.headerTitleScrolled,
            headerScrolled && { color: palette.textPrimary },
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
            color={headerScrolled ? palette.textPrimary : "#FFFFFF"}
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
          key={groupCoverUri || "group-cover-fallback"}
          source={
            groupCoverUri
              ? { uri: groupCoverUri }
              : require("@/assets/images/trip-hero-cao-bang.png")
          }
          style={[styles.hero, { height: 190 + insets.top }]}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={[
              "rgba(3,22,38,.42)",
              "rgba(3,22,38,.06)",
              "rgba(3,22,38,.58)",
            ]}
            locations={[0, 0.48, 1]}
            style={styles.heroOverlay}
          >
            {canManageCover ? (
              <TouchableOpacity
                style={[styles.coverButton, { top: insets.top + 64 }]}
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
                {group.members.slice(0, 4).map((member, index) =>
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
                        { backgroundColor: palette.primaryLight },
                        index > 0 && styles.avatarOverlap,
                      ]}
                    >
                      <Text style={styles.avatarLetter}>
                        {getNameFirstLetterUpper(member.user.name)}
                      </Text>
                    </View>
                  ),
                )}
                {group.members.length > 4 ? (
                  <View
                    style={[
                      styles.heroAvatar,
                      styles.heroOverflowAvatar,
                      styles.avatarOverlap,
                    ]}
                  >
                    <Text style={styles.heroOverflowText}>
                      +{group.members.length - 4}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {group.members.length} thành viên
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.leaderSection}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Trưởng nhóm</Text>
          <View
            style={[
              styles.leaderCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {leader?.user.avatar ? (
              <Image
                source={{ uri: leader.user.avatar }}
                style={styles.leaderAvatar}
              />
            ) : (
              <View
                style={[
                  styles.leaderAvatar,
                  styles.avatarFallback,
                  { backgroundColor: palette.primaryLight },
                ]}
              >
                <Text style={styles.leaderLetter}>
                  {getNameFirstLetterUpper(leader?.user.name)}
                </Text>
              </View>
            )}
            <View style={styles.leaderInfo}>
              <Text
                style={[styles.leaderName, { color: palette.textPrimary }]}
                numberOfLines={1}
              >
                {leader?.user.name || "Chưa có thông tin"}
              </Text>
              {leader?.user.email ? (
                <View style={styles.contactRow}>
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color={palette.textSecondary}
                  />
                  <Text
                    style={[styles.contactText, { color: palette.textSecondary }]}
                    numberOfLines={1}
                  >
                    {leader.user.email}
                  </Text>
                </View>
              ) : null}
              {leader?.user.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={palette.textSecondary}
                  />
                  <Text
                    style={[styles.contactText, { color: palette.textSecondary }]}
                  >
                    {leader.user.phone}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                leader?.user.phone
                  ? `Gọi cho ${leader.user.name}`
                  : "Trưởng nhóm chưa có số điện thoại"
              }
              disabled={!leader?.user.phone}
              onPress={() => void callLeader()}
              style={[
                styles.leaderCall,
                {
                  backgroundColor: leader?.user.phone
                    ? palette.primaryLight
                    : palette.surfaceMuted,
                },
              ]}
            >
              <Ionicons
                name="call"
                size={16}
                color={leader?.user.phone ? COLORS.primary : palette.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/groups/${group.id}/polls`)}
          style={[styles.decisionCard, { backgroundColor: palette.primaryLight, borderColor: palette.border }]}
        >
          <View style={styles.decisionIcon}><Ionicons name="stats-chart" size={22} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.decisionTitle, { color: palette.textPrimary }]}>Biểu quyết nhóm</Text>
            <Text style={[styles.decisionText, { color: palette.textSecondary }]}>Cùng chọn ngày đi, địa điểm và phương án tốt nhất</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Thành viên nhóm</Text>
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
                onPress={() => {
                  setSelectedMember(member);
                  setMemberPreviewOpen(true);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMember(member);
                  setMenuMode("member");
                }}
              >
                <View style={styles.memberAvatarWrap}>
                  {member.user.avatar ? (
                    <Image
                      source={{ uri: member.user.avatar }}
                      style={styles.memberAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.memberAvatar,
                        styles.avatarFallback,
                        { backgroundColor: palette.primaryLight },
                      ]}
                    >
                      <Text style={styles.memberLetter}>
                        {getNameFirstLetterUpper(member.user.name)}
                      </Text>
                    </View>
                  )}
                  {isLeader ? (
                    <View style={styles.leaderCrown}>
                      <Ionicons name="ribbon-outline" size={14} color="#24476D" />
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.memberName, { color: palette.textPrimary }]}
                  numberOfLines={1}
                >
                  {member.user.name}
                </Text>
                {isLeader ? (
                  <View style={styles.leaderBadge}>
                    <Text style={styles.leaderText}>Trưởng nhóm</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Chuyến đi sắp tới và đã qua</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={() => router.push(`/groups/${group.id}/trip-form`)}
            >
              <Text style={styles.actionText}>Tạo mới</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {group.trips.length ? (
          <FlatList
            ref={tripListRef}
            horizontal
            data={group.trips}
            keyExtractor={(trip) => trip.id}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={TRIP_CARD_WIDTH + TRIP_CARD_GAP}
            snapToAlignment="start"
            contentContainerStyle={[
              styles.tripCarouselContent,
              {
                paddingLeft: 16,
                paddingRight: Math.max(
                  16,
                  viewportWidth - TRIP_CARD_WIDTH - 16,
                ),
              },
            ]}
            getItemLayout={(_, index) => ({
              length: TRIP_CARD_WIDTH + TRIP_CARD_GAP,
              offset: (TRIP_CARD_WIDTH + TRIP_CARD_GAP) * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.max(
                0,
                Math.min(
                  group.trips.length - 1,
                  Math.round(
                    event.nativeEvent.contentOffset.x /
                      (TRIP_CARD_WIDTH + TRIP_CARD_GAP),
                  ),
                ),
              );
              setActiveTripIndex(nextIndex);
            }}
            renderItem={({ item: trip, index }) => {
              const featured = index === activeTripIndex;
              const status = getTripStatus(trip, palette.isDark);
              return (
                <TouchableOpacity
                  activeOpacity={0.86}
                  style={[
                    styles.tripCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      opacity: featured ? 1 : 0.62,
                      transform: [
                        { translateY: featured ? 0 : 18 },
                        { scale: featured ? 1 : 0.82 },
                      ],
                    },
                  ]}
                  onPress={() => {
                    if (!featured) {
                      setActiveTripIndex(index);
                      tripListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0,
                      });
                      return;
                    }
                    router.push({
                      pathname: "/trips/[id]",
                      params: { id: trip.id, originGroupId: group.id },
                    } as any);
                  }}
                  onLongPress={() => {
                    if (!canEdit) return;
                    setSelectedTrip(trip);
                    setMenuMode("trip");
                  }}
                >
                  <ImageBackground
                    source={
                      trip.coverImage
                        ? { uri: trip.coverImage }
                        : require("@/assets/images/trip-hero-cao-bang.png")
                    }
                    style={styles.tripCardCover}
                    imageStyle={styles.tripCardCoverImage}
                  >
                    <LinearGradient
                      colors={["transparent", "rgba(5,15,25,.75)"]}
                      locations={[0.35, 1]}
                      style={styles.tripCardCoverOverlay}
                    >
                      <Text style={styles.tripCardCoverTitle} numberOfLines={2}>
                        {trip.name}
                      </Text>
                    </LinearGradient>
                  </ImageBackground>

                  <View style={styles.tripCardBody}>
                    <Text
                      style={[styles.tripLocation, { color: palette.textPrimary }]}
                      numberOfLines={1}
                    >
                      {trip.location || trip.name}
                    </Text>
                    <Text
                      style={[styles.tripCardDate, { color: palette.textPrimary }]}
                      numberOfLines={1}
                    >
                      {dayjs(trip.startDate).format("DD/MM/YYYY")} –{" "}
                      {dayjs(trip.endDate).format("DD/MM/YYYY")}
                    </Text>
                    <View style={styles.tripCardFooter}>
                      <View
                        style={[
                          styles.tripStatus,
                          { backgroundColor: status.background },
                        ]}
                      >
                        <Text
                          style={[styles.tripStatusText, { color: status.color }]}
                        >
                          ● {status.label}
                        </Text>
                      </View>
                      {canEdit ? (
                        <TouchableOpacity
                          style={[
                            styles.tripAction,
                            {
                              backgroundColor: trip.isCloseTrip
                                ? palette.errorLight
                                : palette.primaryLight,
                            },
                          ]}
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
                            name={
                              trip.isCloseTrip
                                ? "trash-outline"
                                : "create-outline"
                            }
                            size={16}
                            color={
                              trip.isCloseTrip ? COLORS.error : COLORS.primary
                            }
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="airplane-outline"
              size={34}
              color={palette.textLight}
            />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có chuyến đi</Text>
          </View>
        )}
      </ScrollView>

      <GroupChatFab groupId={group.id} />
      <Modal
        visible={memberPreviewOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setMemberPreviewOpen(false)}
      >
        <View style={styles.memberPreview}>
          {selectedMember?.user?.avatar ? (
            <Image
              source={{ uri: selectedMember.user.avatar }}
              style={styles.memberPreviewImage}
              resizeMode="contain"
              accessibilityLabel={`Ảnh đại diện của ${selectedMember.user.name}`}
            />
          ) : (
            <View style={styles.memberPreviewFallback}>
              <Text style={styles.memberPreviewLetter}>
                {getNameFirstLetterUpper(selectedMember?.user?.name)}
              </Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,.82)"]}
            style={styles.memberPreviewInfo}
          >
            <Text style={styles.memberPreviewName}>
              {selectedMember?.user?.name}
            </Text>
            <Text style={styles.memberPreviewRole}>
              {selectedMember?.role === GROUP_ROLE.OWNER ||
              selectedMember?.role === GROUP_ROLE.LEADER
                ? "Trưởng nhóm"
                : "Thành viên"}
            </Text>
          </LinearGradient>
          <TouchableOpacity
            style={styles.memberPreviewClose}
            onPress={() => setMemberPreviewOpen(false)}
            accessibilityLabel="Đóng thông tin thành viên"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
      <ActionSheet
        open={menuMode !== null}
        onClose={() => setMenuMode(null)}
        actions={actions}
      />
      <ConfirmDialog
        visible={memberDeleteOpen}
        title="Xóa thành viên"
        message={`Bạn có chắc chắn muốn xóa thành viên “${selectedMember?.user?.name || ""}” khỏi nhóm không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        type="danger"
        loading={memberDeleting}
        onConfirm={removeMember}
        onCancel={() => {
          setMemberDeleteOpen(false);
          setSelectedMember(null);
        }}
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

const createStyles = (palette: AppPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
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
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
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
    color: palette.textPrimary,
    textShadowColor: "transparent",
  },
  hero: { height: 190, backgroundColor: COLORS.primaryDark },
  heroImage: { resizeMode: "cover" },
  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
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
  heroOverflowAvatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.86)",
  },
  heroOverflowText: { color: "#30445B", fontSize: 10, fontWeight: "800" },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primaryLight,
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
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.surface,
  },
  leaderAvatar: { width: 54, height: 54, borderRadius: 27 },
  leaderLetter: { color: COLORS.primary, fontWeight: "800", fontSize: 18 },
  leaderInfo: { flex: 1, minWidth: 0, marginLeft: 12 },
  leaderName: { fontSize: 15, fontWeight: "800", color: palette.textPrimary },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  contactText: { flexShrink: 1, fontSize: 11, color: palette.textSecondary },
  leaderCall: {
    marginLeft: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: palette.textPrimary,
  },
  actionText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  members: { paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
  member: { width: 66, alignItems: "center" },
  memberAvatarWrap: { position: "relative" },
  memberAvatar: { width: 52, height: 52, borderRadius: 26 },
  memberLetter: { color: COLORS.primary, fontWeight: "800" },
  memberName: {
    marginTop: 5,
    width: 66,
    textAlign: "center",
    color: palette.textPrimary,
    fontSize: 10,
  },
  leaderBadge: {
    marginTop: 2,
    borderRadius: 8,
    backgroundColor: "#293847",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  leaderText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  leaderCrown: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  tripCarouselContent: {
    paddingTop: 4,
    paddingBottom: 28,
    gap: TRIP_CARD_GAP,
  },
  tripCard: {
    width: TRIP_CARD_WIDTH,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  tripCardCover: { height: 170, justifyContent: "flex-end" },
  tripCardCoverImage: { resizeMode: "cover" },
  tripCardCoverOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 9,
  },
  tripCardCoverTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  tripCardBody: { padding: 10 },
  tripLocation: { fontSize: 12, fontWeight: "600" },
  tripCardDate: { marginTop: 4, fontSize: 13, fontWeight: "800" },
  tripCardFooter: {
    marginTop: 7,
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tripStatus: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: palette.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tripStatusText: { fontSize: 9, color: COLORS.success, fontWeight: "800" },
  tripAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 34 },
  emptyText: { marginTop: 7, color: palette.textSecondary },
  decisionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 20,
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  decisionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  decisionTitle: { fontSize: 14, fontWeight: "800" },
  decisionText: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  memberPreview: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  memberPreviewImage: { width: "100%", height: "100%" },
  memberPreviewFallback: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#122D49",
  },
  memberPreviewLetter: {
    color: "#FFFFFF",
    fontSize: 54,
    fontWeight: "800",
  },
  memberPreviewInfo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 36,
  },
  memberPreviewName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  memberPreviewRole: { marginTop: 4, color: "rgba(255,255,255,.74)", fontSize: 13 },
  memberPreviewClose: {
    position: "absolute",
    top: 48,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,.42)",
    alignItems: "center",
    justifyContent: "center",
  },
});
