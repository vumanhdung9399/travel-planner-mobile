import { useAuthStore } from "@/src/store/auth.store";
import { ENV } from "@src/constants/env";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { handleApiError } from "../utils/errorHandler";

// Queue item type
interface QueuedRequest {
  resolve: (value: string | null) => void;
  reject: (reason?: any) => void;
}

// Flag để tránh refresh token nhiều lần
let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

// Xử lý queue
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

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach access token
api.interceptors.request.use(
  async (config) => {
    const state = useAuthStore.getState();

    if (!state.hasHydrated) {
      await new Promise((resolve) => {
        const unsub = useAuthStore.subscribe((s) => {
          if (s.hasHydrated) {
            unsub();
            resolve(true);
          }
        });
      });
    }

    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: handle 401 + refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Không phải 401 hoặc đã retry rồi
    if (error.response?.status !== 401 || originalRequest._retry) {
      handleApiError(error);
      return Promise.reject(error);
    }

    // Kiểm tra URL không phải refresh token (tránh loop)
    if (originalRequest.url?.includes("/auth/refresh")) {
      handleApiError(error);
      useAuthStore.getState().logout();
      router.replace("/(auth)/login");
      return Promise.reject(error);
    }

    // Nếu đang refresh, thêm vào queue
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

      // Kiểm tra refresh token tồn tại
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      console.log("[API] Refreshing token...");

      // Gọi API refresh token
      const response = await axios.post(`${ENV.API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token } = response.data;

      if (!access_token) {
        throw new Error("Invalid refresh response");
      }

      // Cập nhật token mới
      useAuthStore.getState().setAuth({
        user: user,
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
      });

      // Xử lý các request đang chờ
      processQueue(null, access_token);

      // Retry request ban đầu
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      console.error("[API] Refresh token failed:", refreshError);

      // Xử lý queue với lỗi
      processQueue(refreshError as AxiosError, null);

      // Logout và chuyển về login
      useAuthStore.getState().logout();
      router.replace("/(auth)/login");

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
