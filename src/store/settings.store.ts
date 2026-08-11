import { persistedStorage } from "@/src/utils/persistedStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  notificationsEnabled: boolean;
  darkMode: boolean;
  hasHydrated: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

let markSettingsHydrated: (() => void) | undefined;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      markSettingsHydrated = () => set({ hasHydrated: true });

      return {
        notificationsEnabled: true,
        darkMode: false,
        hasHydrated: false,
        setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
        setDarkMode: (darkMode) => set({ darkMode }),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      };
    },
    {
      name: "travel-planner-settings",
      storage: createJSONStorage(() => persistedStorage),
      partialize: ({ notificationsEnabled, darkMode }) => ({
        notificationsEnabled,
        darkMode,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[Settings] Could not hydrate persisted settings:", error);
        }

        if (state) {
          state.setHasHydrated(true);
          return;
        }

        markSettingsHydrated?.();
      },
    },
  ),
);
