import { useNavigation } from "@react-navigation/native";
import type { Notification } from "../type/notification";
import { getNotificationRoute } from "../utils/helper";

export const useNotificationNavigate = () => {
  const navigation = useNavigation<any>();

  return (noti: Notification) => {
    const route = getNotificationRoute(noti);

    if (route.screen) {
      navigation.navigate(route.screen, route.params);
    }
  };
};
