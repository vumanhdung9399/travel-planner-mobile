import { useRouter } from "expo-router";
import type { Notification } from "../type/notification";
import { getNotificationRedirect } from "../utils/helper";

export const useNotificationNavigate = () => {
  const router = useRouter();

  return (noti: Notification) => {
    const route = getNotificationRedirect(noti);

    if (route) {
      router.push(route as any);
    }
  };
};
