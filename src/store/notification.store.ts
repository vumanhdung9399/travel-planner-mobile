import type { Notification } from "@/src/type/notification";
import { create } from "zustand";
import { api } from "../services/api";
import { LIMIT_LOAD_MORE } from "../utils/constants";

interface NotificationStore {
  count: number;
  loading: boolean;
  page: number;
  hasMore: boolean;
  total: number;
  listNotification: Notification[];

  // Actions
  setCount: (count: number | ((prev: number) => number)) => void;
  setListNotification: (
    data: Notification[] | ((prev: Notification[]) => Notification[]),
  ) => void;
  fetchNotifications: (isRefresh?: boolean) => Promise<void>;
  addOneNotification: (data: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  count: 0,
  loading: false,
  page: 1,
  hasMore: true,
  total: 0,
  listNotification: [],
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  setCount: (c) =>
    set((state) => {
      const nextCount = typeof c === "function" ? c(state.count) : c;
      return {
        count: nextCount < 0 ? 0 : nextCount,
      };
    }),

  fetchNotifications: async (isRefresh = false) => {
    const state = get();

    if (state.loading) return;

    const nextPage = isRefresh ? 1 : state.page;

    if (
      !isRefresh &&
      state.listNotification.length >= state.total &&
      state.total !== 0
    ) {
      set({ hasMore: false });
      return;
    }

    set({ loading: true });

    try {
      const res = await api.get(
        `/notifications?page=${nextPage}&limit=${LIMIT_LOAD_MORE}`,
      );

      const newData = res.data.data;
      const totalFromServer = res.data.total;

      set((state) => {
        const updatedData = isRefresh
          ? newData
          : [...state.listNotification, ...newData];

        return {
          listNotification: updatedData,
          count: res.data.unreadTotal ?? 0,
          total: totalFromServer,
          page: nextPage + 1,
          hasMore: updatedData.length < totalFromServer,
          loading: false,
        };
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ loading: false });
    }
  },

  setListNotification: (data) =>
    set((state) => ({
      listNotification:
        typeof data === "function" ? data(state.listNotification) : data,
    })),

  addOneNotification: (newNoti: Notification) =>
    set((state) => ({
      listNotification: [newNoti, ...state.listNotification],
      total: state.total + 1,
      count: state.count + 1,
    })),

  markAsRead: async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);

      set((state) => {
        const updatedList = state.listNotification.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        );

        return {
          listNotification: updatedList,
          count: Math.max(0, state.count - 1),
        };
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch("/notifications/read-all");

      set((state) => ({
        listNotification: state.listNotification.map((n) => ({
          ...n,
          read: true,
        })),
        count: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },
}));
