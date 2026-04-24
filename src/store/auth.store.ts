import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { disconnectSocket } from "../utils/socket";
import { useNotificationStore } from "./notification.store";

type AuthState = {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isFirstTime: boolean;

  setAuth: (data: {
    user: any;
    accessToken: string | null;
    refreshToken: string | null;
  }) => void;

  completeFirstTime: () => void;
  logout: () => void;
};

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
      isFirstTime: true,

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
        set({ user: null, accessToken: null, refreshToken: null });
        useNotificationStore.getState().reset();
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {},
    },
  ),
);
