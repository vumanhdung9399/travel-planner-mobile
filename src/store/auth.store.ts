import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useNotificationStore } from "./notification.store";

type AuthState = {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;

  setAuth: (data: {
    user: any;
    accessToken: string | null;
    refreshToken: string | null;
  }) => void;

  logout: () => void;
};

// 👇 custom storage dùng SecureStore
const secureStorage = {
  getItem: async (name: string) => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),

      logout: () => {
        (set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
          useNotificationStore.getState().reset());
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
