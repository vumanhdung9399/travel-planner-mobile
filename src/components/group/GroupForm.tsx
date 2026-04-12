import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Text } from "react-native-paper";

interface GroupFormProps {
  mode: "create" | "edit";
  groupId?: string;
}

const GroupForm: React.FC<GroupFormProps> = ({ mode, groupId }) => {
  const router = useRouter();
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ name: "", description: "" });

  useEffect(() => {
    navigation.setOptions({
      title: mode === "create" ? "Tạo nhóm mới" : "Chỉnh sửa nhóm",
    });
  }, [mode, navigation]);

  useFocusEffect(
    useCallback(() => {
      getGroupDetail();
    }, []),
  );

  const getGroupDetail = () => {
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
      fetchGroup();
    } else {
      setName("");
      setDescription("");
    }
  };

  const validate = (): boolean => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const newError = { name: "", description: "" };
    let isValid = true;

    if (!trimmedName) {
      newError.name = "Vui lòng nhập tên nhóm";
      isValid = false;
    } else if (trimmedName.length < 3) {
      newError.name = "Tên nhóm phải có ít nhất 3 ký tự";
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <LinearGradient
          colors={["#22d3ee", "#4ade80"]}
          style={styles.avatarPreview}
        >
          <Text style={styles.avatarLetter}>
            {name.trim() ? name.trim().charAt(0).toUpperCase() : "?"}
          </Text>
        </LinearGradient>
        <Text style={styles.previewHint}>
          {name.trim() ? "Tên nhóm của bạn" : "Nhập tên nhóm để xem trước"}
        </Text>
      </View>

      {/* Tên nhóm */}
      <View style={styles.field}>
        <Text style={styles.label}>Tên nhóm *</Text>
        <TextInput
          style={[styles.input, error.name ? styles.inputError : null]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error.name) setError((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="Ví dụ: Chuyến đi Đà Lạt"
          placeholderTextColor="#9CA3AF"
          autoFocus
          maxLength={40}
          editable={!loading}
        />
        {error.name ? <Text style={styles.errorText}>{error.name}</Text> : null}
        <Text style={styles.charCount}>{name.length}/40</Text>
      </View>

      {/* Mô tả nhóm */}
      <View style={styles.field}>
        <Text style={styles.label}>Mô tả</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            error.description ? styles.inputError : null,
          ]}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (error.description)
              setError((prev) => ({ ...prev, description: "" }));
          }}
          placeholder="Nhập mô tả ngắn về nhóm (không bắt buộc)"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          maxLength={200}
          editable={!loading}
          textAlignVertical="top"
        />
        {error.description ? (
          <Text style={styles.errorText}>{error.description}</Text>
        ) : null}
        <Text style={styles.charCount}>{description.length}/200</Text>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          contentStyle={styles.submitButtonContent}
          style={styles.submitButton}
          buttonColor={COLORS.primary}
        >
          {mode === "create" ? "Tạo nhóm" : "Lưu thay đổi"}
        </Button>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  previewHint: {
    fontSize: 14,
    color: "#64748B",
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 4,
  },
  footer: {
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 16,
    marginBottom: 16,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default GroupForm;
