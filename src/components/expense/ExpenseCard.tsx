import type { ExpenseItem, Trip } from "@/src/type/trip";
import type { UserGroup } from "@/src/type/user";
import { COLORS, EXPENSE_STATUS } from "@/src/utils/constants";
import {
  formatMoney,
  formatTime,
  getNameFirstLetterUpper,
} from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Surface, Text } from "react-native-paper";
import ActionSheet from "../ActionSheet";

interface Category {
  value: string;
  label: string;
  icon: string;
}

interface ExpenseCardProps {
  trip: Trip;
  item: ExpenseItem;
  currentUserId: string;
  users: UserGroup[];
  categories?: Category[];
  isApproval?: boolean;
  isPendingView?: boolean;
  onEdit: (item: ExpenseItem) => void;
  onDelete: (id: string) => void;
  onApproval: (id: string) => void;
  onReject: (id: string) => void;
}

export const ExpenseCard = ({
  trip,
  item,
  currentUserId,
  users,
  categories = [],
  isApproval = false,
  onEdit,
  onDelete,
  onApproval,
  onReject,
}: ExpenseCardProps) => {
  const [actionOpen, setActionOpen] = useState(false);
  const canEdit =
    !isApproval &&
    item.status !== EXPENSE_STATUS.REJECTED &&
    (item.createdBy?.id === currentUserId ||
      item.paidBy?.id === currentUserId) &&
    !trip.isCloseTrip;

  const participants = users.filter((u: UserGroup) =>
    item.participants?.find((p) => p.id === u.id),
  );

  const category = categories.find((c) => c.value === item.category);
  const categoryColors: Record<string, { background: string; color: string }> = {
    "Ăn uống": { background: COLORS.orangeLight, color: "#ED7A35" },
    "Di chuyển": { background: COLORS.successLight, color: "#1A9A68" },
    "Mua sắm": { background: COLORS.purpleLight, color: "#7465D7" },
    Khác: { background: COLORS.surfaceMuted, color: COLORS.textSecondary },
  };
  const categoryTone = categoryColors[item.category] || categoryColors.Khác;

  const isMePaid = item.paidBy?.id === currentUserId;
  const isMeInvolved = item.participants?.find((p) => p.id === currentUserId);

  const getAmountColor = () => {
    if (isMePaid) return COLORS.success;
    if (isMeInvolved) return COLORS.error;
    return COLORS.textPrimary;
  };

  return (
    <Surface style={styles.container} elevation={0}>
      {/* TOP */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryTone.background },
          ]}
        >
          <Text
            style={[styles.categoryIcon, { color: categoryTone.color }]}
          >
            {category?.icon || "💸"}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.categoryLabel}>
                {category?.label || item.category}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.amount, { color: getAmountColor() }]}>
              {formatMoney(item.amount)}
            </Text>
          </View>

          <Text style={styles.meta}>
            {formatTime(item.time)} • {isMePaid ? "Bạn trả" : item.paidBy?.name}
          </Text>
        </View>
      </View>

      {/* NOTE */}
      {item.note && (
        <Text style={styles.note} numberOfLines={2}>
          {item.note}
        </Text>
      )}

      {/* BOTTOM */}
      <View style={styles.bottomRow}>
        {/* PARTICIPANTS */}
        <View style={styles.participants}>
          {participants.slice(0, 5).map((u) => (
            <View key={u.id} style={styles.participantAvatar}>
              {u.avatar ? (
                <Avatar.Image source={{ uri: u.avatar }} size={24} />
              ) : (
                <Avatar.Text
                  size={24}
                  label={getNameFirstLetterUpper(u.name)}
                />
              )}
            </View>
          ))}
          {participants.length > 5 && (
            <View style={styles.moreAvatar}>
              <Text style={styles.moreText}>+{participants.length - 5}</Text>
            </View>
          )}
        </View>

        {(canEdit || (isApproval && !trip.isCloseTrip)) && (
          <TouchableOpacity
            style={styles.actionButton}
            accessibilityLabel="Mở thao tác chi phí"
            onPress={() => setActionOpen(true)}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* REJECTION REASON */}
      {item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}
      <ActionSheet
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        actions={[
          ...(isApproval && !trip.isCloseTrip
            ? [
                {
                  label: "Duyệt chi phí",
                  icon: "checkmark-circle-outline",
                  onPress: () => onApproval(item.id),
                },
                {
                  label: "Từ chối chi phí",
                  icon: "close-circle-outline",
                  color: COLORS.error,
                  onPress: () => onReject(item.id),
                },
              ]
            : []),
          ...(canEdit
            ? [
                {
                  label: "Sửa chi phí",
                  icon: "pencil-outline",
                  onPress: () => onEdit(item),
                },
                {
                  label: "Xóa chi phí",
                  icon: "trash-outline",
                  color: COLORS.error,
                  onPress: () => onDelete(item.id),
                },
              ]
            : []),
        ]}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 1,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 7,
  },
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participants: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantAvatar: {
    marginRight: -8,
  },
  moreAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  moreText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  approveButton: {
    backgroundColor: COLORS.successLight,
  },
  rejectButton: {
    backgroundColor: COLORS.errorLight,
  },
  editButton: {
    margin: 0,
  },
  rejectionContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.errorLight,
  },
  rejectionText: {
    fontSize: 12,
    color: COLORS.error,
  },
});
