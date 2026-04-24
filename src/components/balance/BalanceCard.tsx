import type { UserGroup } from "@/src/type/user";
import { COLORS } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
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
import { Avatar, Button, IconButton, Surface, Text } from "react-native-paper";

interface TripFund {
  id: string;
  amount: number;
  note?: string;
  createdAt: string;
  user: UserGroup;
}

interface BalanceItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  payerId: string;
  type: "debt" | "credit";
}

type Props = {
  user: UserGroup;
  leader: UserGroup;
  total: number;
  items: BalanceItem[];
  funds: TripFund[]; // ← THÊM: dữ liệu quỹ
  users: UserGroup[];
  isCurrent?: boolean;
};

const BalanceCard = ({
  user,
  leader,
  total,
  items,
  funds, // ← THÊM
  users,
  isCurrent,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [showFundDetails, setShowFundDetails] = useState(false); // ← THÊM

  const isDebt = total > 0;
  const isLeader = user.id === leader.id;
  const displayAmount = Math.abs(total);

  const receiver = isDebt ? leader : user;
  const sender = isDebt ? user : leader;

  const userFund = funds.find((f) => f.user.id === user.id);
  const fundAmount = Number(userFund?.amount) || 0;

  const totalWithFund = total - Number(fundAmount);
  const displayTotalWithFund = Math.abs(totalWithFund);

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
    const content = `Thanh toan ${sender.name}`;
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

  const formatMoney = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

  return (
    <>
      <Surface
        style={[styles.container, isCurrent && styles.containerActive]}
        elevation={isCurrent ? 2 : 0}
      >
        {/* HEADER */}
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

              {/* Hiển thị chi phí */}
              <View style={styles.amountBreakdown}>
                <Text
                  style={[
                    styles.amountLabel,
                    { color: isDebt ? COLORS.error : COLORS.success },
                  ]}
                >
                  {isDebt ? `Nợ ${leader.name}` : `${leader.name} nợ bạn`}
                </Text>
                <Text
                  style={[
                    styles.amount,
                    { color: isDebt ? COLORS.error : COLORS.success },
                  ]}
                >
                  {formatMoney(displayAmount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Hiển thị quỹ đóng góp */}
        {fundAmount > 0 && (
          <View style={styles.fundSection}>
            <View style={styles.fundRow}>
              <View style={styles.fundIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.fundInfo}>
                <Text style={styles.fundLabel}>Quỹ đóng góp</Text>
                <Text style={styles.fundAmount}>{formatMoney(fundAmount)}</Text>
              </View>
              <IconButton
                icon={showFundDetails ? "chevron-up" : "chevron-down"}
                size={18}
                iconColor={COLORS.textSecondary}
                onPress={() => setShowFundDetails(!showFundDetails)}
                style={styles.expandButton}
              />
            </View>

            {/* Chi tiết quỹ */}
            {showFundDetails && userFund && (
              <View style={styles.fundDetails}>
                <View style={styles.fundDetailRow}>
                  <Text style={styles.fundDetailLabel}>Ghi chú:</Text>
                  <Text style={styles.fundDetailValue}>
                    {userFund.note || "Không có ghi chú"}
                  </Text>
                </View>
                <View style={styles.fundDetailRow}>
                  <Text style={styles.fundDetailLabel}>Ngày:</Text>
                  <Text style={styles.fundDetailValue}>
                    {new Date(userFund.createdAt).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tổng cộng (nếu có quỹ) */}
        {fundAmount > 0 && totalWithFund !== total && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text
              style={[
                styles.totalAmount,
                {
                  color:
                    totalWithFund > 0
                      ? COLORS.error
                      : totalWithFund < 0
                        ? COLORS.success
                        : COLORS.textSecondary,
                },
              ]}
            >
              {formatMoney(displayTotalWithFund)}
            </Text>
          </View>
        )}

        {/* SUB LINE */}
        <View style={styles.subLine}>
          <Text style={styles.subText}>
            {isDebt ? `Bạn trả ${leader.name}` : `${leader.name} trả bạn`}
          </Text>
          <View style={styles.actions}>
            {!isLeader && (
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQrModalVisible(true);
                }}
              >
                <Ionicons name="qr-code" size={18} color={COLORS.primary} />
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

        {/* DETAILS - CHI PHÍ */}
        {expanded && (
          <View style={styles.details}>
            {items.length > 0 ? (
              <>
                <Text style={styles.detailsTitle}>Chi phí liên quan:</Text>
                {items.map((item: BalanceItem, index: number) => {
                  const payer = users.find((u) => u.id === item.payerId);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.detailItem,
                        index === items.length - 1 && styles.lastDetailItem,
                      ]}
                    >
                      <View style={styles.detailLeft}>
                        <Text style={styles.categoryIcon}>
                          {getCategoryIcon(item.category)}
                        </Text>
                        <View style={styles.detailInfo}>
                          <Text style={styles.detailTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.payerChip}>
                            <Text style={styles.payerChipText}>
                              {payer?.name} trả
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.detailAmount}>
                        {formatMoney(item.amount)}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={styles.emptyDetails}>Không có chi phí nào</Text>
            )}
          </View>
        )}
      </Surface>

      {/* QR MODAL */}
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
              <IconButton
                icon="close"
                size={24}
                onPress={() => setQrModalVisible(false)}
              />
            </View>

            <View style={styles.modalBody}>
              {receiver?.avatar ? (
                <Avatar.Image
                  source={{ uri: receiver.avatar }}
                  size={72}
                  style={styles.receiverAvatar}
                />
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
                {formatMoney(displayAmount)}
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
                        amount: displayAmount,
                        content: `Thanh toan ${sender.name}`,
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
    marginBottom: 8,
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
    marginBottom: 4,
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

  // ← THÊM: New styles cho amount breakdown
  amountBreakdown: {
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
  },

  // ← THÊM: Fund section styles
  fundSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fundRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fundIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fundInfo: {
    flex: 1,
  },
  fundLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  fundAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  expandButton: {
    margin: 0,
  },

  // ← THÊM: Fund details styles
  fundDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
  },
  fundDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fundDetailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  fundDetailValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },

  // ← THÊM: Total row styles
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
  },

  subLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  details: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lastDetailItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  payerChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  payerChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  emptyDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: "italic",
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
