import { EmptyState } from "@/src/components/group/EmptyState";
import { AppToast } from "@/src/components/AppToast";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import { type AppPalette, useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import ActionSheet from "@components/ActionSheet";
import type { Group } from "@src/type/group";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";

import {
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Surface, Text } from "react-native-paper";

const getGroupCoverUri = (group: Group) => {
  const uri =
    group.coverImage ||
    group.trips?.find((trip) => Boolean(trip.coverImage))?.coverImage;
  if (!uri) return undefined;
  return `${uri}${uri.includes("?") ? "&" : "?"}tpv=${encodeURIComponent(group.updatedAt || "cover")}`;
};

const HomeScreen = () => {
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverDeleteOpen, setCoverDeleteOpen] = useState(false);
  const [groupDeleteOpen, setGroupDeleteOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getListGroup();
    }, []),
  );

  const getListGroup = async () => {
    try {
      setLoading(true);
      const res = await api.get<Group[]>("/groups");
      setGroups(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup?.id) return;

    try {
      await api.delete(`/groups/${selectedGroup?.id}`);
      await getListGroup();
      AppToast.show({
        title: "Đã xóa nhóm",
        message: `Nhóm “${selectedGroup.name}” đã được xóa.`,
      });
    } catch {
      AppToast.show({
        title: "Không thể xóa nhóm",
        message: "Nhóm có thể vẫn còn chuyến đi chưa kết thúc.",
        type: "error",
      });
    } finally {
      setGroupDeleteOpen(false);
      setOpenSheet(false);
      setSelectedGroup(null);
    }
  };

  const pickGroupCover = async () => {
    if (!selectedGroup || coverLoading) return;
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
      await api.patch(`/groups/${selectedGroup.id}/cover`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await getListGroup();
      AppToast.show({
        title: "Đã cập nhật ảnh nhóm",
        message: "Ảnh mới đã được hiển thị trên danh sách nhóm.",
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
    if (!selectedGroup) return;
    try {
      setCoverLoading(true);
      await api.delete(`/groups/${selectedGroup.id}/cover`);
      await getListGroup();
      AppToast.show({
        title: "Đã xóa ảnh nhóm",
        message: "Danh sách đang dùng ảnh chuyến đi hoặc ảnh mặc định.",
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

  const renderItem = ({ item }: { item: Group }) => {
    const coverUri = getGroupCoverUri(item);
    return (
    <Surface
      style={[
        styles.cardWrapper,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      elevation={0}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push(`/groups/${item.id}`);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedGroup(item);
          setOpenSheet(true);
        }}
        style={styles.cardInner}
      >
        <ImageBackground
          key={coverUri || "group-cover-fallback"}
          source={
            coverUri
              ? { uri: coverUri }
              : require("@/assets/images/trip-hero-cao-bang.png")
          }
          style={styles.avatarGradient}
          imageStyle={styles.groupCoverImage}
        />

        <View style={styles.textContainer}>
          <Text
            style={[styles.groupName, { color: palette.textPrimary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.memberRow}>
            <View style={styles.memberAvatars}>
              {item.members.slice(0, 4).map((member, index) =>
                member.user?.avatar ? (
                  <Image
                    key={member.id}
                    source={{ uri: member.user.avatar }}
                    style={[
                      styles.memberAvatar,
                      { borderColor: palette.surface },
                      index > 0 && styles.memberAvatarOverlap,
                    ]}
                  />
                ) : (
                  <View
                    key={member.id}
                    style={[
                      styles.memberAvatar,
                      styles.memberAvatarFallback,
                      {
                        borderColor: palette.surface,
                        backgroundColor: palette.primaryLight,
                      },
                      index > 0 && styles.memberAvatarOverlap,
                    ]}
                  >
                    <Text style={styles.memberAvatarText}>
                      {member.user?.name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                ),
              )}
            </View>
            <Text style={[styles.memberText, { color: palette.textSecondary }]}>
              {item.members.length} thành viên
            </Text>
          </View>
        </View>

        <IconButton
          icon="dots-vertical"
          iconColor={palette.textPrimary}
          size={20}
          style={styles.moreButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            setSelectedGroup(item);
            setOpenSheet(true);
          }}
        />
      </TouchableOpacity>
    </Surface>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={[styles.userName, { color: palette.textPrimary }]}>Nhóm của tôi</Text>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => router.push("/groups/create")}
        >
          <View style={styles.plusGradient}>
            <Text style={styles.plusText}>Tạo nhóm</Text>
            <IconButton icon="plus" iconColor="#fff" size={17} />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={getListGroup}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState onCreatePress={() => router.push("/groups/create")} />
          ) : null
        }
      />

      <ActionSheet
        open={openSheet}
        onClose={() => setOpenSheet(false)}
        animated={false}
        actions={[
          ...(selectedGroup?.canManageCover
            ? [
                {
                  label: selectedGroup.coverImage
                    ? "Đổi ảnh nhóm"
                    : "Thêm ảnh nhóm",
                  icon: "image-outline",
                  onPress: () => void pickGroupCover(),
                },
                ...(selectedGroup.coverImage
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
            : []),
          ...(selectedGroup?.isCreate
            ? [
                {
                  label: "Sửa nhóm",
                  icon: "pencil-outline",
                  onPress: () => {
                    router.push(`/groups/${selectedGroup?.id}/edit`);
                    setOpenSheet(false);
                  },
                },
                {
                  label: "Xóa nhóm",
                  icon: "trash-outline",
                  color: "#FF4D4D",
                  onPress: () => setGroupDeleteOpen(true),
                },
              ]
            : []),
          {
            label: "Vào nhóm",
            icon: "log-in-outline",
            onPress: () => {
              router.push(`/groups/${selectedGroup?.id}`);
            },
          },
        ]}
      />
      <ConfirmDialog
        visible={groupDeleteOpen}
        title="Xóa nhóm"
        message={`Bạn có chắc chắn muốn xóa nhóm “${selectedGroup?.name || ""}” không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setGroupDeleteOpen(false)}
      />
      <ConfirmDialog
        visible={coverDeleteOpen}
        title="Xóa ảnh nhóm"
        message="Ảnh trên danh sách sẽ chuyển sang ảnh chuyến đi hoặc ảnh mặc định."
        confirmText="Xóa ảnh"
        loading={coverLoading}
        onConfirm={deleteGroupCover}
        onCancel={() => setCoverDeleteOpen(false)}
      />
    </SafeAreaView>
  );
};

const createStyles = (palette: AppPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerText: { flex: 1, marginRight: 12 },
  userName: { fontSize: 24, fontWeight: "800", color: palette.textPrimary },
  plusButton: { borderRadius: 14, overflow: "hidden" },
  plusGradient: {
    minHeight: 38,
    paddingLeft: 12,
    paddingRight: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  plusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 2 },

  cardWrapper: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 118,
    padding: 8,
    paddingLeft: 7,
  },
  avatarGradient: {
    width: 104,
    height: 102,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  groupCoverImage: { borderRadius: 11 },
  avatarLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  textContainer: { flex: 1, alignSelf: "stretch", justifyContent: "center", marginLeft: 12, paddingRight: 24 },
  groupName: { fontSize: 17, fontWeight: "700", color: palette.textPrimary },
  memberRow: { flexDirection: "column", alignItems: "flex-start", marginTop: 12 },
  memberAvatars: { flexDirection: "row", alignItems: "center", marginRight: 7 },
  memberAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: palette.surface,
  },
  memberAvatarOverlap: { marginLeft: -6 },
  memberAvatarFallback: {
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: { fontSize: 9, fontWeight: "800", color: COLORS.primaryDark },
  memberText: { fontSize: 11, color: palette.textSecondary, marginTop: 4 },
  moreButton: { position: "absolute", right: -4, top: -2 },
});

export default HomeScreen;
