import { isRunningInExpoGo } from "expo";

type NotificationsModule = typeof import("expo-notifications");
let notifications: NotificationsModule | undefined;

/** Expo Go uses in-app toasts; native notification delivery needs our own build. */
export function getNativeNotifications(): NotificationsModule | null {
  if (isRunningInExpoGo()) return null;
  if (!notifications) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require("expo-notifications") as NotificationsModule;
  }
  return notifications;
}
