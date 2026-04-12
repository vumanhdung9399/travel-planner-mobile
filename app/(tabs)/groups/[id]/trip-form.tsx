import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { IconButton, Text } from "react-native-paper";

const TripFormScreen = () => {
  const router = useRouter();
  const { id: groupId, tripId } = useLocalSearchParams<{
    id: string;
    tripId?: string;
  }>();

  const isEditMode = !!tripId;

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [infor, setInfor] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Fetch trip data if editing
  useEffect(() => {
    if (isEditMode && tripId) {
      fetchTrip();
    }
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const res = await api.get<Trip>(`/trips/${tripId}`);
      const trip = res.data;
      setName(trip.name || "");
      setLocation(trip.location || "");
      setInfor(trip.infor || "");
      setStartDate(trip.startDate ? new Date(trip.startDate) : new Date());
      setEndDate(trip.endDate ? new Date(trip.endDate) : new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Vui lòng nhập tên chuyến đi";
    } else if (name.trim().length < 3) {
      newErrors.name = "Tên chuyến đi phải có ít nhất 3 ký tự";
    }

    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }

    if (!endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    } else if (endDate < startDate) {
      newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const data: Partial<Trip> = {
        name: name.trim(),
        location: location.trim() || undefined,
        infor: infor.trim() || undefined,
        startDate: dayjs(startDate).format("YYYY-MM-DD"),
        endDate: dayjs(endDate).format("YYYY-MM-DD"),
      };

      if (isEditMode) {
        await api.patch(`/trips/${tripId}`, data);
      } else {
        await api.post(`/trips?groupId=${groupId}`, { ...data, groupId });
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

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // Nếu ngày kết thúc nhỏ hơn ngày bắt đầu mới, tự động set lại
      if (endDate < selectedDate) {
        setEndDate(selectedDate);
      }
      if (errors.startDate || errors.endDate) {
        setErrors((prev) => ({ ...prev, startDate: "", endDate: "" }));
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      if (errors.endDate) {
        setErrors((prev) => ({ ...prev, endDate: "" }));
      }
    }
  };

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
        title={isEditMode ? "Chỉnh sửa chuyến đi" : "Tạo chuyến đi mới"}
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
          {/* Illustration Preview */}
          <View style={styles.illustration}>
            <LinearGradient
              colors={COLORS.primaryGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.illustrationCircle}
            >
              <Text style={styles.illustrationEmoji}>
                {name.trim() ? name.trim().charAt(0).toUpperCase() : "✈️"}
              </Text>
            </LinearGradient>
            <Text style={styles.illustrationHint}>
              {name.trim() ? name.trim() : "Nhập tên chuyến đi"}
            </Text>
          </View>

          {/* Tên chuyến đi */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tên chuyến đi <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="Ví dụ: Đà Lạt 2024"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              editable={!loading}
              maxLength={255}
            />
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>

          {/* Địa điểm */}
          <View style={styles.field}>
            <Text style={styles.label}>Địa điểm</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa điểm (không bắt buộc)"
              placeholderTextColor={COLORS.textLight}
              value={location}
              onChangeText={setLocation}
              editable={!loading}
              maxLength={100}
            />
          </View>

          {/* Ngày bắt đầu */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Ngày bắt đầu <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.startDate && styles.inputError]}
              onPress={() => setShowStartPicker(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                {dayjs(startDate).format("DD/MM/YYYY")}
              </Text>
              <IconButton
                icon="calendar"
                size={20}
                iconColor={COLORS.primary}
              />
            </TouchableOpacity>
            {errors.startDate ? (
              <Text style={styles.errorText}>{errors.startDate}</Text>
            ) : null}
          </View>

          {/* Ngày kết thúc */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Ngày kết thúc <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.endDate && styles.inputError]}
              onPress={() => setShowEndPicker(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                {dayjs(endDate).format("DD/MM/YYYY")}
              </Text>
              <IconButton
                icon="calendar"
                size={20}
                iconColor={COLORS.primary}
              />
            </TouchableOpacity>
            {errors.endDate ? (
              <Text style={styles.errorText}>{errors.endDate}</Text>
            ) : null}
          </View>

          {/* Thông tin thêm */}
          <View style={styles.field}>
            <Text style={styles.label}>Thông tin thêm</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Thêm mô tả, ghi chú cho chuyến đi (không bắt buộc)"
              placeholderTextColor={COLORS.textLight}
              value={infor}
              onChangeText={setInfor}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!loading}
              maxLength={255}
            />
            <Text style={styles.charCount}>{infor.length}/255</Text>
          </View>
        </ScrollView>

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
              loading && styles.submitButtonDisabled,
            ]}
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
                  {isEditMode ? "Lưu thay đổi" : "Tạo chuyến đi"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="spinner"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="spinner"
          onChange={handleEndDateChange}
          minimumDate={startDate}
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  illustration: {
    alignItems: "center",
    marginBottom: 28,
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  illustrationEmoji: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  illustrationHint: {
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
    minHeight: 120,
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
  dateButton: {
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
  dateButtonText: {
    fontSize: 16,
    color: COLORS.textPrimary,
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

export default TripFormScreen;
