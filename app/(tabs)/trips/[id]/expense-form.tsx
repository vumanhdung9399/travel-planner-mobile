import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useTripStore } from "@/src/store/trip.store";
import type { ExpenseItem, UserGroupRole } from "@/src/type/trip";
import { COLORS, categories } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
    Avatar,
    Checkbox,
    IconButton,
    Surface,
    Text,
} from "react-native-paper";

const ExpenseFormScreen = () => {
  const router = useRouter();
  const { trip } = useTripStore();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    id: string;
    expenseId?: string;
  }>();

  const tripId = params.id;
  const expenseId = params.expenseId;
  const isEditMode = !!expenseId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [time, setTime] = useState(new Date(trip.startDate));
  const [paidBy, setPaidBy] = useState(user?.id || "");
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // UI state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const members = (trip.group.members || []) as UserGroupRole[];

  useEffect(() => {
    if (isEditMode && expenseId) {
      fetchExpense();
    } else {
      setFetching(false);
      if (user?.id) {
        setParticipants([user.id]);
      }
    }
  }, [expenseId]);

  const fetchExpense = async () => {
    try {
      const res = await api.get<ExpenseItem>(
        `/expenses/${tripId}/${expenseId}`,
      );
      const item = res.data;
      console.log(item);

      setTitle(item.title || "");
      setAmount(item.amount?.toString() || "");
      setCategory(item.category || "");
      setTime(item.time ? dayjs(item.time).toDate() : new Date());
      setPaidBy(item.paidBy?.id || user?.id || "");
      setParticipants(item.participants?.map((p: any) => p.user.id) || []);
      setNote(item.note || "");
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!amount || Number(amount) <= 0) newErrors.amount = "Số tiền phải > 0";
    if (!category) newErrors.category = "Vui lòng chọn danh mục";
    if (!paidBy) newErrors.paidBy = "Vui lòng chọn người trả";
    if (participants.length < 2)
      newErrors.participants = "Chọn ít nhất 2 người tham gia";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Ensure payer is in participants
    let finalParticipants = participants;
    if (!finalParticipants.includes(paidBy)) {
      finalParticipants = [...finalParticipants, paidBy];
    }
    console.log(participants);
    console.log(finalParticipants);

    const data = {
      title: title.trim(),
      amount: Number(amount),
      category,
      time: dayjs(time).toISOString(),
      paidBy,
      participants: finalParticipants,
      note: note.trim() || undefined,
    };

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isEditMode) {
        await api.patch(`/expenses/${tripId}/${expenseId}`, data);
      } else {
        await api.post(`/expenses/${tripId}`, data);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const raw = value.replace(/\D/g, "");
    setAmount(raw);
  };

  const toggleParticipant = (userId: string) => {
    if (userId === paidBy) return; // Cannot remove payer

    setParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const selectAllParticipants = () => {
    const allIds = members.map((m) => m.id).filter(Boolean);
    setParticipants(allIds);
  };

  const deselectAllParticipants = () => {
    setParticipants([paidBy]); // Keep only payer
  };

  const selectedCategory = categories.find((c) => c.value === category);
  const selectedPayer = members.find((m) => m.id === paidBy);

  if (fetching) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        title={isEditMode ? "Sửa chi phí" : "Thêm chi phí"}
        rightElement={
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={styles.headerSaveButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.headerSaveText}>Lưu</Text>
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview */}
          <View style={styles.preview}>
            <LinearGradient
              colors={COLORS.primaryGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewCircle}
            >
              <Text style={styles.previewEmoji}>
                {selectedCategory?.icon || "💰"}
              </Text>
            </LinearGradient>
          </View>

          {/* Tiêu đề */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tiêu đề <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : null]}
              placeholder="Ví dụ: Ăn trưa"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : null}
          </View>

          {/* Số tiền */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Số tiền <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.amountInput,
                  errors.amount ? styles.inputError : null,
                ]}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                value={
                  amount ? formatMoney(Number(amount)).replace("₫", "") : ""
                }
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
              <Text style={styles.currencySymbol}>₫</Text>
            </View>
            {errors.amount ? (
              <Text style={styles.errorText}>{errors.amount}</Text>
            ) : null}
          </View>

          {/* Danh mục */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Danh mục <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.category ? styles.inputError : null,
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text
                style={
                  selectedCategory
                    ? styles.selectText
                    : styles.selectPlaceholder
                }
              >
                {selectedCategory
                  ? `${selectedCategory.icon} ${selectedCategory.label}`
                  : "Chọn danh mục"}
              </Text>
              <IconButton
                icon="chevron-down"
                size={20}
                iconColor={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {errors.category ? (
              <Text style={styles.errorText}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Thời gian */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Thời gian <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.selectText}>
                {dayjs(time).format("DD/MM/YYYY • HH:mm")}
              </Text>
              <IconButton
                icon="calendar-clock"
                size={20}
                iconColor={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Người trả */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Người trả <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.paidBy ? styles.inputError : null,
              ]}
              onPress={() => setShowPayerModal(true)}
            >
              <View style={styles.payerInfo}>
                {selectedPayer && (
                  <>
                    <Avatar.Text
                      size={24}
                      label={getNameFirstLetterUpper(selectedPayer.name || "")}
                    />
                    <Text style={styles.payerName}>{selectedPayer.name}</Text>
                  </>
                )}
              </View>
              <IconButton
                icon="chevron-down"
                size={20}
                iconColor={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {errors.paidBy ? (
              <Text style={styles.errorText}>{errors.paidBy}</Text>
            ) : null}
          </View>

          {/* Người tham gia */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Người tham gia <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.participants ? styles.inputError : null,
              ]}
              onPress={() => setShowParticipantsModal(true)}
            >
              <Text style={styles.selectText}>
                {participants.length} người được chọn
              </Text>
              <IconButton
                icon="chevron-down"
                size={20}
                iconColor={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {errors.participants ? (
              <Text style={styles.errorText}>{errors.participants}</Text>
            ) : null}
          </View>

          {/* Ghi chú */}
          <View style={styles.field}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Thêm ghi chú (không bắt buộc)"
              placeholderTextColor={COLORS.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <LinearGradient
            colors={COLORS.primaryGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitText}>
              {isEditMode ? "Cập nhật" : "Thêm chi phí"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Time Picker */}
      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="datetime"
        date={time}
        onConfirm={(date) => {
          setShowTimePicker(false);
          setTime(date);
        }}
        onCancel={() => setShowTimePicker(false)}
        minimumDate={dayjs(trip.startDate).toDate()}
        maximumDate={dayjs(trip.endDate).toDate()}
        is24Hour={true}
      />

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn danh mục</Text>
              <IconButton
                icon="close"
                onPress={() => setShowCategoryModal(false)}
              />
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => {
                    setCategory(item.value);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                  {category === item.value && (
                    <IconButton
                      icon="check"
                      size={20}
                      iconColor={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </Surface>
        </View>
      </Modal>

      {/* Payer Modal */}
      <Modal visible={showPayerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người trả</Text>
              <IconButton
                icon="close"
                onPress={() => setShowPayerModal(false)}
              />
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const userId = item.id;
                return (
                  <TouchableOpacity
                    style={styles.memberItem}
                    onPress={() => {
                      setPaidBy(userId);
                      setShowPayerModal(false);
                    }}
                  >
                    <Avatar.Text
                      size={40}
                      label={getNameFirstLetterUpper(item.name || "")}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.name}</Text>
                    </View>
                    {paidBy === userId && (
                      <IconButton
                        icon="check"
                        size={20}
                        iconColor={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Surface>
        </View>
      </Modal>

      {/* Participants Modal */}
      <Modal visible={showParticipantsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người tham gia</Text>
              <IconButton
                icon="close"
                onPress={() => setShowParticipantsModal(false)}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAllParticipants}>
                <Text style={styles.modalActionText}>Chọn tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllParticipants}>
                <Text style={[styles.modalActionText, { color: COLORS.error }]}>
                  Bỏ chọn
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const userId = item.id;
                const isPayer = userId === paidBy;
                const isSelected = participants.includes(userId);
                return (
                  <TouchableOpacity
                    style={styles.memberItem}
                    onPress={() => toggleParticipant(userId)}
                    disabled={isPayer}
                  >
                    <Avatar.Text
                      size={40}
                      label={getNameFirstLetterUpper(item.name || "")}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {item.name} {isPayer && "(Người trả)"}
                      </Text>
                    </View>
                    <Checkbox
                      status={isSelected || isPayer ? "checked" : "unchecked"}
                      disabled={isPayer}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </Surface>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerSaveButton: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  preview: {
    alignItems: "center",
    marginBottom: 28,
  },
  previewCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewEmoji: {
    fontSize: 28,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
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
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  amountContainer: {
    position: "relative",
  },
  amountInput: {
    paddingRight: 40,
  },
  currencySymbol: {
    position: "absolute",
    right: 16,
    top: 14,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  payerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payerName: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  bottomBar: {
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
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});

export default ExpenseFormScreen;
