import { useAppPalette } from "@/src/hook/useAppPalette";
import { PageKicker, PageSubtitle, PageTitle } from "@/src/components/ui/AppTypography";
import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import { showError, showSuccess } from "@/src/utils/errorHandler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Surface, Text } from "react-native-paper";

interface RegisterForm {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const RegisterScreen = () => {
  const router = useRouter();
  const palette = useAppPalette();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = "Vui lòng nhập họ tên";
    }

    // Phone validation
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!phoneRegex.test(form.phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ (9-11 số)";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    // Password validation
    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (form.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await api.post<{ email: string; expiresAt: string }>(
        "/auth/register",
        {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        },
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess("Đăng ký thành công. Vui lòng xác thực email.");
      router.replace({
        pathname: "/(auth)/verify-email",
        params: {
          email: response.data.email || form.email.trim().toLowerCase(),
          expiresAt: response.data.expiresAt,
        },
      } as any);
    } catch (err: any) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(
        err?.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error when user types
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageWidth}>
          <Surface
            elevation={0}
            style={[
              styles.authCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.isDark ? palette.border : palette.textPrimary,
              },
            ]}
          >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={palette.textSecondary} />
            <Text style={[styles.backButtonText, { color: palette.textSecondary }]}>Quay lại</Text>
          </TouchableOpacity>

          <PageKicker>Bắt đầu miễn phí</PageKicker>
          <PageTitle style={styles.title}>
            Chuyến đi hay bắt đầu từ một lời rủ.
          </PageTitle>
          <PageSubtitle style={styles.subtitle}>
            Tạo tài khoản và gửi lời rủ đầu tiên ngay hôm nay.
          </PageSubtitle>

          {/* Form */}
          <View style={styles.formCard}>
            {/* Họ tên */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Họ và tên
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  errors.name ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={palette.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={palette.textLight}
                  selectionColor={COLORS.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  value={form.name}
                  onChangeText={(text) => updateForm("name", text)}
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Số điện thoại */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Số điện thoại
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={palette.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="0912345678"
                  placeholderTextColor={palette.textLight}
                  selectionColor={COLORS.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  value={form.phone}
                  onChangeText={(text) => updateForm("phone", text)}
                  editable={!loading}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  errors.email ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={palette.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="example@email.com"
                  placeholderTextColor={palette.textLight}
                  selectionColor={COLORS.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  value={form.email}
                  onChangeText={(text) => updateForm("email", text)}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Mật khẩu */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Mật khẩu
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  errors.password ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={palette.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="Ít nhất 8 ký tự"
                  placeholderTextColor={palette.textLight}
                  selectionColor={COLORS.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  value={form.password}
                  onChangeText={(text) => updateForm("password", text)}
                  editable={!loading}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={palette.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Xác nhận mật khẩu
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  errors.confirmPassword ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={palette.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={palette.textLight}
                  selectionColor={COLORS.primary}
                  keyboardAppearance={palette.isDark ? "dark" : "light"}
                  value={form.confirmPassword}
                  onChangeText={(text) => updateForm("confirmPassword", text)}
                  editable={!loading}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={palette.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                loading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.primaryGradient as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Tạo tài khoản</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: palette.textSecondary }]}>
                Đã có tài khoản?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms */}
          <Text style={[styles.termsText, { color: palette.textLight }]}>
            Bằng cách đăng ký, bạn đồng ý với{" "}
            <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{" "}
            <Text style={styles.termsLink}>Chính sách bảo mật</Text> của chúng
            tôi
          </Text>
          </Surface>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 18 : 28,
    paddingBottom: 40,
  },
  pageWidth: { width: "100%", maxWidth: 390 },
  authCard: {
    padding: 28,
    borderWidth: 1,
    borderRadius: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    minWidth: 92,
    height: 40,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 20,
  },
  backButtonText: { marginLeft: 7, fontSize: 12, fontWeight: "700" },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: { fontFamily: "DMSerifDisplay", fontWeight: "400",
    marginTop: 7,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
  },
  formCard: {
    marginTop: 2,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  registerButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 20,
  },
  registerButtonGradient: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  termsText: {
    marginTop: 20,
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: "500",
  },
});

export default RegisterScreen;
