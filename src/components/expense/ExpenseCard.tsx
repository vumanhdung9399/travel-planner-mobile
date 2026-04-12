import type { ExpenseItem, Trip } from "@/src/type/trip";
import type { UserGroup } from "@/src/type/user";
import { COLORS, EXPENSE_STATUS } from "@/src/utils/constants";
import {
    formatMoney,
    formatTime,
    getNameFirstLetterUpper,
} from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, IconButton, Surface, Text } from "react-native-paper";

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
        <View style={styles.iconContainer}>
          <Text style={styles.categoryIcon}>{category?.icon || "💸"}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
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

        {/* ACTIONS */}
        <View style={styles.actions}>
          {isApproval && !trip.isCloseTrip && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => onApproval(item.id)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.success}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => onReject(item.id)}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}

          {canEdit && (
            <>
              <IconButton
                icon="pencil"
                size={18}
                iconColor={COLORS.textSecondary}
                onPress={() => onEdit(item)}
                style={styles.editButton}
              />
              <IconButton
                icon="delete"
                size={18}
                iconColor={COLORS.error}
                onPress={() => onDelete(item.id)}
                style={styles.editButton}
              />
            </>
          )}
        </View>
      </View>

      {/* REJECTION REASON */}
      {item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  note: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
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
    backgroundColor: "#ecfdf5",
  },
  rejectButton: {
    backgroundColor: "#fef2f2",
  },
  editButton: {
    margin: 0,
  },
  rejectionContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  rejectionText: {
    fontSize: 12,
    color: COLORS.error,
  },
});
