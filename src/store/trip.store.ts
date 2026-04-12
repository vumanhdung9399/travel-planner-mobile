import { create } from "zustand";
import { api } from "../services/api";
import { Trip } from "../type/trip";

interface TripStore {
  loading: boolean;
  trip: Trip;
  setTrip: (data: Trip | ((prev: Trip) => Trip)) => void;
  fetchTrip: (id: string) => Promise<void>;
}

export const useTripStore = create<TripStore>((set, get) => ({
  trip: {} as Trip,
  loading: false,

  fetchTrip: async (id: string) => {
    if (!id || get().loading) return;

    set({ loading: true });

    try {
      const res = await api.get<Trip>(`/trips/${id}`);
      set({ trip: res.data });
    } catch (err) {
      console.error("Fetch Trip Error:", err);
    } finally {
      set({ loading: false });
    }
  },

  setTrip: (data) =>
    set((state) => ({
      trip: typeof data === "function" ? data(state.trip) : data,
    })),
}));
