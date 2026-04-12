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

type Props = {
  user: UserGroup;
  leader: any;
  total: number;
  items: any[];
  users: UserGroup[];
  isCurrent?: boolean;
};

const BalanceCard = ({
  user,
  leader,
  total,
  items,
  users,
  isCurrent,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrError, setQrError] = useState(false);

  const isDebt = total > 0;
  const isLeader = user.id === leader.id;
  const displayAmount = Math.abs(total);

  const receiver = isDebt ? leader : user;
  const sender = isDebt ? user : leader;

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
              <Text
                style={[
                  styles.amount,
                  { color: isDebt ? COLORS.error : COLORS.success },
                ]}
              >
                {displayAmount.toLocaleString()}đ
              </Text>
            </View>
          </View>
        </View>

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

        {/* DETAILS */}
        {expanded && (
          <View style={styles.details}>
            {items.map((item: any, index: number) => {
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
                    {Math.round(item.amount).toLocaleString()}đ
                  </Text>
                </View>
              );
            })}
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
                {displayAmount.toLocaleString()}đ
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
                        accountNo: receiver.bankAccNumber,
                        bankCode: receiver.bank,
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
  amount: {
    fontSize: 18,
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
    borderTopColor: COLORS.border,
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
