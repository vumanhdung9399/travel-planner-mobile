import type { Group } from "@/src/type/group";
import { create } from "zustand";
import { api } from "../services/api";

interface GroupStore {
  loading: boolean;
  group: Group | null;
  setGroup: (
    data: Group | null | ((prev: Group | null) => Group | null),
  ) => void;
  fetchGroup: (id: string) => Promise<void>;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  group: null,
  loading: false,

  fetchGroup: async (id: string) => {
    if (!id || get().loading) return;

    set({ loading: true });

    try {
      const res = await api.get<Group>(`/groups/${id}`);
      set({ group: res.data });
    } catch (err) {
      console.error("Fetch Group Error:", err);
    } finally {
      set({ loading: false });
    }
  },

  setGroup: (data) =>
    set((state) => ({
      group: typeof data === "function" ? data(state.group) : data,
    })),
}));
