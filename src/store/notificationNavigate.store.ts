import { useRouter } from "expo-router";
import type { Notification } from "../type/notification";
import { getNotificationRoute } from "../utils/helper";

export const useNotificationNavigate = () => {
  const router = useRouter();

  return (noti: Notification) => {
    const route = getNotificationRoute(noti);

    if (route) {
      router.push(route);
    }
  };
};
