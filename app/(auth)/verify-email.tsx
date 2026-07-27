import { api } from "@/src/services/api";
import { COLORS } from "@/src/utils/constants";
import { showError, showSuccess } from "@/src/utils/errorHandler";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text } from "react-native-paper";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email = "", expiresAt } = useLocalSearchParams<{
    email?: string;
    expiresAt?: string;
  }>();
  const initialExpiry = useMemo(
    () => expiresAt || new Date(Date.now() + 120_000).toISOString(),
    [expiresAt],
  );
  const [code, setCode] = useState("");
  const [expiry, setExpiry] = useState(initialExpiry);
  const [remaining, setRemaining] = useState(120);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const update = () =>
      setRemaining(
        Math.max(0, Math.ceil((Date.parse(expiry) - Date.now()) / 1000)),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiry]);

  const verify = async () => {
    if (!email || code.length !== 6 || remaining === 0) return;
    try {
      setLoading(true);
      await api.post("/auth/email-verification/verify", { email, code });
      showSuccess("Xác thực tài khoản thành công");
      router.replace("/(auth)/login");
    } catch {
      // The API interceptor displays the server message.
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || resending) return;
    try {
      setResending(true);
      const response = await api.post<{ expiresAt: string }>(
        "/auth/email-verification/send",
        { email },
      );
      setExpiry(response.data.expiresAt);
      setCode("");
      showSuccess("Mã xác thực mới đã được gửi");
    } catch {
      showError("Không thể gửi lại mã xác thực");
    } finally {
      setResending(false);
    }
  };

  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <Text variant="headlineMedium" style={styles.title}>
          Xác thực email
        </Text>
        <Text style={styles.subtitle}>Nhập mã 6 chữ số đã gửi tới {email}</Text>
        <TextInput
          autoFocus
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/\D/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          maxLength={6}
          style={styles.code}
          accessibilityLabel="Mã xác thực gồm 6 chữ số"
        />
        <Text style={[styles.timer, remaining === 0 && styles.expired]}>
          {time}
        </Text>
        <TouchableOpacity
          style={[styles.button, (loading || code.length !== 6) && styles.disabled]}
          disabled={loading || code.length !== 6 || remaining === 0}
          onPress={verify}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Xác thực</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity disabled={resending || remaining > 0} onPress={resend}>
          <Text style={styles.resend}>
            {resending ? "Đang gửi..." : "Gửi lại mã"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: "center", padding: 28 },
  title: { textAlign: "center", fontWeight: "700" },
  subtitle: { textAlign: "center", marginTop: 10, color: COLORS.textSecondary },
  code: {
    marginTop: 32,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    color: COLORS.textPrimary,
  },
  timer: { textAlign: "center", marginVertical: 18, fontWeight: "700" },
  expired: { color: COLORS.error },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700" },
  resend: {
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },
});
