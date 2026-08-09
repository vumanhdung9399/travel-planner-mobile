import { useAuthStore } from "@/src/store/auth.store";
import { useAppPalette } from "@/src/hook/useAppPalette";
import type { UserGroup } from "@/src/type/user";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Button, Surface, Text, useTheme } from "react-native-paper";

interface BalanceItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  payerId: string;
  payerName: string;
  type: "debt" | "paid";
  userShare?: number;
}

type Props = {
  user: UserGroup;
  leader: UserGroup;
  balanceFromExpense: number;
  fundAmount: number;
  finalBalance: number;
  paymentStatus: "receive" | "pay" | "settled";
  paymentAmount: number;
  paidItems: BalanceItem[];
  debtItems: BalanceItem[];
  users: UserGroup[];
  isCurrent?: boolean;
};

const BalanceCard = ({
  user,
  leader,
  balanceFromExpense,
  fundAmount,
  paymentStatus,
  paymentAmount,
  paidItems,
  debtItems,
  isCurrent,
}: Props) => {
  const palette = useAppPalette();
  const theme = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  const [expanded, setExpanded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrError, setQrError] = useState(false);

  const isNeedToPay = paymentStatus === "pay";
  const isNeedToReceive = paymentStatus === "receive";
  const isSettled = paymentStatus === "settled";

  const successColor = palette.isDark ? "#6EE7B7" : "#15803D";
  const successBorder = palette.isDark ? "#23664D" : "#BBF7D0";
  const errorColor = palette.isDark ? "#FDA4AF" : "#DC2626";
  const errorBorder = palette.isDark ? "#7A3038" : "#FECACA";
  const primaryContentColor = palette.isDark
    ? theme.colors.onPrimaryContainer
    : theme.colors.primary;

  const receiver = isNeedToPay ? leader : user;
  const sender = isNeedToPay ? user : leader;
  const isLeader = leader.id === currentUser.id;

  const isValidQR =
    receiver?.bankAccNumber &&
    receiver?.bank &&
    receiver.bankAccNumber.length >= 6;

  const generateQRUrl = ({
    amount,
    content,
    accountNo,
    bankCode,
  }: {
    amount: number;
    content: string;
    accountNo: string;
    bankCode: string;
  }) => {
    return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      content,
    )}`;
  };

  const handleCopyContent = async () => {
    const content = `Thanh toan ${sender.name} cho ${receiver.name}`;
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Thành công", "Đã sao chép nội dung thanh toán");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Khách sạn":
        return "🏨";
      case "Ăn uống":
        return "🍜";
      case "Di chuyển":
        return "🚕";
      case "Khác":
        return "📦";
      default:
        return "💸";
    }
  };

  const getStatusColor = () => {
    if (isNeedToPay) return errorColor;
    if (isNeedToReceive) return successColor;
    return palette.textSecondary;
  };

  const getDescriptionText = () => {
    if (isNeedToPay) {
      if (fundAmount > 0) {
        return `Đã đóng quỹ ${formatMoney(fundAmount)}, cần trả thêm ${formatMoney(paymentAmount)} cho ${leader.name}`;
      }
      return `Cần trả ${formatMoney(paymentAmount)} cho ${leader.name}`;
    }
    if (isNeedToReceive) {
      if (fundAmount > 0) {
        return `Đã đóng quỹ ${formatMoney(fundAmount)}, được nhận lại ${formatMoney(paymentAmount)} từ ${leader.name}`;
      }
      return `Được nhận ${formatMoney(paymentAmount)} từ ${leader.name}`;
    }
    return "Đã cân bằng, không cần thanh toán thêm";
  };

  return (
    <>
      <Surface
        style={[
          styles.container,
          {
            backgroundColor: isCurrent
              ? palette.errorLight
              : palette.surface,
            borderColor: isCurrent ? errorBorder : palette.border,
            shadowColor: palette.isDark ? "#000000" : "#3D4E62",
          },
        ]}
        elevation={isCurrent ? 2 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user?.avatar ? (
              <Avatar.Image source={{ uri: user.avatar }} size={48} />
            ) : (
              <Avatar.Text
                size={48}
                label={getNameFirstLetterUpper(user?.name || "")}
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            <View style={styles.userText}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.userName, { color: palette.textPrimary }]}
                  numberOfLines={1}
                >
                  {user?.name}
                </Text>
                {isCurrent && (
                  <View
                    style={[
                      styles.youBadge,
                      { backgroundColor: theme.colors.error },
                    ]}
                  >
                    <Text
                      style={[
                        styles.youBadgeText,
                        { color: theme.colors.onError },
                      ]}
                    >
                      Bạn
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: getStatusColor() }]}>
                  {isNeedToPay
                    ? `Cần trả ${leader.name}`
                    : isNeedToReceive
                      ? `${leader.name} trả bạn`
                      : "Đã cân bằng"}
                </Text>
                <Text style={[styles.amount, { color: getStatusColor() }]}>
                  {isNeedToPay && `-${formatMoney(paymentAmount)}`}
                  {isNeedToReceive && `+${formatMoney(paymentAmount)}`}
                  {isSettled && "0đ"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.subLine, { borderTopColor: palette.border }]}>
          <Text
            style={[styles.subText, { color: palette.textSecondary }]}
            numberOfLines={2}
          >
            {getDescriptionText()}
          </Text>
          <View style={styles.actions}>
            {(isLeader || isCurrent) && (
              <TouchableOpacity
                style={[
                  styles.qrButton,
                  { backgroundColor: palette.surfaceMuted },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQrModalVisible(true);
                }}
              >
                <Ionicons
                  name="qr-code"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.expandButton,
                { backgroundColor: palette.surfaceMuted },
              ]}
              onPress={() => setExpanded(!expanded)}
            >
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={[styles.details, { borderTopColor: palette.border }]}>
            {/* Fund Information */}
            {fundAmount > 0 && (
              <View
                style={[
                  styles.fundSection,
                  { backgroundColor: palette.primaryLight },
                ]}
              >
                <View style={styles.fundHeader}>
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={primaryContentColor}
                  />
                  <Text
                    style={[
                      styles.fundTitle,
                      { color: primaryContentColor },
                    ]}
                  >
                    Thông tin quỹ
                  </Text>
                </View>
                <View style={styles.fundRow}>
                  <Text
                    style={[styles.fundLabel, { color: palette.textSecondary }]}
                  >
                    Đã đóng quỹ:
                  </Text>
                  <Text
                    style={[styles.fundValue, { color: palette.textPrimary }]}
                  >
                    {formatMoney(fundAmount)}
                  </Text>
                </View>
                <View style={styles.fundRow}>
                  <Text
                    style={[styles.fundLabel, { color: palette.textSecondary }]}
                  >
                    Số dư từ chi tiêu:
                  </Text>
                  <Text
                    style={[
                      styles.fundValue,
                      {
                        color:
                          balanceFromExpense > 0
                            ? successColor
                            : balanceFromExpense < 0
                              ? errorColor
                              : palette.textSecondary,
                      },
                    ]}
                  >
                    {balanceFromExpense > 0
                      ? `+${formatMoney(balanceFromExpense)}`
                      : formatMoney(balanceFromExpense)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.fundTotalRow,
                    { borderTopColor: palette.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.fundTotalLabel,
                      { color: palette.textPrimary },
                    ]}
                  >
                    Tổng kết:
                  </Text>
                  <Text
                    style={[styles.fundTotalValue, { color: getStatusColor() }]}
                  >
                    {isNeedToPay && `Cần trả ${formatMoney(paymentAmount)}`}
                    {isNeedToReceive &&
                      `Được nhận ${formatMoney(paymentAmount)}`}
                    {isSettled && "Đã cân bằng"}
                  </Text>
                </View>
              </View>
            )}

            {/* Paid Items */}
            {paidItems.length > 0 && (
              <View style={styles.itemsSection}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    💸 Khoản đã trả
                  </Text>
                  <View
                    style={[
                      styles.sectionBadge,
                      { backgroundColor: palette.successLight },
                    ]}
                  >
                    <Text
                      style={[styles.sectionBadgeText, { color: successColor }]}
                    >
                      {formatMoney(
                        paidItems.reduce((sum, i) => sum + i.amount, 0),
                      )}
                    </Text>
                  </View>
                </View>

                {paidItems.map((item) => (
                  <View
                    key={`paid-${item.id}`}
                    style={[
                      styles.paidItem,
                      {
                        backgroundColor: palette.successLight,
                        borderColor: successBorder,
                      },
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.categoryIcon}>
                        {getCategoryIcon(item.category)}
                      </Text>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemTitle,
                            { color: palette.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.paidChip,
                            { backgroundColor: palette.surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.paidChipText,
                              { color: successColor },
                            ]}
                          >
                            Bạn đã trả
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text
                      style={[styles.paidAmount, { color: successColor }]}
                    >
                      -{formatMoney(item.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Debt Items */}
            {debtItems.length > 0 && (
              <View style={styles.itemsSection}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    📝 Khoản đang nợ
                  </Text>
                  <View
                    style={[
                      styles.sectionBadge,
                      { backgroundColor: palette.errorLight },
                    ]}
                  >
                    <Text style={{ color: errorColor }}>
                      {formatMoney(
                        debtItems.reduce((sum, i) => sum + i.amount, 0),
                      )}
                    </Text>
                  </View>
                </View>

                {debtItems.map((item) => (
                  <View
                    key={`debt-${item.id}`}
                    style={[
                      styles.debtItem,
                      {
                        backgroundColor: palette.errorLight,
                        borderColor: errorBorder,
                      },
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.categoryIcon}>
                        {getCategoryIcon(item.category)}
                      </Text>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemTitle,
                            { color: palette.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.debtChip,
                            { backgroundColor: palette.surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.debtChipText,
                              { color: errorColor },
                            ]}
                          >
                            Nợ {item.payerName}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.debtAmount, { color: errorColor }]}>
                      +{formatMoney(item.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {paidItems.length === 0 &&
              debtItems.length === 0 &&
              fundAmount === 0 && (
                <Text
                  style={[styles.emptyDetails, { color: palette.textLight }]}
                >
                  Không có chi tiêu nào liên quan
                </Text>
              )}
          </View>
        )}
      </Surface>

      {/* QR Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: palette.isDark
                ? "rgba(0,0,0,0.72)"
                : "rgba(0,0,0,0.5)",
            },
          ]}
        >
          <Surface
            style={[
              styles.modalContent,
              { backgroundColor: palette.surface },
            ]}
            elevation={5}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: palette.textPrimary }]}
              >
                Thanh toán
              </Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {receiver?.avatar ? (
                <Avatar.Image source={{ uri: receiver.avatar }} size={72} />
              ) : (
                <Avatar.Text
                  size={72}
                  label={getNameFirstLetterUpper(receiver?.name || "")}
                  style={[
                    styles.receiverAvatar,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}

              <Text
                style={[styles.receiverName, { color: palette.textPrimary }]}
              >
                Thanh toán cho {receiver?.name}
              </Text>
              <Text
                style={[
                  styles.receiverAmount,
                  { color: theme.colors.primary },
                ]}
              >
                {formatMoney(paymentAmount)}
              </Text>

              <View
                style={[
                  styles.qrContainer,
                  {
                    backgroundColor:
                      isValidQR && !qrError ? "#FFFFFF" : palette.surfaceMuted,
                    borderColor: palette.border,
                    shadowColor: "#000000",
                  },
                ]}
              >
                {!isValidQR && (
                  <Text
                    style={[styles.qrErrorText, { color: errorColor }]}
                  >
                    Người nhận chưa thiết lập thông tin ngân hàng, vui lòng vào
                    trang cá nhân để thêm thông tin tài khoản ngân hàng.
                  </Text>
                )}

                {isValidQR && !qrError && (
                  <Image
                    source={{
                      uri: generateQRUrl({
                        amount: paymentAmount,
                        content: `Thanh toan ${sender.name} cho ${receiver.name}`,
                        accountNo: receiver.bankAccNumber ?? "",
                        bankCode: receiver.bank ?? "",
                      }),
                    }}
                    style={styles.qrImage}
                    onError={() => setQrError(true)}
                    resizeMode="contain"
                  />
                )}

                {isValidQR && qrError && (
                  <Text
                    style={[styles.qrErrorText, { color: errorColor }]}
                  >
                    Không thể tạo mã QR. Vui lòng kiểm tra lại thông tin ngân
                    hàng trong trang cá nhân.
                  </Text>
                )}
              </View>

              <Button
                mode="outlined"
                onPress={handleCopyContent}
                style={[
                  styles.copyButton,
                  { borderColor: theme.colors.primary },
                ]}
                textColor={theme.colors.primary}
                icon="content-copy"
              >
                Copy nội dung
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  header: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userText: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    marginRight: 8,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: 12,
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
  },
  subLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
  },
  subText: {
    fontSize: 12,
    flex: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qrButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  details: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  fundSection: {
    borderRadius: 12,
    padding: 12,
  },
  fundHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fundTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  fundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fundLabel: {
    fontSize: 12,
  },
  fundValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  fundTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  fundTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  fundTotalValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemsSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paidItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  debtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  categoryIcon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  paidChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  paidChipText: {
    fontSize: 9,
    fontWeight: "500",
  },
  debtChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  debtChipText: {
    fontSize: 9,
    fontWeight: "500",
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyDetails: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalBody: {
    padding: 24,
    alignItems: "center",
  },
  receiverAvatar: {
    marginBottom: 16,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  receiverAmount: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  qrContainer: {
    width: 220,
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 8,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrErrorText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  copyButton: {
    width: "100%",
  },
});

export default BalanceCard;
