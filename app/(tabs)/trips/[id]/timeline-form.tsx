import TripDetailFormSheet from "@/src/components/trip/TripDetailFormSheet";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { useTripStore } from "@/src/store/trip.store";
import type { TimelineItemType } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Text } from "react-native-paper";

const parseTripDate = (value: string) => dayjs(String(value).slice(0, 10));

const getBoundedTimelineTime = (
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

const getDayIndexFromDate = (
  startDate: string | Date,
  selectedDate: Date,
) => {
  const start = dayjs(startDate).startOf("day");
  const selected = dayjs(selectedDate).startOf("day");
  return selected.diff(start, "day") + 1;
};

const TimelineFormScreen = () => {
  const router = useRouter();
  const palette = useAppPalette();
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
  const [time, setTime] = useState(() =>
    trip?.startDate && trip?.endDate
      ? getBoundedTimelineTime(trip.startDate, trip.endDate).toDate()
      : new Date(),
  );
  const [notify, setNotify] = useState(false);
  const [day, setDay] = useState(1);
  const [errors, setErrors] = useState({
    title: "",
    time: "",
  });
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await api.get<TimelineItemType>(
        `timelines/trip/${trip.id}/${timelineId}`,
      );
      const item = res.data;
      setTitle(item.title || "");
      setDescription(item.description || "");
      const boundedTime = getBoundedTimelineTime(
        trip.startDate,
        trip.endDate,
        item.time ? dayjs(item.time) : dayjs(),
      );
      setTime(boundedTime.toDate());
      setNotify(item.notify || false);
      setDay(getDayIndexFromDate(trip.startDate, boundedTime.toDate()));
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingTimeline(false);
    }
  }, [timelineId, trip.endDate, trip.id, trip.startDate]);

  // Fetch timeline data if editing
  useFocusEffect(
    useCallback(() => {
      if (isEditMode && timelineId) {
        void fetchTimeline();
      }
    }, [fetchTimeline, isEditMode, timelineId]),
  );

  useEffect(() => {
    if (trip.id && !isEditMode) {
      const defaultTime = getBoundedTimelineTime(
        trip.startDate,
        trip.endDate,
      );
      setTime(defaultTime.toDate());
      setDay(getDayIndexFromDate(trip.startDate, defaultTime.toDate()));
    }
  }, [trip, isEditMode]);

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
      setLoading(true);
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
      useTripStore.getState().markContentChanged();
      router.back();
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  if (fetchingTimeline) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.background }]}
      >
        <Text style={{ color: palette.textPrimary }}>
          Không tìm thấy chuyến đi
        </Text>
      </SafeAreaView>
    );
  }

  const minDate = parseTripDate(trip.startDate).startOf("day").toDate();
  const maxDate = parseTripDate(trip.endDate).endOf("day").toDate();

  return (
    <TripDetailFormSheet
      title={isEditMode ? "Sửa lịch trình" : "Thêm lịch trình"}
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Lưu"
      height="80%"
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
            <Text style={[styles.label, { color: palette.textPrimary }]}>
              Tiêu đề
            </Text>
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
              selectionColor={COLORS.primary}
              keyboardAppearance={palette.isDark ? "dark" : "light"}
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
            <Text style={[styles.label, { color: palette.textPrimary }]}>
              Mô tả
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
                styles.textArea,
              ]}
              placeholder="Nhập mô tả (không bắt buộc)"
              placeholderTextColor={palette.textLight}
              selectionColor={COLORS.primary}
              keyboardAppearance={palette.isDark ? "dark" : "light"}
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
            <Text style={[styles.label, { color: palette.textPrimary }]}>
              Thời gian
            </Text>
            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                errors.time ? styles.inputError : null,
              ]}
              onPress={() => setShowDateTimePicker(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateTimeButtonText,
                  { color: palette.textPrimary },
                ]}
              >
                {formatDateTime(time)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={21}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
            {errors.time ? (
              <Text style={styles.errorText}>{errors.time}</Text>
            ) : null}
          </View>

          {/* Thông báo */}
          <View
            style={[
              styles.reminderRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[styles.reminderLabel, { color: palette.textPrimary }]}
            >
              Nhắc trước 30 phút
            </Text>
            <Switch
              value={notify}
              onValueChange={setNotify}
              disabled={loading}
              trackColor={{ false: palette.border, true: COLORS.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>

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
            isDarkModeEnabled={palette.isDark}
            buttonTextColorIOS={COLORS.primary}
            modalStyleIOS={{ backgroundColor: palette.surface }}
            pickerContainerStyleIOS={{ backgroundColor: palette.surface }}
          />
        )}
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
    minHeight: 86,
    paddingTop: 13,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  dateTimeButton: {
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
  dateTimeButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  reminderRow: {
    minHeight: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  reminderLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default TimelineFormScreen;
