import { showSuccess } from "@/src/utils/errorHandler";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { yupResolver } from "@hookform/resolvers/yup";
import { api } from "@services/api";
import { useAuthStore } from "@store/auth.store";
import { router } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  Divider,
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

  const screenBackground = palette.isDark ? palette.background : "#1687F8";

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
                Đăng nhập
              </Text>

              <Text
                style={[styles.subtitle, { color: palette.textSecondary }]}
              >
                Tiếp tục hành trình của bạn ✈️
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

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>

              <Divider
                style={{ marginVertical: 20, backgroundColor: palette.border }}
              />

              <Button
                mode="outlined"
                onPress={() => router.push("/register")}
              >
                Tạo tài khoản
              </Button>

              <Text
                style={[styles.footer, { color: palette.textSecondary }]}
              >
                Chưa có tài khoản Travel Planner?
              </Text>
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
    padding: 16,
  },
  card: {
    borderRadius: 14,
    paddingVertical: 10,
  },
  logo: { alignSelf: "center", marginBottom: 16 },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 6,
  },
  footer: {
    textAlign: "center",
    marginTop: 10,
  },
  error: {
    color: "red",
    marginBottom: 5,
    fontSize: 12,
  },
});
