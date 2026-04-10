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
  setCount: (count: number | ((prev: number) => number)) => void;
  setListNotification: (
    data: Notification[] | ((prev: Notification[]) => Notification[]),
  ) => void;
  fetchNotifications: (isRefresh?: boolean) => Promise<void>;
  addOneNotification: (data: Notification) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  count: 0,
  loading: false,
  page: 1,
  hasMore: true,
  total: 0,
  listNotification: [],

  setCount: (c) =>
    set((state) => {
      const nextCount = typeof c === "function" ? c(state.count) : c;
      return {
        count: nextCount < 0 ? 0 : nextCount,
      };
    }),
  fetchNotifications: async (isRefresh = false) => {
    if (get().loading) return;

    const nextPage = isRefresh ? 1 : get().page;
    if (
      !isRefresh &&
      get().listNotification.length >= get().total &&
      get().total !== 0
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
          listNotification: isRefresh
            ? newData
            : [...state.listNotification, ...newData],
          count: res.data.unreadTotal,
          total: totalFromServer,
          page: nextPage + 1,
          hasMore: updatedData.length < totalFromServer,
        };
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

  addOneNotification: (newNoti: Notification) =>
    set((state) => ({
      listNotification: [newNoti, ...state.listNotification],
      count: state.count + 1,
    })),
}));
