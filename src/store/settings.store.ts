import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  notificationsEnabled: boolean;
  darkMode: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      darkMode: false,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDarkMode: (darkMode) => set({ darkMode }),
    }),
    {
      name: "travel-planner-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
