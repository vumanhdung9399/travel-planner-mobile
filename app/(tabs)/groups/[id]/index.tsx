import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useGroupStore } from "@/src/store/group.store";
import { COLORS, GROUP_ROLE } from "@/src/utils/constants";
import { getNameFirstLetterUpper, getTextRole } from "@/src/utils/helper";
import ActionSheet from "@components/ActionSheet";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Button, IconButton, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const GroupDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { loading, group, fetchGroup } = useGroupStore();

  // ActionSheet for members
  const [memberActionOpen, setMemberActionOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Image preview modal
  const [previewVisible, setPreviewVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGroup(id);
    }, [id]),
  );

  const leaderMember = useMemo(
    () =>
      group?.members?.find(
        (m) => m.role === GROUP_ROLE.LEADER || m.role === GROUP_ROLE.OWNER,
      ) || group?.members?.[0],
    [group],
  );

  const leaderName = leaderMember?.user?.name;
  const isLeader = user?.id === leaderMember?.user?.id;
  const isCreator = group?.isCreate;
  const canEdit = isCreator || isLeader;

  const handleDeleteMember = async () => {
    if (!id || !selectedMember) return;
    try {
      await api.delete(`/groups/${id}/members/${selectedMember.user.id}`);
      await fetchGroup(id);
    } catch (err) {
    } finally {
      setSelectedMember(null);
      setMemberActionOpen(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!tripId) return;

    try {
      await api.delete(`/trips/${tripId}`);
      await fetchGroup(id);
    } catch (err) {
    } finally {
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text>Không tìm thấy nhóm</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <CommonHeader
        title={group.name}
        rightElement={
          canEdit ? (
            <TouchableOpacity
              onPress={() => router.push(`/groups/${group.id}/edit`)}
              style={styles.headerEditButton}
            >
              <IconButton icon="pencil" size={22} iconColor={COLORS.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              fetchGroup(id);
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupInfo}>
            {group.description && (
              <Text style={styles.groupDescription}>{group.description}</Text>
            )}
          </View>
        </View>

        {/* Leader Card */}
        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardTitle}>Trưởng nhóm</Text>
          <View style={styles.leaderRow}>
            {leaderMember?.user?.avatar ? (
              <Avatar.Image
                source={{ uri: leaderMember.user.avatar }}
                size={48}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={48}
                label={getNameFirstLetterUpper(leaderName || "?")}
                style={styles.avatar}
              />
            )}
            <View>
              <Text style={styles.leaderName}>{leaderName || "-"}</Text>
              <Text style={styles.leaderRole}>{leaderMember?.user.phone}</Text>
            </View>
          </View>
        </Surface>

        {/* Members Card */}
        <Surface style={styles.card} elevation={0}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Thành viên ({group.members.length})
            </Text>
            {canEdit && (
              <Button
                mode="text"
                onPress={() => router.push(`/groups/${group.id}/add-member`)}
                textColor={COLORS.primary}
                icon="plus"
                contentStyle={styles.addButtonContent}
              >
                Thêm
              </Button>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.membersScroll}
            contentContainerStyle={styles.membersScrollContent}
            indicatorStyle="black"
          >
            {group.members?.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberItem}
                onPress={() => {
                  setSelectedMember(member);
                  setPreviewVisible(true);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMember(member);
                  setMemberActionOpen(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.memberAvatarContainer}>
                  {member.user?.avatar ? (
                    <Avatar.Image
                      source={{ uri: member.user.avatar }}
                      size={56}
                      style={styles.memberAvatar}
                    />
                  ) : (
                    <Avatar.Text
                      size={56}
                      label={getNameFirstLetterUpper(member.user?.name || "?")}
                      style={styles.memberAvatar}
                    />
                  )}
                  {(member.role === GROUP_ROLE.LEADER ||
                    member.role === GROUP_ROLE.OWNER) && (
                    <View style={styles.crownBadge}>
                      <Text style={styles.crownEmoji}>👑</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user?.name || "Thành viên"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Surface>

        {/* Trips Card */}
        <Surface style={[styles.card, styles.lastCard]} elevation={0}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Chuyến đi</Text>
            {canEdit && (
              <Button
                mode="text"
                onPress={() => {
                  router.push(`groups/${group.id}/trip-form`);
                }}
                textColor={COLORS.primary}
                icon="plus"
                contentStyle={styles.addButtonContent}
              >
                Tạo
              </Button>
            )}
          </View>
          {group.trips.length === 0 ? (
            <View style={styles.emptyTripContainer}>
              <Text style={styles.emptyEmoji}>✈️</Text>
              <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
              {canEdit && (
                <Button
                  mode="contained"
                  onPress={() => {}}
                  buttonColor={COLORS.primary}
                  style={styles.createTripButton}
                >
                  Tạo chuyến đi đầu tiên
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.tripsList}>
              {group.trips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripItem}
                  onPress={() => router.push(`/trips/${trip.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tripContent}>
                    <Text style={styles.tripName}>{trip.name}</Text>
                    <Text style={styles.tripDate}>
                      {dayjs(trip.startDate).format("DD/MM/YYYY")} →{" "}
                      {dayjs(trip.endDate).format("DD/MM/YYYY")}
                    </Text>
                    {trip.location && (
                      <Text style={styles.tripLocation}>
                        📍 {trip.location}
                      </Text>
                    )}
                    {trip.infor && (
                      <Text style={styles.tripInfo} numberOfLines={2}>
                        {trip.infor}
                      </Text>
                    )}
                  </View>
                  {canEdit && (
                    <View style={styles.tripActions}>
                      <IconButton
                        icon="pencil"
                        size={18}
                        iconColor={COLORS.textSecondary}
                        onPress={() => {
                          router.push(
                            `groups/${group.id}/trip-form?tripId=${trip.id}`,
                          );
                        }}
                      />
                      <IconButton
                        icon="delete"
                        size={18}
                        iconColor={COLORS.error}
                        onPress={() => {
                          handleDeleteTrip(trip.id);
                        }}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Surface>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreviewVisible(false)}
          >
            <IconButton icon="close" iconColor="#fff" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.previewContent}
            activeOpacity={1}
            onPress={() => setPreviewVisible(false)}
          >
            {selectedMember?.user?.avatar ? (
              <Image
                source={{ uri: selectedMember.user.avatar }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.previewAvatarPlaceholder}>
                <Text style={styles.previewAvatarText}>
                  {getNameFirstLetterUpper(selectedMember?.user?.name || "?")}
                </Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                {selectedMember?.user?.name}
              </Text>
              <Text style={styles.previewRole}>
                {getTextRole(selectedMember?.role)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Member ActionSheet */}
      <ActionSheet
        open={memberActionOpen}
        onClose={() => setMemberActionOpen(false)}
        actions={[
          {
            label: "Xem thông tin",
            onPress: () => {
              setPreviewVisible(true);
              setMemberActionOpen(false);
            },
          },
          ...(canEdit &&
          selectedMember?.role !== GROUP_ROLE.LEADER &&
          selectedMember?.role !== GROUP_ROLE.OWNER
            ? [
                {
                  label: "Xóa khỏi nhóm",
                  color: COLORS.error,
                  onPress: () => {
                    handleDeleteMember();
                  },
                },
              ]
            : []),
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  headerEditButton: {
    marginRight: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  groupAvatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  groupInfo: {
    flex: 1,
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  groupMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  groupDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lastCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 15,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  addButtonContent: {
    flexDirection: "row-reverse",
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    backgroundColor: COLORS.primary,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  leaderRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  membersScroll: {
    marginTop: 0,
  },
  membersScrollContent: {
    paddingRight: 8,
  },
  memberItem: {
    alignItems: "center",
    marginRight: 20,
    width: 70,
  },
  memberAvatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  memberAvatar: {
    backgroundColor: COLORS.primary,
  },
  crownBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FBBF24",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  crownEmoji: {
    fontSize: 10,
  },
  memberName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
  },
  tripContent: {
    flex: 1,
  },
  tripName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  tripLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tripInfo: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  tripActions: {
    flexDirection: "row",
    marginLeft: 8,
  },
  emptyTripContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  createTripButton: {
    borderRadius: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 10,
  },
  previewContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewAvatarPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  previewAvatarText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#fff",
  },
  previewInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  previewName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  previewRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
});

export default GroupDetailScreen;
