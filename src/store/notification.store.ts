import type { Notification } from "@/src/type/notification"; // Đảm bảo import đúng type
import { create } from "zustand";
import { api } from "../services/api";

interface NotificationStore {
  count: number;
  loading: boolean;
  listNotification: Notification[];
  setCount: (count: number | ((prev: number) => number)) => void;
  setListNotification: (
    data: Notification[] | ((prev: Notification[]) => Notification[]),
  ) => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  count: 0,
  loading: false,
  listNotification: [],

  setCount: (c) =>
    set((state) => {
      const nextCount = typeof c === "function" ? c(state.count) : c;
      return {
        count: nextCount < 0 ? 0 : nextCount,
      };
    }),
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/notifications");
      set({
        listNotification: res.data.data,
        count: res.data.unreadTotal,
      });
    } finally {
      set({ loading: false });
    }
  },

  setListNotification: (data) =>
    set((state) => ({
      listNotification:
        typeof data === "function" ? data(state.listNotification) : data,
    })),
}));
