import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";
import { GROUP_ROLE, NOTIFICATION_TYPE } from "./constants";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export const getDayFromTime = (time: string, startDate: string) => {
  const t = new Date(time);
  const s = new Date(startDate);

  t.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);

  const diff = t.getTime() - s.getTime();

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

export const formatDDMMYYY = (time: string) => {
  return dayjs(time).format("DD-MM-YYYY");
};

export const formatDDMMYYYHHmm = (time: string) => {
  return dayjs(time).format("DD-MM-YYYY HH:mm");
};

export const formatHHmm = (time: string) => {
  return dayjs(time).format("HH:mm");
};

export const formatYYYYMMDDTHHmm = (time: string) => {
  return dayjs(time).format("YYYY-MM-DDTHH:mm");
};

export const formatMoney = (n: number) =>
  Number(n).toLocaleString("vi-VN") + " đ";

export const formatTime = (time: string) =>
  new Date(time).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

export const formatTimeAgo = (date: string | Date) => {
  if (!date) return "";
  return dayjs(date).fromNow();
};

export const getNameFirstLetterUpper = (name: string | undefined) => {
  if (!name) return "";
  const lastName = name.trim().split(" ").pop();
  return lastName?.charAt(0).toUpperCase() || "";
};

export const getNotificationRedirect = (data: any): string => {
  if (!data.groupId || !data.tripId) return "/";

  const { type, groupId, tripId } = data;

  switch (type) {
    case NOTIFICATION_TYPE.INVITE:
      if (groupId) {
        return `/groups/${groupId}`;
      }
      return "/groups";

    case NOTIFICATION_TYPE.TRIP:
      if (groupId) {
        return `/trips/${tripId}`;
      }
      return "/";

    case NOTIFICATION_TYPE.EXPENSE:
      if (tripId) {
        return `/trips/${tripId}?tab=expenses`;
      }
      return "/";

    case NOTIFICATION_TYPE.TIMELINE:
      if (tripId) {
        return `/trips/${tripId}?tab=timeline`;
      }
      return "/";

    case NOTIFICATION_TYPE.BALANCE:
      if (tripId) {
        return `/trips/${tripId}?tab=balance`;
      }
      return "/";

    case NOTIFICATION_TYPE.MANUAL:
      if (tripId) {
        return `/trips/${tripId}`;
      }
      return "/";

    default:
      return "/";
  }
};

export const getGreeting = () => {
  const hour = new Date().getHours(); // Lấy giờ hiện tại (0-23)
  let greeting;

  if (hour < 12) {
    greeting = "Chào buổi sáng ✨";
  } else if (hour < 18) {
    greeting = "Chào buổi chiều ✨";
  } else {
    greeting = "Chào buổi tối ✨";
  }

  return greeting;
};

export const getTextRole = (role: string) => {
  if (role === GROUP_ROLE.LEADER || role === GROUP_ROLE.OWNER) {
    return "Trưởng nhóm";
  } else if (role === GROUP_ROLE.MEMBER) {
    return "Thành viên";
  } else {
    return "";
  }
};
