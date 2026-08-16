import { create } from "zustand";

type GroupChatWidgetState = {
  activeGroupId: string | null;
  open: boolean;
  minimized: boolean;
  activateGroup: (groupId: string) => void;
  openChat: (groupId: string) => void;
  closeChat: () => void;
  setMinimized: (minimized: boolean) => void;
};

export const useGroupChatWidgetStore = create<GroupChatWidgetState>((set) => ({
  activeGroupId: null,
  open: false,
  minimized: false,
  activateGroup: (groupId) =>
    set((state) =>
      state.activeGroupId === groupId
        ? state
        : { activeGroupId: groupId, open: false, minimized: false },
    ),
  openChat: (groupId) =>
    set({ activeGroupId: groupId, open: true, minimized: false }),
  closeChat: () => set({ open: false, minimized: false }),
  setMinimized: (minimized) => set({ minimized }),
}));
