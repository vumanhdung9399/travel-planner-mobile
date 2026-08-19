import { handleApiError, showSuccess } from "@/src/utils/errorHandler";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { yupResolver } from "@hookform/resolvers/yup";
import { api } from "@services/api";
import { useAuthStore } from "@store/auth.store";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  Text,
  TextInput,
} from "react-native-paper";
import * as yup from "yup";

type LoginForm = {
  email: string;
  password: string;
};

const schema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Nhập email"),
  password: yup.string().min(8, "Tối thiểu 8 ký tự").required("Nhập mật khẩu"),
});

export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const palette = useAppPalette();

  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleClientId = Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  const isGoogleAuthConfigured = Boolean(googleClientId);

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    // expo-auth-session throws while rendering when the platform client ID is
    // missing. Keep the password login usable and disable Google auth until the
    // matching EXPO_PUBLIC_GOOGLE_*_CLIENT_ID is configured.
    clientId: googleClientId || "google-auth-not-configured",
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (googleResponse?.type !== "success") return;
    const idToken =
      googleResponse.params?.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      handleApiError({ response: { data: { message: "Google không trả về ID token" } } });
      return;
    }
    setGoogleLoading(true);
    api.post("/auth/google", { idToken })
      .then(({ data }) => {
        setAuth({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
        showSuccess("Đăng nhập với Google thành công");
        router.replace("/(tabs)");
      })
      .catch(handleApiError)
      .finally(() => setGoogleLoading(false));
  }, [googleResponse, setAuth]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", data);

      const { access_token, refresh_token, user } = res.data;

      setAuth({
        user,
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      showSuccess("Đăng nhập thành công");

      router.replace("/(tabs)");
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const screenBackground = palette.isDark ? palette.background : "#F3F7FB";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: screenBackground }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ backgroundColor: screenBackground }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
        >
          <Card style={[styles.card, { backgroundColor: palette.surface }]}>
            <Card.Content>
              <Avatar.Image
                size={64}
                source={require("../../assets/logo.png")}
                style={styles.logo}
              />

              <Text variant="headlineMedium" style={styles.title}>
                Chào mừng trở lại
              </Text>

              <Text
                style={[styles.subtitle, { color: palette.textSecondary }]}
              >
                Tiếp tục hành trình của bạn
              </Text>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Email"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    style={styles.input}
                    error={!!errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardAppearance={palette.isDark ? "dark" : "light"}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.error}>{errors.email.message}</Text>
              )}

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Mật khẩu"
                    mode="outlined"
                    secureTextEntry={secureText}
                    value={value}
                    onChangeText={onChange}
                    style={styles.input}
                    error={!!errors.password}
                    autoComplete="current-password"
                    keyboardAppearance={palette.isDark ? "dark" : "light"}
                    right={
                      <TextInput.Icon
                        icon={secureText ? "eye-off" : "eye"}
                        onPress={() => setSecureText(!secureText)}
                      />
                    }
                  />
                )}
              />
              {errors.password && (
                <Text style={styles.error}>{errors.password.message}</Text>
              )}

              <View style={styles.forgotRow}>
                <Button compact onPress={() => router.push("/(auth)/forgot-password")}>Quên mật khẩu?</Button>
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
                <Text style={[styles.orText, { color: palette.textSecondary }]}>hoặc tiếp tục với</Text>
                <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
              </View>

              <Button
                mode="outlined"
                icon="google"
                onPress={() => {
                  if (isGoogleAuthConfigured) void promptGoogle();
                }}
                loading={googleLoading}
                disabled={
                  !isGoogleAuthConfigured ||
                  !googleRequest ||
                  googleLoading ||
                  loading
                }
                style={styles.googleButton}
              >
                Tiếp tục với Google
              </Button>

              <View style={styles.registerRow}>
                <Text style={{ color: palette.textSecondary }}>Chưa có tài khoản?</Text>
                <Button compact onPress={() => router.push("/register")} labelStyle={styles.registerLabel}>Đăng ký</Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    borderRadius: 28,
    paddingVertical: 18,
    shadowColor: "#2D4E6E",
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  logo: { alignSelf: "center", marginBottom: 16 },
  title: {
    textAlign: "center",
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 26,
  },
  input: {
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  button: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 6,
  },
  error: {
    color: "red",
    marginBottom: 5,
    fontSize: 12,
  },
  forgotRow: { alignItems: "flex-end", marginTop: -12 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  dividerLine: { height: StyleSheet.hairlineWidth, flex: 1 },
  orText: { textAlign: "center", fontSize: 13 },
  googleButton: { borderRadius: 14, marginBottom: 16, paddingVertical: 4 },
  registerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  registerLabel: { color: "#1687F8", fontWeight: "800" },
});
