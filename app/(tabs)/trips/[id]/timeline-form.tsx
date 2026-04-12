import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useTripStore } from "@/src/store/trip.store";
import type { TimelineItemType } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { IconButton, Text } from "react-native-paper";

const TimelineFormScreen = () => {
  const router = useRouter();
  const { trip } = useTripStore();
  const [loading, setLoading] = useState(false);
  const params = useLocalSearchParams<{
    id: string;
    timelineId?: string;
  }>();

  const tripId = params.id;
  const timelineId = params.timelineId;
  const isEditMode = !!timelineId;

  // State cho trip data
  const [fetchingTimeline, setFetchingTimeline] = useState(isEditMode);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState(new Date());
  const [notify, setNotify] = useState(false);
  const [day, setDay] = useState(1);
  const [errors, setErrors] = useState({
    title: "",
    time: "",
  });
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  // Fetch timeline data if editing
  useFocusEffect(
    useCallback(() => {
      if (isEditMode && timelineId) {
        fetchTimeline();
      }
    }, [timelineId, trip]),
  );

  useEffect(() => {
    if (trip.id) {
      const defaultTime = dayjs(trip.startDate)
        .set("hour", 9)
        .set("minute", 0)
        .toDate();
      setTime(defaultTime);
    }
  }, [trip]);

  const fetchTimeline = async () => {
    try {
      const res = await api.get<TimelineItemType>(
        `timelines/trip/${trip.id}/${timelineId}`,
      );
      const item = res.data;
      setTitle(item.title || "");
      setDescription(item.description || "");
      setTime(
        item.time
          ? dayjs(item.time).toDate()
          : dayjs().set("hour", 9).set("minute", 0).toDate(),
      );
      setNotify(item.notify || false);
      setDay(item.day || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingTimeline(false);
    }
  };

  const handleConfirmDateTime = (selectedDate: Date) => {
    setShowDateTimePicker(false);
    if (trip) {
      setTime(selectedDate);
      const calculatedDay = getDayIndexFromDate(trip.startDate, selectedDate);
      setDay(calculatedDay);
      if (errors.time) {
        setErrors((prev) => ({ ...prev, time: "" }));
      }
    }
  };

  const handleCancelDateTime = () => {
    setShowDateTimePicker(false);
  };

  const tripDays = trip
    ? dayjs(trip.endDate).diff(dayjs(trip.startDate), "day") + 1
    : 1;

  const getDayIndexFromDate = (
    startDate: string | Date,
    selectedDate: Date,
  ) => {
    const start = dayjs(startDate).startOf("day");
    const selected = dayjs(selectedDate).startOf("day");
    const diffDays = selected.diff(start, "day");
    return diffDays + 1;
  };

  const validate = () => {
    const newErrors = {
      title: "",
      time: "",
    };

    if (!title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề";
    }
    if (!time) {
      newErrors.time = "Vui lòng chọn thời gian";
    }

    setErrors(newErrors);
    return !newErrors.title && !newErrors.time;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!trip) {
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        time: dayjs(time).format("YYYY-MM-DD HH:mm"),
        day,
        notify,
        tripId,
      };

      if (isEditMode) {
        await api.patch(`/timelines/${timelineId}`, data);
      } else {
        await api.post(`/timelines`, data);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
    }
  };

  const formatDateTime = (date: Date) => {
    return dayjs(date).format("DD/MM/YYYY • HH:mm");
  };

  if (fetchingTimeline) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Không tìm thấy chuyến đi</Text>
      </SafeAreaView>
    );
  }

  const minDate = dayjs(trip.startDate).startOf("day").toDate();
  const maxDate = dayjs(trip.endDate).endOf("day").toDate();

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        title={isEditMode ? "Sửa lịch trình" : "Thêm lịch trình"}
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
              <Text style={styles.previewEmoji}>
                {title.trim() ? title.trim().charAt(0).toUpperCase() : "📅"}
              </Text>
            </LinearGradient>
            <Text style={styles.previewHint}>
              {title.trim() ? title.trim() : "Nhập tiêu đề lịch trình"}
            </Text>
          </View>

          {/* Tiêu đề */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tiêu đề <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : null]}
              placeholder="Ví dụ: Tham quan bảo tàng"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              editable={!loading}
              maxLength={255}
              autoFocus={!isEditMode}
            />
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : null}
          </View>

          {/* Mô tả */}
          <View style={styles.field}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Thêm mô tả chi tiết (không bắt buộc)"
              placeholderTextColor={COLORS.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              maxLength={255}
            />
          </View>

          {/* Thời gian */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Thời gian <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                errors.time ? styles.inputError : null,
              ]}
              onPress={() => setShowDateTimePicker(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.dateTimeButtonText}>
                {formatDateTime(time)}
              </Text>
              <IconButton
                icon="calendar-clock"
                size={20}
                iconColor={COLORS.primary}
              />
            </TouchableOpacity>
            {errors.time ? (
              <Text style={styles.errorText}>{errors.time}</Text>
            ) : null}
            <Text style={styles.hintText}>
              Từ {dayjs(minDate).format("DD/MM/YYYY")} đến{" "}
              {dayjs(maxDate).format("DD/MM/YYYY")}
            </Text>
          </View>

          {/* Ngày thứ (tự động tính) */}
          <View style={styles.field}>
            <Text style={styles.label}>Ngày thứ</Text>
            <View style={styles.dayContainer}>
              <View style={styles.dayInputWrapper}>
                <Text style={styles.dayInputText}>
                  Ngày {day} / {tripDays}
                </Text>
              </View>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>
                  {day}/{tripDays}
                </Text>
              </View>
            </View>
            <Text style={styles.hintText}>
              Tự động tính dựa trên thời gian đã chọn
            </Text>
          </View>

          {/* Thông báo */}
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Thông báo</Text>
                <Text style={styles.switchHint}>
                  Nhận thông báo trước giờ diễn ra
                </Text>
              </View>
              <Switch
                value={notify}
                onValueChange={setNotify}
                disabled={loading}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Button (cho màn hình nhỏ) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
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
              <Text style={styles.submitText}>
                {isEditMode ? "Cập nhật" : "Tạo lịch trình"}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* DateTime Picker */}
      {showDateTimePicker && (
        <DateTimePickerModal
          isVisible={showDateTimePicker}
          mode="datetime"
          date={time}
          onConfirm={handleConfirmDateTime}
          onCancel={handleCancelDateTime}
          minimumDate={minDate}
          maximumDate={maxDate}
          minuteInterval={15}
          is24Hour={true}
          locale="vi_VN"
        />
      )}
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
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  previewHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "right",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6,
  },
  dateTimeButton: {
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
  dateTimeButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  dayContainer: {
    position: "relative",
  },
  dayInputWrapper: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dayInputText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  dayBadge: {
    position: "absolute",
    right: 12,
    top: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchHint: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default TimelineFormScreen;
