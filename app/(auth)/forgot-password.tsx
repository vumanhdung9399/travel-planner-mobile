import { api } from "@services/api";
import { handleApiError, showError, showSuccess } from "@/src/utils/errorHandler";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton, Text, TextInput } from "react-native-paper";

export default function ForgotPasswordScreen() {
  const palette = useAppPalette();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return showError("Email không hợp lệ");
    try {
      setLoading(true);
      await api.post("/auth/password/forgot", { email });
      setStep(2);
      showSuccess("Nếu email tồn tại, mã xác thực đã được gửi");
    } catch (error) { handleApiError(error); }
    finally { setLoading(false); }
  };

  const reset = async () => {
    if (password.length < 8) return showError("Mật khẩu có tối thiểu 8 ký tự");
    if (password !== confirmPassword) return showError("Mật khẩu xác nhận không khớp");
    try {
      setLoading(true);
      await api.post("/auth/password/reset", { resetToken, newPassword: password });
      showSuccess("Đặt lại mật khẩu thành công");
      router.replace("/(auth)/login");
    } catch (error) { handleApiError(error); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) return showError("Mã xác thực phải gồm 6 chữ số");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/password/verify-code", { email, code });
      setResetToken(data.resetToken);
      setStep(3);
      showSuccess("Xác thực mã thành công");
    } catch (error) { handleApiError(error); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.isDark ? palette.background : "#EDF7FF" }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card style={[styles.card, { backgroundColor: palette.surface }]}>
            <Card.Content>
              <IconButton icon="arrow-left" onPress={() => step === 3 ? setStep(2) : step === 2 ? setStep(1) : router.back()} />
              <View style={styles.hero}>
                <View style={styles.icon}><IconButton icon="lock-reset" size={34} iconColor="#1687F8" /></View>
                <Text style={styles.step}>Bước {step}/3</Text>
                <Text variant="headlineMedium" style={styles.title}>{step === 1 ? "Quên mật khẩu?" : step === 2 ? "Xác thực mã" : "Đặt lại mật khẩu"}</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{step === 1 ? "Nhập email đã đăng ký để nhận mã xác thực." : step === 2 ? `Mã gồm 6 chữ số đã được gửi đến ${email}` : "Tạo mật khẩu mới cho tài khoản của bạn."}</Text>
              </View>
              {step === 1 ? (
                <TextInput mode="outlined" label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              ) : step === 2 ? <>
                <View style={styles.otpRow}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TextInput key={index} mode="outlined" value={code[index] || ""} onChangeText={(value) => {
                      const digits = code.padEnd(6, " ").split("");
                      digits[index] = value.replace(/\D/g, "").slice(-1) || " ";
                      setCode(digits.join("").trimEnd());
                    }} keyboardType="number-pad" maxLength={1} style={styles.otpInput} contentStyle={styles.otpContent} />
                  ))}
                </View>
                <Text style={[styles.resendTimer, { color: palette.textSecondary }]}>Gửi lại mã sau <Text style={styles.timer}>00:42</Text></Text>
              </> : <>
                <TextInput mode="outlined" label="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry={secure} right={<TextInput.Icon icon={secure ? "eye-off" : "eye"} onPress={() => setSecure(!secure)} />} style={styles.input} />
                <Text style={[styles.hint, { color: palette.textSecondary }]}>Tối thiểu 8 ký tự</Text>
                <TextInput mode="outlined" label="Xác nhận mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={secure} style={styles.input} />
              </>}
              <Button mode="contained" loading={loading} disabled={loading} onPress={step === 1 ? sendCode : step === 2 ? verifyCode : reset} style={styles.primary}>{step === 1 ? "Gửi mã xác thực" : step === 2 ? "Xác thực mã" : "Đặt lại mật khẩu"}</Button>
              {step === 2 && <Button disabled={loading} onPress={sendCode}>Gửi lại mã</Button>}
              <Button onPress={() => router.replace("/(auth)/login")}>Quay lại đăng nhập</Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, container: { flexGrow: 1, justifyContent: "center", padding: 16 },
  card: { borderRadius: 28, shadowColor: "#2D4E6E", shadowOpacity: .13, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 5 }, hero: { alignItems: "center", marginBottom: 24 },
  icon: { width: 84, height: 84, borderRadius: 24, backgroundColor: "#EAF5FF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  step: { color: "#1687F8", fontWeight: "700", marginBottom: 6 }, title: { fontWeight: "800", textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 8, lineHeight: 21 }, input: { marginBottom: 12 }, hint: { fontSize: 12, marginTop: -7, marginBottom: 10 },
  primary: { marginTop: 20, borderRadius: 14, paddingVertical: 6 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  otpInput: { width: 47, height: 58, backgroundColor: "transparent" },
  otpContent: { textAlign: "center", fontSize: 20, fontWeight: "700", paddingHorizontal: 0 },
  resendTimer: { textAlign: "center", marginBottom: 20 },
  timer: { color: "#1687F8", fontWeight: "700" },
});
