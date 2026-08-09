import type { ExpenseItem, Trip } from "@/src/type/trip";
import type { UserGroup } from "@/src/type/user";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { EXPENSE_STATUS } from "@/src/utils/constants";
import {
  formatMoney,
  formatTime,
  getNameFirstLetterUpper,
} from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Surface, Text, useTheme } from "react-native-paper";
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
  const palette = useAppPalette();
  const theme = useTheme();
  const [actionOpen, setActionOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const successColor = palette.isDark ? "#6EE7B7" : "#159A6F";
  const errorColor = palette.isDark ? "#FDA4AF" : theme.colors.error;
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
    "Ăn uống": {
      background: palette.orangeLight,
      color: palette.isDark ? "#FDBA74" : "#ED7A35",
    },
    "Di chuyển": {
      background: palette.successLight,
      color: palette.isDark ? "#6EE7B7" : "#1A9A68",
    },
    "Mua sắm": {
      background: palette.purpleLight,
      color: palette.isDark ? "#C4B5FD" : "#7465D7",
    },
    Khác: { background: palette.surfaceMuted, color: palette.textSecondary },
  };
  const categoryTone = categoryColors[item.category] || categoryColors.Khác;
  const secondaryText = item.note || category?.label || item.category;

  const isMePaid = item.paidBy?.id === currentUserId;
  const isMeInvolved = item.participants?.find((p) => p.id === currentUserId);

  const getAmountColor = () => {
    if (isMePaid) return successColor;
    if (isMeInvolved) return errorColor;
    return palette.textPrimary;
  };

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      elevation={0}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryTone.background },
          ]}
        >
          <Text style={[styles.categoryIcon, { color: categoryTone.color }]}>
            {category?.icon || "💸"}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleWithAttachment}>
            <Text
              style={[styles.title, { color: palette.textPrimary }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.attachmentImage ? (
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={() => setAttachmentOpen(true)}
                accessibilityLabel={`Xem ảnh đính kèm của ${item.title}`}
              >
                <Ionicons
                  name="attach-outline"
                  size={18}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {secondaryText ? (
            <Text
              style={[styles.subtitle, { color: palette.textSecondary }]}
              numberOfLines={1}
            >
              {secondaryText}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.amount, { color: getAmountColor() }]} numberOfLines={1}>
          {formatMoney(item.amount)}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text
          style={[styles.meta, { color: palette.textSecondary }]}
          numberOfLines={1}
        >
          {formatTime(item.time)} • {isMePaid ? "Bạn trả" : item.paidBy?.name}
        </Text>

        <View style={styles.footerActions}>
          <View style={styles.participants}>
            {participants.slice(0, 5).map((u) => (
              <View
                key={u.id}
                style={[
                  styles.participantAvatar,
                  { borderColor: palette.surface },
                ]}
              >
                {u.avatar ? (
                  <Avatar.Image source={{ uri: u.avatar }} size={22} />
                ) : (
                  <Avatar.Text
                    size={22}
                    label={getNameFirstLetterUpper(u.name)}
                    color={theme.colors.onPrimary}
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                )}
              </View>
            ))}
            {participants.length > 5 && (
              <View
                style={[
                  styles.moreAvatar,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.surface,
                  },
                ]}
              >
                <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                  +{participants.length - 5}
                </Text>
              </View>
            )}
          </View>

          {(canEdit || (isApproval && !trip.isCloseTrip)) ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: palette.surfaceMuted },
              ]}
              accessibilityLabel="Mở thao tác chi phí"
              onPress={() => setActionOpen(true)}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={17}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* REJECTION REASON */}
      {item.rejectionReason && (
        <View
          style={[
            styles.rejectionContainer,
            { backgroundColor: palette.errorLight },
          ]}
        >
          <Text
            style={[
              styles.rejectionText,
              { color: theme.colors.onErrorContainer },
            ]}
          >
            {item.rejectionReason}
          </Text>
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
                  color: errorColor,
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
                  color: errorColor,
                  onPress: () => onDelete(item.id),
                },
              ]
            : []),
        ]}
      />
      <Modal
        visible={attachmentOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAttachmentOpen(false)}
      >
        <View style={styles.attachmentModal}>
          <TouchableOpacity
            style={styles.attachmentClose}
            onPress={() => setAttachmentOpen(false)}
            accessibilityLabel="Đóng ảnh đính kèm"
          >
            <Ionicons name="close" size={25} color="#fff" />
          </TouchableOpacity>
          {item.attachmentImage ? (
            <Image
              source={{ uri: item.attachmentImage }}
              style={styles.attachmentImage}
              resizeMode="contain"
              accessibilityLabel={`Ảnh đính kèm của ${item.title}`}
            />
          ) : null}
        </View>
      </Modal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 17,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  titleWithAttachment: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  attachmentButton: {
    width: 24,
    height: 20,
    marginLeft: 3,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    marginRight: 10,
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
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginLeft: -6,
  },
  moreAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -6,
  },
  moreText: {
    fontSize: 9,
    fontWeight: "600",
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  rejectionContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  rejectionText: {
    fontSize: 12,
  },
  attachmentModal: {
    flex: 1,
    backgroundColor: "rgba(4, 8, 14, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  attachmentClose: {
    position: "absolute",
    top: 48,
    right: 18,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentImage: {
    width: "100%",
    height: "88%",
  },
});
