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

let latestGroupRequest = 0;

export const useGroupStore = create<GroupStore>((set, get) => ({
  group: null,
  loading: false,

  fetchGroup: async (id: string) => {
    if (!id) return;

    const requestId = ++latestGroupRequest;
    set((state) => ({
      loading: true,
      group: state.group?.id === id ? state.group : null,
    }));

    try {
      const res = await api.get<Group>(`/groups/${id}`);
      if (requestId === latestGroupRequest) {
        set({ group: res.data });
      }
    } catch (err) {
      console.error("Fetch Group Error:", err);
    } finally {
      if (requestId === latestGroupRequest) {
        set({ loading: false });
      }
    }
  },

  setGroup: (data) =>
    set((state) => ({
      group: typeof data === "function" ? data(state.group) : data,
    })),
}));
