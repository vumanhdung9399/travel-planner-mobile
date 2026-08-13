import { useAuthStore } from "@/src/store/auth.store";
import { ENV } from "@src/constants/env";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { handleApiError } from "../utils/errorHandler";
import { cacheKey, isOfflineCacheable, readOfflineCache, writeOfflineCache } from './offline-cache';
import NetInfo from '@react-native-community/netinfo';
import { enqueueMutation, flushMutationQueue, isQueueableMutation } from './offline-queue';

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
    if (config.method?.toLowerCase() === 'post' && /\/expenses\/[^/]+$/.test(config.url || '') && config.data && !(config.data instanceof FormData)) {
      config.data = { ...config.data, clientMutationId: config.data.clientMutationId || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    if (isOfflineCacheable(response.config.method, response.config.url)) {
      const key = cacheKey(useAuthStore.getState().user?.id, response.config.url || '', response.config.params);
      void writeOfflineCache(key, { data: response.data, cachedAt: new Date().toISOString(), url: response.config.url || '' });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _offlineReplay?: boolean;
    };

    if (!error.response && isQueueableMutation(originalRequest) && !originalRequest?._offlineReplay) {
      const queued = await enqueueMutation(originalRequest);
      return { data: { ...(typeof queued.data === 'object' ? queued.data : {}), id: `offline-${queued.id}`, pendingSync: true }, status: 202, statusText: 'Queued offline', headers: { 'x-offline-queued': 'true' }, config: originalRequest, request: null };
    }

    if (!error.response && isOfflineCacheable(originalRequest?.method, originalRequest?.url)) {
      const key = cacheKey(useAuthStore.getState().user?.id, originalRequest.url || '', originalRequest.params);
      const cached = await readOfflineCache(key);
      if (cached) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (offline cache)',
          headers: { 'x-offline-cache': 'true', 'x-offline-cached-at': cached.cachedAt },
          config: originalRequest,
          request: null,
        };
      }
    }

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

    const {
      accessToken: refreshAccessToken,
      refreshToken,
      user,
    } = useAuthStore.getState();

    try {
      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      const response = await axios.post(`${ENV.API_URL}/auth/refresh`, {
        refreshToken: refreshToken,
      });

      if (!response.data.accessToken) {
        throw new Error("Invalid refresh response");
      }

      const currentAuth = useAuthStore.getState();
      if (
        currentAuth.accessToken !== refreshAccessToken ||
        currentAuth.refreshToken !== refreshToken
      ) {
        const sessionChangedError = new AxiosError(
          "Auth session changed during token refresh",
          "ERR_CANCELED",
        );
        processQueue(sessionChangedError, null);
        return Promise.reject(sessionChangedError);
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

      const currentAuth = useAuthStore.getState();
      if (
        currentAuth.accessToken === refreshAccessToken &&
        currentAuth.refreshToken === refreshToken
      ) {
        currentAuth.logout();
        navigateToLogin();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

let mutationFlush: Promise<{ completed: number; pending: number }> | null = null;
NetInfo.addEventListener((state) => {
  if (!state.isConnected || state.isInternetReachable === false) return;
  if (mutationFlush) return;
  mutationFlush = flushMutationQueue((item) => api({ method: item.method, url: item.url, data: item.data, _offlineReplay: true } as InternalAxiosRequestConfig & { _offlineReplay: boolean }));
  void mutationFlush.catch(() => ({ completed: 0, pending: 0 })).finally(() => { mutationFlush = null; });
});
