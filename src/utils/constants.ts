// Keep shared color tokens serializable. Native dynamic color objects work in
// core React Native styles, but libraries such as Reanimated and
// expo-linear-gradient expect a processed string/number color value.
const adaptiveColor = (
  light: string,
  _dark: string,
  _androidAttribute: string,
): string => light;

export const categories = [
  { label: "Ăn uống", value: "Ăn uống", icon: "🍜" },
  { label: "Di chuyển", value: "Di chuyển", icon: "🚕" },
  { label: "Mua sắm", value: "Mua sắm", icon: "🛍️" },
  { label: "Khác", value: "Khác", icon: "📦" },
];

export const GROUP_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  TRIP: "trip",
  LEADER: "leader",
};

export const NOTIFICATION_TYPE = {
  EXPENSE: "expense",
  TRIP: "trip",
  TIMELINE: "timeline",
  BALANCE: "balance",
  INVITE: "invite",
  MANUAL: "manual",
};

export const NOTIFICATION_PRIOVITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
};

export const EXPENSE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const LIMIT_LOAD_MORE = 15;

export const ANDROID = "android";
export const IOS = "ios";
export const WEB = "web";

export const COLORS = {
  primaryGradient: ["#1687F8", "#21C7B7"] as const,
  secondaryGradient: ["#21C7B7", "#45D68A"] as const,
  primary: "#1687F8",
  primaryDark: "#0E67C7",
  primaryLight: adaptiveColor("#EAF4FF", "#122D49", "?android:attr/colorBackground"),
  secondary: "#21C7B7",
  accent: "#F4B740",
  coral: "#FF6B5F",
  sand: "#FFF5DF",
  textPrimary: adaptiveColor("#14213D", "#F2F6FC", "?android:attr/textColorPrimary"),
  textSecondary: adaptiveColor("#68758C", "#A9B7CA", "?android:attr/textColorSecondary"),
  textLight: adaptiveColor("#98A2B3", "#8492A6", "?android:attr/textColorTertiary"),
  background: adaptiveColor("#F5F8FC", "#0B1220", "?android:attr/colorBackground"),
  surface: adaptiveColor("#FFFFFF", "#141E2E", "?android:attr/colorBackgroundFloating"),
  surfaceMuted: adaptiveColor("#F8FAFD", "#1B293D", "?android:attr/colorBackground"),
  border: adaptiveColor("#E1E8F2", "#2A384C", "?android:attr/colorControlNormal"),
  success: "#159A6F",
  error: "#E54B4B",
  warning: "#D98B0B",
  info: "#1687F8",
  infoLight: adaptiveColor("#EAF4FF", "#122D49", "?android:attr/colorBackground"),
  successLight: adaptiveColor("#E9F8F1", "#123429", "?android:attr/colorBackground"),
  warningLight: adaptiveColor("#FFF5DD", "#3B2C11", "?android:attr/colorBackground"),
  errorLight: adaptiveColor("#FFF0F0", "#3C1D22", "?android:attr/colorBackground"),
  purpleLight: adaptiveColor("#F0EDFF", "#28223F", "?android:attr/colorBackground"),
  orangeLight: adaptiveColor("#FFF1E8", "#3A2419", "?android:attr/colorBackground"),
} as const;

export const UI_RADIUS = {
  card: 16,
  control: 14,
  overlay: 22,
  sheet: 28,
  pill: 999,
} as const;
