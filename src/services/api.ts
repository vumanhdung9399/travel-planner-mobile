import { useAuthStore } from "@/src/store/auth.store";
import { ENV } from "@src/constants/env";
import axios from "axios";
import { router } from "expo-router";
import { handleApiError } from "../utils/errorHandler";

export const api = axios.create({
  baseURL: ENV.API_URL,
});

// 👉 REQUEST: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 👉 RESPONSE: handle 401 + refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // 🔁 refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        const res = await axios.post(`${ENV.API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = res.data;

        useAuthStore.getState().setAuth({
          ...useAuthStore.getState(),
          accessToken: access_token,
        });

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (err) {
        useAuthStore.getState().logout();
        router.replace("/(auth)/login");
      }
    }

    // 🎯 handle error global
    handleApiError(error);

    return Promise.reject(error);
  },
);
