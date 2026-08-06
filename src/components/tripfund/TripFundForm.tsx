import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";

import TripDetailFormSheet from "@/src/components/trip/TripDetailFormSheet";
import { api } from "@/src/services/api";
import { useTripStore } from "@/src/store/trip.store";
import { UserGroupRole } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";

interface ContributionData {
  userId: string;
  amount: number;
}

const TripFundForm = () => {
  const router = useRouter();
  const { trip } = useTripStore();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const members = (trip.group?.members || []) as UserGroupRole[];
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string>("");

  const handleAmountChange = (userId: string, value: string) => {
    const raw = value.replace(/\D/g, "");
    setAmounts((prev) => ({
      ...prev,
      [userId]: raw,
    }));
    setSelectedMembers((current) => {
      const next = new Set(current);
      if (Number(raw) > 0) next.add(userId);
      else next.delete(userId);
      return next;
    });
    if (errors) setErrors("");
  };

  const validate = (): boolean => {
    if (selectedMembers.size === 0) {
      setErrors("Vui lòng chọn ít nhất 1 thành viên");
      return false;
    }

    for (const userId of selectedMembers) {
      const amount = amounts[userId];
      if (!amount || Number(amount) <= 0) {
        setErrors(`Vui lòng nhập số tiền cho thành viên này`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const contributions: ContributionData[] = Array.from(selectedMembers).map(
        (userId) => ({
          userId,
          amount: Number(amounts[userId]),
        }),
      );

      await api.post(`/trips/${tripId}/funds`, {
        contributions,
        note: note.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      console.error(err);
      setErrors(
        err?.response?.data?.message || "Thêm quỹ thất bại, vui lòng thử lại",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return Array.from(selectedMembers).reduce(
      (sum, userId) => sum + (Number(amounts[userId]) || 0),
      0,
    );
  };

  const renderMemberItem = ({ item }: { item: UserGroupRole }) => {
    const amount = amounts[item.id] || "";

    return (
      <View key={item.id} style={styles.memberItem}>
        {item.avatar ? (
          <Avatar.Image
            source={{ uri: item.avatar }}
            size={40}
            style={styles.memberAvatar}
          />
        ) : (
          <View style={styles.memberAvatarFallback}>
            <Text style={styles.memberAvatarText}>
              {getNameFirstLetterUpper(item.name)}
            </Text>
          </View>
        )}

        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
        </View>

        <View style={styles.amountInput}>
          <TextInput
            style={styles.amountInputField}
            placeholder="0"
            placeholderTextColor={COLORS.textSecondary}
            value={
              amount
                ? formatMoney(Number(amount)).replace(/\s?đ$/, "")
                : ""
            }
            onChangeText={(text) => handleAmountChange(item.id, text)}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.currencySymbol}>đ</Text>
        </View>
      </View>
    );
  };

  return (
    <TripDetailFormSheet
      title="Đóng góp quỹ"
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
      loading={loading}
      submitDisabled={selectedMembers.size === 0}
      submitLabel="Lưu"
      height="88%"
      footerTop={
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng</Text>
          <Text style={styles.totalValue}>{formatMoney(getTotalAmount())}</Text>
        </View>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {errors ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors}</Text>
          </View>
        ) : null}

        <View style={styles.membersList}>
          {members.map((member) => renderMemberItem({ item: member }))}
        </View>

        <TouchableOpacity
          style={styles.addMemberButton}
          onPress={() =>
            router.push({
              pathname: "/groups/[id]/add-member",
              params: { id: trip.group.id },
            })
          }
          activeOpacity={0.72}
        >
          <Ionicons name="add" size={23} color={COLORS.primary} />
          <Text style={styles.addMemberText}>Thêm thành viên</Text>
        </TouchableOpacity>

        <View style={styles.noteField}>
          <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ví dụ: Quỹ ăn uống chung"
            placeholderTextColor={COLORS.textLight}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={255}
          />
        </View>
      </ScrollView>
    </TripDetailFormSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: "#FFD2D2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  membersList: {
    backgroundColor: COLORS.surface,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EBEF",
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  memberAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  amountInput: {
    position: "relative",
    width: 124,
  },
  amountInputField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: "right",
    color: COLORS.textPrimary,
    paddingRight: 29,
  },
  currencySymbol: {
    position: "absolute",
    right: 11,
    top: 11,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  addMemberButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 52,
    marginTop: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#8DC3FF",
    borderRadius: 12,
    backgroundColor: COLORS.infoLight,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  noteField: {
    marginTop: 18,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 76,
    paddingTop: 13,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 62,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  totalLabel: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: "800",
  },
});

export default TripFundForm;
