import { useAuthStore } from "@/src/store/auth.store";
import type { UserGroup } from "@/src/type/user";
import { COLORS } from "@/src/utils/constants";
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
import { Avatar, Button, Surface, Text } from "react-native-paper";

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
  const currentUser = useAuthStore((state) => state.user);

  const [expanded, setExpanded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrError, setQrError] = useState(false);

  const isNeedToPay = paymentStatus === "pay";
  const isNeedToReceive = paymentStatus === "receive";
  const isSettled = paymentStatus === "settled";

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
    if (isNeedToPay) return COLORS.error;
    if (isNeedToReceive) return COLORS.success;
    return COLORS.textSecondary;
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
        style={[styles.container, isCurrent && styles.containerActive]}
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
                style={styles.avatar}
              />
            )}
            <View style={styles.userText}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name}
                </Text>
                {isCurrent && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>Bạn</Text>
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
        <View style={styles.subLine}>
          <Text style={styles.subText} numberOfLines={2}>
            {getDescriptionText()}
          </Text>
          <View style={styles.actions}>
            {(isLeader || isCurrent) && (
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQrModalVisible(true);
                }}
              >
                <Ionicons name="qr-code" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpanded(!expanded)}
            >
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.details}>
            {/* Fund Information */}
            {fundAmount > 0 && (
              <View style={styles.fundSection}>
                <View style={styles.fundHeader}>
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.fundTitle}>Thông tin quỹ</Text>
                </View>
                <View style={styles.fundRow}>
                  <Text style={styles.fundLabel}>Đã đóng quỹ:</Text>
                  <Text style={styles.fundValue}>
                    {formatMoney(fundAmount)}
                  </Text>
                </View>
                <View style={styles.fundRow}>
                  <Text style={styles.fundLabel}>Số dư từ chi tiêu:</Text>
                  <Text
                    style={[
                      styles.fundValue,
                      {
                        color:
                          balanceFromExpense > 0
                            ? COLORS.success
                            : balanceFromExpense < 0
                              ? COLORS.error
                              : COLORS.textSecondary,
                      },
                    ]}
                  >
                    {balanceFromExpense > 0
                      ? `+${formatMoney(balanceFromExpense)}`
                      : formatMoney(balanceFromExpense)}
                  </Text>
                </View>
                <View style={styles.fundTotalRow}>
                  <Text style={styles.fundTotalLabel}>Tổng kết:</Text>
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
                  <Text style={styles.sectionTitle}>💸 Khoản đã trả</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>
                      {formatMoney(
                        paidItems.reduce((sum, i) => sum + i.amount, 0),
                      )}
                    </Text>
                  </View>
                </View>

                {paidItems.map((item) => (
                  <View key={`paid-${item.id}`} style={styles.paidItem}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.categoryIcon}>
                        {getCategoryIcon(item.category)}
                      </Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.paidChip}>
                          <Text style={styles.paidChipText}>Bạn đã trả</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.paidAmount}>
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
                  <Text style={styles.sectionTitle}>📝 Khoản đang nợ</Text>
                  <View style={[styles.sectionBadge, styles.debtBadge]}>
                    <Text style={styles.debtBadgeText}>
                      {formatMoney(
                        debtItems.reduce((sum, i) => sum + i.amount, 0),
                      )}
                    </Text>
                  </View>
                </View>

                {debtItems.map((item) => (
                  <View key={`debt-${item.id}`} style={styles.debtItem}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.categoryIcon}>
                        {getCategoryIcon(item.category)}
                      </Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.debtChip}>
                          <Text style={styles.debtChipText}>
                            Nợ {item.payerName}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.debtAmount}>
                      +{formatMoney(item.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {paidItems.length === 0 &&
              debtItems.length === 0 &&
              fundAmount === 0 && (
                <Text style={styles.emptyDetails}>
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
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {receiver?.avatar ? (
                <Avatar.Image source={{ uri: receiver.avatar }} size={72} />
              ) : (
                <Avatar.Text
                  size={72}
                  label={getNameFirstLetterUpper(receiver?.name || "")}
                  style={styles.receiverAvatar}
                />
              )}

              <Text style={styles.receiverName}>
                Thanh toán cho {receiver?.name}
              </Text>
              <Text style={styles.receiverAmount}>
                {formatMoney(paymentAmount)}
              </Text>

              <View style={styles.qrContainer}>
                {!isValidQR && (
                  <Text style={styles.qrErrorText}>
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
                  <Text style={styles.qrErrorText}>
                    Không thể tạo mã QR. Vui lòng kiểm tra lại thông tin ngân
                    hàng trong trang cá nhân.
                  </Text>
                )}
              </View>

              <Button
                mode="outlined"
                onPress={handleCopyContent}
                style={styles.copyButton}
                textColor={COLORS.primary}
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerActive: {
    borderColor: COLORS.error,
    borderWidth: 2,
    backgroundColor: "#FEF2F2",
  },
  header: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
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
    borderTopColor: COLORS.border,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  details: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 16,
  },
  fundSection: {
    backgroundColor: "#F0F9FF",
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
    color: COLORS.primary,
  },
  fundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fundLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fundValue: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  fundTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#BFDBFE",
  },
  fundTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
  },
  sectionBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16A34A",
  },
  debtBadge: {
    backgroundColor: "#FEE2E2",
  },
  debtBadgeText: {
    color: "#DC2626",
  },
  paidItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  debtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
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
    color: COLORS.textPrimary,
  },
  paidChip: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  paidChipText: {
    fontSize: 9,
    color: "#16A34A",
    fontWeight: "500",
  },
  debtChip: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  debtChipText: {
    fontSize: 9,
    color: "#DC2626",
    fontWeight: "500",
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  emptyDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: "#fff",
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
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 24,
    alignItems: "center",
  },
  receiverAvatar: {
    marginBottom: 16,
    backgroundColor: COLORS.primary,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  receiverAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 20,
  },
  qrContainer: {
    width: 220,
    height: 260,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
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
    color: COLORS.error,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  copyButton: {
    width: "100%",
    borderColor: COLORS.primary,
  },
});

export default BalanceCard;
