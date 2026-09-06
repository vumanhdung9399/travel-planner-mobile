import {
  PageKicker,
  PageSubtitle,
  PageTitle,
} from "@/src/components/ui/AppTypography";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { showError, showSuccess } from "@/src/utils/errorHandler";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Surface, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const palette = useAppPalette();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError("Email không hợp lệ");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/password/forgot", { email });
      setStep(2);
      showSuccess("Nếu email tồn tại, mã xác thực đã được gửi");
    } catch {
      showError("Không thể gửi mã xác thực");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      showError("Mã xác thực phải gồm 6 chữ số");
      return;
    }
    try {
      setLoading(true);
      const response = await api.post<{ resetToken: string }>(
        "/auth/password/verify-code",
        { email, code },
      );
      setResetToken(response.data.resetToken);
      setStep(3);
    } catch {
      showError("Mã xác thực không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (password.length < 8) {
      showError("Mật khẩu có tối thiểu 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      showError("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/password/reset", {
        resetToken,
        newPassword: password,
      });
      showSuccess("Đặt lại mật khẩu thành công");
      router.replace("/(auth)/login");
    } catch {
      showError("Không thể đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else router.back();
  };

  const action =
    step === 1 ? sendCode : step === 2 ? verifyCode : resetPassword;
  const actionLabel =
    step === 1
      ? "Gửi mã xác thực"
      : step === 2
        ? "Xác thực mã"
        : "Đặt lại mật khẩu";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Surface
            elevation={0}
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.isDark
                  ? palette.border
                  : palette.textPrimary,
              },
            ]}
          >
            <TouchableOpacity
              accessibilityLabel="Quay lại"
              onPress={goBack}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.iconBox,
                { backgroundColor: palette.primaryLight },
              ]}
            >
              <Ionicons
                name="lock-open-outline"
                size={36}
                color={COLORS.primary}
              />
            </View>
            <PageKicker style={styles.center}>Bước {step}/3</PageKicker>
            <PageTitle style={[styles.title, styles.center]}>
              {step === 1
                ? "Quên mật khẩu?"
                : step === 2
                  ? "Xác thực mã"
                  : "Đặt lại mật khẩu"}
            </PageTitle>
            <PageSubtitle style={[styles.subtitle, styles.center]}>
              {step === 1
                ? "Nhập email đã đăng ký để nhận mã xác thực."
                : step === 2
                  ? "Nhập mã gồm 6 chữ số đã được gửi đến email của bạn."
                  : "Tạo mật khẩu mới cho tài khoản của bạn."}
            </PageSubtitle>

            {step === 1 ? (
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                outlineColor={palette.border}
                activeOutlineColor={COLORS.primary}
                style={{ backgroundColor: palette.surface }}
              />
            ) : step === 2 ? (
              <TextInput
                label="Mã xác thực"
                placeholder="000000"
                mode="outlined"
                value={code}
                onChangeText={(value) =>
                  setCode(value.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                outlineColor={palette.border}
                activeOutlineColor={COLORS.primary}
                style={{ backgroundColor: palette.surface }}
                contentStyle={styles.otpInput}
              />
            ) : (
              <View style={styles.passwordFields}>
                <TextInput
                  label="Mật khẩu mới"
                  mode="outlined"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  outlineColor={palette.border}
                  activeOutlineColor={COLORS.primary}
                  style={{ backgroundColor: palette.surface }}
                />
                <TextInput
                  label="Xác nhận mật khẩu"
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  outlineColor={palette.border}
                  activeOutlineColor={COLORS.primary}
                  style={{ backgroundColor: palette.surface }}
                />
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => void action()}
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              {actionLabel}
            </Button>
            {step === 2 ? (
              <Button
                mode="text"
                disabled={loading}
                onPress={() => void sendCode()}
              >
                Gửi lại mã
              </Button>
            ) : null}
            <Button mode="text" onPress={() => router.replace("/(auth)/login")}>
              Quay lại đăng nhập
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fill: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    padding: 28,
    borderWidth: 1,
    borderRadius: UI_RADIUS.overlay,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
    marginTop: -8,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  center: { textAlign: "center" },
  title: { fontFamily: "DMSerifDisplay", fontWeight: "400", marginTop: 6 },
  subtitle: { marginTop: 8, marginBottom: 24 },
  otpInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 9,
  },
  passwordFields: { gap: 12 },
  actionButton: { marginTop: 16, borderRadius: UI_RADIUS.control },
  actionButtonContent: { minHeight: 50 },
  actionButtonLabel: { fontWeight: "800" },
});
