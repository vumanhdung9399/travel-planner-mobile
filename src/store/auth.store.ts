import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { disconnectSocket } from "../utils/socket";
import { useUserStore } from "./user.store";

type AuthState = {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isFirstTime: boolean;
  hasHydrated: boolean;

  setAuth: (data: {
    user: any;
    accessToken: string | null;
    refreshToken: string | null;
  }) => void;

  completeFirstTime: () => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
};

const secureStorage = {
  getItem: async (name: string) => {
    try {
      if (Platform.OS === "web") return await AsyncStorage.getItem(name);
      return await SecureStore.getItemAsync(name);
    } catch (e) {
      console.warn("[SecureStore] getItem error:", e);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.setItem(name, value);
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.warn("[SecureStore] setItem error:", e);
      try {
        const parsed = JSON.parse(value);
        const minimal = JSON.stringify({
          state: {
            accessToken: parsed.state?.accessToken,
            refreshToken: parsed.state?.refreshToken,
            isFirstTime: parsed.state?.isFirstTime,
            user: parsed.state?.user
              ? {
                  id: parsed.state.user.id,
                  name: parsed.state.user.name,
                  email: parsed.state.user.email,
                  avatar: parsed.state.user.avatar,
                }
              : null,
          },
          version: parsed.version,
        });
        await SecureStore.setItemAsync(name, minimal);
      } catch (e2) {
        console.error("[SecureStore] fallback setItem also failed:", e2);
      }
    }
  },
  removeItem: async (name: string) => {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(name);
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.warn("[SecureStore] removeItem error:", e);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isFirstTime: true,
      hasHydrated: false,

      setHasHydrated: (state) => set({ hasHydrated: state }),

      setAuth: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
          isFirstTime: false,
        }),

      completeFirstTime: () => set({ isFirstTime: false }),

      logout: () => {
        disconnectSocket();
        useUserStore.getState().clearUser();
        set({ user: null, accessToken: null, refreshToken: null });

        try {
          const { useNotificationStore } = require("./notification.store");
          useNotificationStore.getState().reset();
        } catch (e) {
          console.warn("[AuthStore] Could not reset notification store:", e);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[AuthStore] rehydrate error:", error);
        }
        if (state) {
          state.setHasHydrated(true);
        } else {
          useAuthStore.setState({ hasHydrated: true });
        }
      },
    },
  ),
);
