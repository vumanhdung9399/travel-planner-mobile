import {
  PageKicker,
  PageSubtitle,
  PageTitle,
} from "@/src/components/ui/AppTypography";
import { ENV } from "@/src/constants/env";
import { useAppPalette } from "@/src/hook/useAppPalette";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { showSuccess } from "@/src/utils/errorHandler";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Divider, Surface, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const styles = useMemo(() => createStyles(palette.isDark), [palette.isDark]);
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    console.log(ENV.API_URL);

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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <View pointerEvents="none" style={[styles.ambient, styles.ambientMint]} />
      <View
        pointerEvents="none"
        style={[styles.ambient, styles.ambientCoral]}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          automaticallyAdjustKeyboardInsets
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
            <PageKicker>Chào mừng trở lại</PageKicker>
            <PageTitle style={styles.title}>Tiếp tục hành trình.</PageTitle>
            <PageSubtitle style={styles.subtitle}>
              Đăng nhập để mở lại mọi kế hoạch của bạn.
            </PageSubtitle>

            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Email
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Email"
                    placeholder="ban@email.com"
                    mode="outlined"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={Boolean(errors.email)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    outlineColor={palette.border}
                    activeOutlineColor={COLORS.primary}
                    style={[styles.input, { backgroundColor: palette.surface }]}
                    contentStyle={styles.inputContent}
                  />
                )}
              />
              {errors.email ? (
                <Text style={styles.error}>{errors.email.message}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.label, { color: palette.textPrimary }]}>
                  Mật khẩu
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push("/(auth)/forgot-password" as never)
                  }
                >
                  <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Mật khẩu"
                    placeholder="Tối thiểu 8 ký tự"
                    mode="outlined"
                    secureTextEntry={secureText}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={Boolean(errors.password)}
                    autoComplete="current-password"
                    outlineColor={palette.border}
                    activeOutlineColor={COLORS.primary}
                    style={[styles.input, { backgroundColor: palette.surface }]}
                    contentStyle={styles.inputContent}
                    right={
                      <TextInput.Icon
                        accessibilityLabel={
                          secureText ? "Hiện mật khẩu" : "Ẩn mật khẩu"
                        }
                        icon={secureText ? "eye-outline" : "eye-off-outline"}
                        color={palette.textSecondary}
                        onPress={() => setSecureText((value) => !value)}
                      />
                    }
                  />
                )}
              />
              {errors.password ? (
                <Text style={styles.error}>{errors.password.message}</Text>
              ) : null}
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={styles.primaryButton}
              contentStyle={styles.primaryButtonContent}
              labelStyle={styles.primaryButtonLabel}
              loading={loading}
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <View style={styles.dividerRow}>
              <Divider
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <Text style={[styles.dividerLabel, { color: palette.textLight }]}>
                bắt đầu hành trình mới
              </Text>
              <Divider
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
            </View>

            <View style={styles.footerRow}>
              <Text
                style={[styles.footerText, { color: palette.textSecondary }]}
              >
                Chưa có tài khoản?
              </Text>
              <Button
                compact
                mode="text"
                onPress={() => router.push("/(auth)/register")}
                labelStyle={styles.registerLink}
              >
                Đăng ký miễn phí
              </Button>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (darkMode: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, position: "relative", overflow: "hidden" },
    keyboardAvoiding: { flex: 1 },
    container: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingVertical: 28,
    },
    ambient: { position: "absolute", borderRadius: 999 },
    ambientMint: {
      width: 300,
      height: 300,
      top: -130,
      left: -120,
      backgroundColor: darkMode
        ? "rgba(105,199,170,.08)"
        : "rgba(165,218,196,.28)",
    },
    ambientCoral: {
      width: 260,
      height: 260,
      right: -125,
      bottom: -105,
      backgroundColor: darkMode
        ? "rgba(255,146,125,.06)"
        : "rgba(242,200,187,.22)",
    },
    card: {
      width: "100%",
      maxWidth: 390,
      paddingHorizontal: 28,
      paddingTop: 34,
      paddingBottom: 30,
      borderRadius: UI_RADIUS.overlay,
      borderWidth: 1,
    },
    title: { marginTop: 7 },
    subtitle: { marginTop: 6, marginBottom: 24 },
    field: { marginBottom: 15 },
    label: { marginBottom: 7, fontSize: 11.5, fontWeight: "800" },
    passwordLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    forgotLink: {
      marginBottom: 7,
      color: COLORS.primary,
      fontSize: 10.5,
      fontWeight: "700",
    },
    input: { minHeight: 50 },
    inputContent: { paddingVertical: 12, fontSize: 14 },
    error: { marginTop: 5, marginLeft: 3, color: COLORS.error, fontSize: 11 },
    primaryButton: { marginTop: 2, borderRadius: UI_RADIUS.control },
    primaryButtonContent: { minHeight: 50 },
    primaryButtonLabel: { fontSize: 14, fontWeight: "800" },
    dividerRow: {
      marginVertical: 22,
      flexDirection: "row",
      alignItems: "center",
    },
    divider: { flex: 1, height: StyleSheet.hairlineWidth },
    dividerLabel: { marginHorizontal: 10, fontSize: 9.5 },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: { fontSize: 12 },
    registerLink: { color: COLORS.primary, fontSize: 12, fontWeight: "800" },
  });
