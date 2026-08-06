import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { showSuccess } from "@/src/utils/errorHandler";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { changePasswordSchema } from "@/src/utils/validation";
import { removeCurrentDeviceToken } from "@/src/hook/usePushNotification";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface PasswordVisibility {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

type PasswordField = "current" | "new" | "confirm";

export default function ChangePasswordScreen() {
  const { logout } = useAuthStore();
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const toggle = (key: keyof PasswordVisibility) =>
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: yupResolver(changePasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: any) => {
    await api.patch("/users/me/change-password", {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    showSuccess("Đổi mật khẩu thành công, vui lòng đăng nhập lại");
    try {
      await removeCurrentDeviceToken();
      await api.post("/auth/logout");
    } catch {}
    logout();
  };

  const renderField = (label: string, name: any, key: PasswordField) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{label}</Text>

          <View style={styles.passwordBox}>
            <TextInput
              secureTextEntry={!show[key]}
              style={styles.input}
              onChangeText={field.onChange}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity onPress={() => toggle(key)}>
              <Ionicons
                name={show[key] ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {errors[name as keyof typeof errors] && (
            <Text style={styles.error}>
              {errors[name as keyof typeof errors]?.message}
            </Text>
          )}
        </View>
      )}
    />
  );

  return (
    <View style={styles.screen}>
      <CommonHeader title="Đổi mật khẩu" />
      <View style={styles.container}>
        {renderField("Mật khẩu hiện tại", "currentPassword", "current")}
        {renderField("Mật khẩu mới", "newPassword", "new")}
        {renderField("Xác nhận mật khẩu", "confirmPassword", "confirm")}

        <View style={styles.requirements}>
          <Text style={styles.requirementTitle}>Mật khẩu an toàn nên có</Text>
          <Text style={styles.requirement}>✓ Tối thiểu 8 ký tự</Text>
          <Text style={styles.requirement}>✓ Chữ hoa, chữ thường và chữ số</Text>
        </View>

        <TouchableOpacity
          disabled={!isValid || isSubmitting}
          style={[styles.btn, (!isValid || isSubmitting) && styles.btnDisabled]}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.btnText}>
            {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1, padding: 18 },
  fieldGroup: { marginBottom: 14 },
  label: {
    marginBottom: 7,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  passwordBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
  requirements: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 16,
  },
  requirementTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 5,
  },
  requirement: { color: COLORS.success, fontSize: 13, marginTop: 3 },

  btn: {
    backgroundColor: COLORS.primary,
    minHeight: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { backgroundColor: COLORS.border },

  btnText: { color: "#fff", fontWeight: "bold" },

  error: { color: COLORS.error, fontSize: 12, marginTop: 5 },
});
