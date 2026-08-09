import TripDetailFormSheet from "@/src/components/trip/TripDetailFormSheet";
import { api } from "@/src/services/api";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { useAuthStore } from "@/src/store/auth.store";
import { useTripStore } from "@/src/store/trip.store";
import type { ExpenseItem, UserGroupRole } from "@/src/type/trip";
import { COLORS, categories } from "@/src/utils/constants";
import { formatMoney, getNameFirstLetterUpper } from "@/src/utils/helper";
import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Avatar, Checkbox, IconButton, Surface, Text } from "react-native-paper";

const parseTripDate = (value: string) => dayjs(String(value).slice(0, 10));
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const SUPPORTED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

const getBoundedExpenseTime = (
  startDate: string,
  endDate: string,
  value = dayjs(),
) => {
  const tripStart = parseTripDate(startDate).startOf("day");
  const tripEnd = parseTripDate(endDate)
    .hour(23)
    .minute(59)
    .second(0)
    .millisecond(0);

  if (value.isAfter(tripEnd)) return tripEnd;
  if (value.isBefore(tripStart)) return tripStart.hour(9);
  return value;
};

const ExpenseFormScreen = () => {
  const router = useRouter();
  const palette = useAppPalette();
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
  const [time, setTime] = useState(() =>
    trip?.startDate && trip?.endDate
      ? getBoundedExpenseTime(trip.startDate, trip.endDate).toDate()
      : new Date(),
  );
  const [paidBy, setPaidBy] = useState(user?.id || "");
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [existingAttachment, setExistingAttachment] = useState("");
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // UI state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const members = (trip.group?.members || []) as UserGroupRole[];

  const fetchExpense = useCallback(async () => {
    try {
      const res = await api.get<ExpenseItem>(
        `/expenses/${tripId}/${expenseId}`,
      );
      const item = res.data;
      setTitle(item.title || "");
      setAmount(item.amount?.toString() || "");
      setCategory(item.category || "");
      setTime(
        getBoundedExpenseTime(
          trip.startDate,
          trip.endDate,
          item.time ? dayjs(item.time) : dayjs(),
        ).toDate(),
      );
      setPaidBy(item.paidBy?.id || user?.id || "");
      setParticipants(
        item.participants
          ?.map((p: any) => p.id || p.user?.id)
          .filter(Boolean) || [],
      );
      setNote(item.note || "");
      setAttachment(null);
      setAttachmentPreview(item.attachmentImage || "");
      setExistingAttachment(item.attachmentImage || "");
      setRemoveAttachment(false);
      setAttachmentError("");
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [expenseId, trip.endDate, trip.startDate, tripId, user?.id]);

  useEffect(() => {
    if (isEditMode && expenseId) {
      void fetchExpense();
    } else {
      setFetching(false);
      if (trip?.startDate && trip?.endDate) {
        setTime(
          getBoundedExpenseTime(trip.startDate, trip.endDate).toDate(),
        );
      }
      const memberIds = (trip.group?.members || [])
        .map((member) => member.id)
        .filter(Boolean);
      setParticipants(memberIds.length ? memberIds : user?.id ? [user.id] : []);
    }
  }, [
    expenseId,
    fetchExpense,
    isEditMode,
    trip.endDate,
    trip.group?.members,
    trip.startDate,
    user?.id,
  ]);

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

      let savedExpenseId = expenseId;
      if (isEditMode) {
        await api.patch(`/expenses/${tripId}/${expenseId}`, data);
      } else {
        const response = await api.post<ExpenseItem>(`/expenses/${tripId}`, data);
        savedExpenseId = response.data.id;
      }

      if (attachment && savedExpenseId) {
        const formData = new FormData();
        const webFile = (attachment as ImagePicker.ImagePickerAsset & {
          file?: File;
        }).file;
        const fileExtension = attachment.uri.split(".").pop()?.toLowerCase();
        const mimeType =
          attachment.mimeType ||
          (fileExtension === "png"
            ? "image/png"
            : fileExtension === "webp"
              ? "image/webp"
              : "image/jpeg");

        formData.append(
          "file",
          (webFile || {
            uri: attachment.uri,
            name: attachment.fileName || `expense-${Date.now()}.${fileExtension || "jpg"}`,
            type: mimeType,
          }) as any,
        );
        await api.patch(
          `/expenses/${tripId}/${savedExpenseId}/attachment`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      } else if (removeAttachment && savedExpenseId) {
        await api.delete(`/expenses/${tripId}/${savedExpenseId}/attachment`);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useTripStore.getState().markContentChanged();
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

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachmentError("Vui lòng cấp quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled) return;

    const selected = result.assets[0];
    const extension = selected.uri.split(".").pop()?.toLowerCase();
    const mimeType =
      selected.mimeType ||
      (extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : "");

    if (!SUPPORTED_ATTACHMENT_TYPES.includes(mimeType)) {
      setAttachmentError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP");
      return;
    }
    if (selected.fileSize && selected.fileSize > MAX_ATTACHMENT_SIZE) {
      setAttachmentError("Kích thước ảnh tối đa là 5 MB");
      return;
    }

    setAttachment({ ...selected, mimeType });
    setAttachmentPreview(selected.uri);
    setRemoveAttachment(false);
    setAttachmentError("");
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview("");
    setRemoveAttachment(Boolean(existingAttachment));
    setAttachmentError("");
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

  const selectedPayer = members.find((m) => m.id === paidBy);
  const selectedParticipants = members.filter((member) =>
    participants.includes(member.id),
  );

  const renderMemberAvatar = (member: UserGroupRole, size = 30) =>
    member.avatar ? (
      <Avatar.Image source={{ uri: member.avatar }} size={size} />
    ) : (
      <Avatar.Text
        size={size}
        label={getNameFirstLetterUpper(member.name || "")}
      />
    );

  if (fetching) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <TripDetailFormSheet
      title={isEditMode ? "Sửa chi phí" : "Thêm chi phí"}
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Lưu"
      height="94%"
    >
      <>
        <ScrollView
          style={[styles.scrollView, { backgroundColor: palette.surface }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tiêu đề */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Tiêu đề</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
                errors.title ? styles.inputError : null,
              ]}
              placeholder="Nhập tiêu đề"
              placeholderTextColor={palette.textLight}
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
            <Text style={[styles.label, { color: palette.textPrimary }]}>Số tiền</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.amountInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  },
                  errors.amount ? styles.inputError : null,
                ]}
                placeholder="0"
                placeholderTextColor={palette.textLight}
                value={
                  amount
                    ? formatMoney(Number(amount)).replace(/\s?đ$/, "")
                    : ""
                }
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
              <Text
                style={[styles.currencySymbol, { color: palette.textSecondary }]}
              >
                đ
              </Text>
            </View>
            {errors.amount ? (
              <Text style={styles.errorText}>{errors.amount}</Text>
            ) : null}
          </View>

          {/* Danh mục */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Danh mục</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => {
                const isSelected = category === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.categoryTile,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                      isSelected && [
                        styles.categoryTileSelected,
                        { backgroundColor: palette.successLight },
                      ],
                    ]}
                    onPress={() => {
                      setCategory(item.value);
                      setErrors((current) => ({ ...current, category: "" }));
                    }}
                    activeOpacity={0.76}
                  >
                    <Text style={styles.categoryTileIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.categoryTileLabel,
                        { color: palette.textSecondary },
                        isSelected && styles.categoryTileLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.category ? (
              <Text style={styles.errorText}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Thời gian */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Thời gian</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.selectText, { color: palette.textPrimary }]}>
                {dayjs(time).format("DD/MM/YYYY • HH:mm")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={21}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Người trả */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Người trả</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                errors.paidBy ? styles.inputError : null,
              ]}
              onPress={() => setShowPayerModal(true)}
            >
              <View style={styles.payerInfo}>
                {selectedPayer && (
                  <>
                    {renderMemberAvatar(selectedPayer, 30)}
                    <Text style={[styles.payerName, { color: palette.textPrimary }]}>
                      {selectedPayer.name}
                    </Text>
                  </>
                )}
              </View>
              <Ionicons
                name="chevron-down"
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
            {errors.paidBy ? (
              <Text style={styles.errorText}>{errors.paidBy}</Text>
            ) : null}
          </View>

          {/* Người tham gia */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Chia cho</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                errors.participants ? styles.inputError : null,
              ]}
              onPress={() => setShowParticipantsModal(true)}
            >
              <View style={styles.participantSummary}>
                <View style={styles.avatarStack}>
                  {selectedParticipants.slice(0, 4).map((member) => (
                    <View
                      key={member.id}
                      style={[styles.stackedAvatar, { borderColor: palette.surface }]}
                    >
                      {renderMemberAvatar(member, 30)}
                    </View>
                  ))}
                </View>
                <Text
                  style={[styles.participantCount, { color: palette.textPrimary }]}
                >
                  {participants.length} người
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
            {errors.participants ? (
              <Text style={styles.errorText}>{errors.participants}</Text>
            ) : null}
          </View>

          {/* Ghi chú */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Ghi chú</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
              ]}
              placeholder="Thêm ghi chú (không bắt buộc)"
              placeholderTextColor={palette.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Ảnh hóa đơn / chứng từ */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Ảnh đính kèm</Text>
            {attachmentPreview ? (
              <View
                style={[
                  styles.attachmentPreviewContainer,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: attachmentPreview }}
                  style={styles.attachmentPreview}
                  resizeMode="cover"
                />
                <View style={styles.attachmentActions}>
                  <TouchableOpacity
                    style={styles.changeAttachmentButton}
                    onPress={pickAttachment}
                    accessibilityLabel="Đổi ảnh đính kèm"
                  >
                    <Ionicons name="images-outline" size={17} color="#fff" />
                    <Text style={styles.changeAttachmentText}>Đổi ảnh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={clearAttachment}
                    accessibilityLabel="Xóa ảnh đính kèm"
                  >
                    <Ionicons name="trash-outline" size={19} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.attachmentPicker,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                  attachmentError ? styles.inputError : null,
                ]}
                onPress={pickAttachment}
                activeOpacity={0.75}
                accessibilityLabel="Chọn ảnh hóa đơn hoặc chứng từ"
              >
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={palette.textSecondary}
                />
                <Text
                  style={[
                    styles.attachmentPickerText,
                    { color: palette.textSecondary },
                  ]}
                >
                  Chọn ảnh hóa đơn hoặc chứng từ
                </Text>
              </TouchableOpacity>
            )}
            <Text
              style={
                attachmentError
                  ? styles.errorText
                  : [styles.attachmentHint, { color: palette.textLight }]
              }
            >
              {attachmentError || "JPG, PNG hoặc WEBP · tối đa 5 MB"}
            </Text>
          </View>
        </ScrollView>

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
        minimumDate={parseTripDate(trip.startDate).startOf("day").toDate()}
        maximumDate={parseTripDate(trip.endDate).endOf("day").toDate()}
        is24Hour={true}
        isDarkModeEnabled={palette.isDark}
      />

      {/* Payer Modal */}
      <Modal visible={showPayerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface
            style={[styles.modalContent, { backgroundColor: palette.surface }]}
          >
            <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                Chọn người trả
              </Text>
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
                    style={[styles.memberItem, { borderBottomColor: palette.border }]}
                    onPress={() => {
                      setPaidBy(userId);
                      setShowPayerModal(false);
                    }}
                  >
                    {renderMemberAvatar(item, 40)}
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: palette.textPrimary }]}>
                        {item.name}
                      </Text>
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
          <Surface
            style={[styles.modalContent, { backgroundColor: palette.surface }]}
          >
            <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                Chia chi phí cho
              </Text>
              <IconButton
                icon="close"
                onPress={() => setShowParticipantsModal(false)}
              />
            </View>
            <View style={[styles.modalActions, { borderBottomColor: palette.border }]}>
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
                    style={[styles.memberItem, { borderBottomColor: palette.border }]}
                    onPress={() => toggleParticipant(userId)}
                    disabled={isPayer}
                  >
                    {renderMemberAvatar(item, 40)}
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: palette.textPrimary }]}>
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
      </>
    </TripDetailFormSheet>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
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
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 78,
    paddingTop: 13,
  },
  attachmentPicker: {
    minHeight: 76,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 16,
  },
  attachmentPickerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  attachmentPreviewContainer: {
    height: 158,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
  },
  attachmentPreview: {
    width: "100%",
    height: "100%",
  },
  attachmentActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 7,
  },
  changeAttachmentButton: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 11,
    backgroundColor: "rgba(20, 33, 61, 0.84)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changeAttachmentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  removeAttachmentButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentHint: {
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
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
    top: 13,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  categoryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  categoryTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  categoryTileSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.successLight,
  },
  categoryTileIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryTileLabel: {
    maxWidth: "100%",
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  categoryTileLabelSelected: {
    color: COLORS.success,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  selectText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  payerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payerName: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  participantSummary: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarStack: {
    flexDirection: "row",
    paddingLeft: 6,
  },
  stackedAvatar: {
    marginLeft: -6,
    borderWidth: 2,
    borderColor: COLORS.surface,
    borderRadius: 18,
  },
  participantCount: {
    marginLeft: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "72%",
    paddingTop: 9,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 42,
    height: 5,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
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
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
