import TripDetailFormSheet from "@/src/components/trip/TripDetailFormSheet";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";

interface GroupFormProps {
  mode: "create" | "edit";
  groupId?: string;
}

const GroupForm: React.FC<GroupFormProps> = ({ mode, groupId }) => {
  const router = useRouter();
  const palette = useAppPalette();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ name: "", description: "" });

  useFocusEffect(
    useCallback(() => {
      if (mode === "edit" && groupId) {
        const fetchGroup = async () => {
          try {
            setLoading(true);
            const res = await api.get(`/groups/${groupId}`);
            setName(res.data.name);
            setDescription(res.data.description || "");
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        };
        void fetchGroup();
      } else {
        setName("");
        setDescription("");
      }

    }, [groupId, mode]),
  );

  const validate = (): boolean => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const newError = { name: "", description: "" };
    let isValid = true;

    if (!trimmedName) {
      newError.name = "Vui lòng nhập tên nhóm";
      isValid = false;
    } else if (trimmedName.length < 5) {
      newError.name = "Tên nhóm phải có ít nhất 5 ký tự";
      isValid = false;
    } else if (trimmedName.length > 100) {
      newError.name = "Tên nhóm không được vượt quá 100 ký tự";
      isValid = false;
    }

    if (trimmedDesc.length > 200) {
      newError.description = "Mô tả không được vượt quá 200 ký tự";
      isValid = false;
    }

    setError(newError);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
      };

      if (mode === "create") {
        await api.post("/groups", payload);
      } else {
        await api.patch(`/groups/${groupId}`, payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      console.error(err);
      setError((prev) => ({
        ...prev,
        name: err?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại",
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TripDetailFormSheet
      title={mode === "create" ? "Tạo nhóm mới" : "Sửa nhóm"}
      onCancel={() =>
        mode === "create" ? router.replace("/") : router.back()
      }
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Lưu"
      height="80%"
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: palette.surface }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>
            Tên nhóm
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              },
              error.name ? styles.inputError : null,
            ]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error.name) setError((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Ví dụ: Chuyến đi Đà Lạt"
            placeholderTextColor={palette.textLight}
            selectionColor={COLORS.primary}
            keyboardAppearance={palette.isDark ? "dark" : "light"}
            autoFocus={mode === "create"}
            maxLength={100}
            editable={!loading}
          />
          {error.name ? <Text style={styles.errorText}>{error.name}</Text> : null}
          <Text style={[styles.charCount, { color: palette.textLight }]}>
            {name.length}/100 · tối thiểu 5
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>Mô tả</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              },
              styles.textArea,
              error.description ? styles.inputError : null,
            ]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error.description)
                setError((prev) => ({ ...prev, description: "" }));
            }}
            placeholder="Nhập mô tả (không bắt buộc)"
            placeholderTextColor={palette.textLight}
            selectionColor={COLORS.primary}
            keyboardAppearance={palette.isDark ? "dark" : "light"}
            multiline
            numberOfLines={4}
            maxLength={200}
            editable={!loading}
            textAlignVertical="top"
          />
          {error.description ? (
            <Text style={styles.errorText}>{error.description}</Text>
          ) : null}
          <Text style={[styles.charCount, { color: palette.textLight }]}>
            {description.length}/200
          </Text>
        </View>
      </ScrollView>
    </TripDetailFormSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
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
  textArea: {
    minHeight: 86,
    paddingTop: 13,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "right",
    marginTop: 4,
  },
});

export default GroupForm;
