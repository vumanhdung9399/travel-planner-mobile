import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { persistedStorage } from "@/src/utils/persistedStorage";

interface FavoriteTripsState {
  byUser: Record<string, string[]>;
  toggle: (userId: string, tripId: string) => void;
}

export const useFavoriteTripsStore = create<FavoriteTripsState>()(persist(
  (set) => ({
    byUser: {},
    toggle: (userId, tripId) => set((state) => {
      const current = state.byUser[userId] || [];
      return { byUser: { ...state.byUser, [userId]: current.includes(tripId)
        ? current.filter((id) => id !== tripId) : [...current, tripId] } };
    }),
  }),
  { name: "travel-planner-favorite-trips", storage: createJSONStorage(() => persistedStorage) },
));
