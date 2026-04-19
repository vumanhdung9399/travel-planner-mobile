import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { showSuccess } from "@/src/utils/errorHandler";
import { changePasswordSchema } from "@/src/utils/validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(changePasswordSchema),
  });

  const onSubmit = async (data: any) => {
    await api.patch("/users/me/change-password", data);
    showSuccess("Đổi mật khẩu thành công, vui lòng đăng nhập lại");
    logout();
  };

  const renderField = (label: string, name: any, key: PasswordField) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={{ marginBottom: 12 }}>
          <Text>{label}</Text>

          <View style={styles.passwordBox}>
            <TextInput
              secureTextEntry={!show[key]}
              style={{ flex: 1 }}
              onChangeText={field.onChange}
            />
            <TouchableOpacity onPress={() => toggle(key)}>
              <Text>{show[key] ? "🙈" : "👁"}</Text>
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
    <View style={{ flex: 1 }}>
      <CommonHeader title="Đổi mật khẩu" />
      <View style={styles.container}>
        {renderField("Mật khẩu hiện tại", "currentPassword", "current")}
        {renderField("Mật khẩu mới", "newPassword", "new")}
        {renderField("Xác nhận mật khẩu", "confirmPassword", "confirm")}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit(onSubmit)}>
          <Text style={styles.btnText}>
            {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  passwordBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },

  btn: {
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  btnText: { color: "#fff", fontWeight: "bold" },

  error: { color: "red", fontSize: 12 },
});
