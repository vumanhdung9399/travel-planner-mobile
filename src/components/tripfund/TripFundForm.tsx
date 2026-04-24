import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Avatar, Checkbox, Text } from "react-native-paper";

import { CommonHeader } from "@/src/components/layout/CommonHeader";
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

  const [members, setMembers] = useState<UserGroupRole[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string>("");

  useEffect(() => {
    setMembers(trip.group.members);
    console.log(trip.group.members, 99);
  }, [trip.id]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        setAmounts((prevAmounts) => {
          const newAmounts = { ...prevAmounts };
          delete newAmounts[userId];
          return newAmounts;
        });
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAmountChange = (userId: string, value: string) => {
    const raw = value.replace(/\D/g, "");
    setAmounts((prev) => ({
      ...prev,
      [userId]: raw,
    }));
  };

  const selectAllMembers = () => {
    const allIds = new Set(members.map((m) => m.id));
    setSelectedMembers(allIds);
  };

  const deselectAllMembers = () => {
    setSelectedMembers(new Set());
    setAmounts({});
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
    const isSelected = selectedMembers.has(item.id);
    const amount = amounts[item.id] || "";

    return (
      <View key={item.id} style={styles.memberItem}>
        <TouchableOpacity
          style={styles.memberSelect}
          onPress={() => toggleMember(item.id)}
          activeOpacity={0.7}
        >
          <Checkbox
            status={isSelected ? "checked" : "unchecked"}
            color={COLORS.primary}
          />
        </TouchableOpacity>

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
          <Text style={styles.memberEmail}>{item.phone}</Text>
        </View>

        {isSelected && (
          <View style={styles.amountInput}>
            <TextInput
              style={styles.amountInputField}
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              value={
                amount
                  ? formatMoney(Number(amount)).replace("đ", "").trim()
                  : ""
              }
              onChangeText={(text) => handleAmountChange(item.id, text)}
              keyboardType="numeric"
            />
            <Text style={styles.currencySymbol}>đ</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader title="Tạo quỹ" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview */}
          <View style={styles.preview}>
            <LinearGradient
              colors={COLORS.primaryGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewCircle}
            >
              <Text style={styles.previewEmoji}>💰</Text>
            </LinearGradient>
            <Text style={styles.previewHint}>
              {selectedMembers.size > 0
                ? `Tổng quỹ: ${formatMoney(getTotalAmount())}`
                : "Chọn thành viên để tạo quỹ"}
            </Text>
          </View>

          {/* Errors */}
          {errors ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors}</Text>
            </View>
          ) : null}

          {/* Member Selection */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>
                Chọn thành viên ({selectedMembers.size}/{members.length})
              </Text>
              {selectedMembers.size > 0 && (
                <TouchableOpacity onPress={deselectAllMembers}>
                  <Text style={styles.clearText}>Bỏ chọn</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.membersList}>
              {members.map((member) => renderMemberItem({ item: member }))}
            </View>

            {selectedMembers.size < members.length && (
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={selectAllMembers}
              >
                <Ionicons
                  name="checkmark-done"
                  size={18}
                  color={COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.selectAllText}>Chọn tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Note */}
          <View style={styles.field}>
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
            <Text style={styles.charCount}>{note.length}/255</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || selectedMembers.size === 0) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || selectedMembers.size === 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={COLORS.primaryGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Tạo quỹ</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  preview: {
    alignItems: "center",
    marginBottom: 28,
  },
  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 36,
  },
  previewHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  field: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  membersList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberSelect: {
    marginRight: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  amountInput: {
    position: "relative",
    minWidth: 100,
  },
  amountInputField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingRight: 30,
  },
  currencySymbol: {
    position: "absolute",
    right: 12,
    top: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "right",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default TripFundForm;
