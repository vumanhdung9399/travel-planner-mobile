import { showSuccess } from "@/src/utils/errorHandler";
import { yupResolver } from "@hookform/resolvers/yup";
import { api } from "@services/api";
import { useAuthStore } from "@store/auth.store";
import { router } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
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

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Logo */}
          <Avatar.Image
            size={64}
            source={require("../../assets/logo.png")}
            style={{ alignSelf: "center", marginBottom: 16 }}
          />

          {/* Title */}
          <Text variant="headlineMedium" style={styles.title}>
            Travel Planner
          </Text>

          <Text style={styles.subtitle}>Plan your journey ✈️</Text>

          {/* Email */}
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
              />
            )}
          />
          {errors.email && (
            <Text style={styles.error}>{errors.email.message}</Text>
          )}

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                mode="outlined"
                secureTextEntry={secureText}
                value={value}
                onChangeText={onChange}
                style={styles.input}
                error={!!errors.password}
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

          {/* Login */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Login
          </Button>

          <Divider style={{ marginVertical: 20 }} />

          {/* Register */}
          <Button mode="outlined" onPress={() => router.push("/register")}>
            Create Account
          </Button>

          <Text style={styles.footer}>New to Travel Planner?</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 10,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#777",
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 6,
  },
  footer: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
  },
  error: {
    color: "red",
    marginBottom: 5,
    fontSize: 12,
  },
});
