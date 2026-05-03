import { useAuthStore } from "@/src/store/auth.store";
import { ENV } from "@src/constants/env";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { handleApiError } from "../utils/errorHandler";

interface QueuedRequest {
  resolve: (value: string | null) => void;
  reject: (reason?: any) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const navigateToLogin = () => {
  setTimeout(() => {
    router.replace("/(auth)/login");
  }, 100);
};

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const state = useAuthStore.getState();

    if (!state.hasHydrated) {
      await Promise.race([
        new Promise<void>((resolve) => {
          const unsub = useAuthStore.subscribe((s) => {
            if (s.hasHydrated) {
              unsub();
              resolve();
            }
          });
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
    }

    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401) {
      handleApiError(error);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().logout();
      navigateToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken, user } = useAuthStore.getState();

      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      const response = await axios.post(`${ENV.API_URL}/auth/refresh`, {
        refreshToken: refreshToken,
      });

      if (!response.data.accessToken) {
        throw new Error("Invalid refresh response");
      }

      useAuthStore.getState().setAuth({
        user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken || refreshToken,
      });

      processQueue(null, response.data.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      console.error("[API] Refresh token failed:", refreshError);
      processQueue(refreshError as AxiosError, null);

      useAuthStore.getState().logout();
      navigateToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
