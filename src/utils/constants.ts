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
  primaryGradient: ["#153F35", "#2D6557"] as const,
  secondaryGradient: ["#ED765E", "#E5A33D"] as const,
  primary: "#176B59",
  primaryDark: "#0F5144",
  primaryLight: adaptiveColor("#DFF3E9", "#173B33", "?android:attr/colorBackground"),
  secondary: "#ED765E",
  accent: "#E5A33D",
  coral: "#ED765E",
  sand: "#FFF2D8",
  textPrimary: adaptiveColor("#18332E", "#F3F7F4", "?android:attr/textColorPrimary"),
  textSecondary: adaptiveColor("#687B76", "#A9BAB4", "?android:attr/textColorSecondary"),
  textLight: adaptiveColor("#9BA9A5", "#7E938C", "?android:attr/textColorTertiary"),
  background: adaptiveColor("#FBFAF6", "#0C1714", "?android:attr/colorBackground"),
  surface: adaptiveColor("#FFFFFF", "#14231F", "?android:attr/colorBackgroundFloating"),
  surfaceMuted: adaptiveColor("#F2F5F1", "#101D19", "?android:attr/colorBackground"),
  border: adaptiveColor("#DFE7E3", "#294139", "?android:attr/colorControlNormal"),
  success: "#176B59",
  error: "#D95F4C",
  warning: "#E5A33D",
  info: "#28718F",
  infoLight: adaptiveColor("#E4F2F8", "#142E36", "?android:attr/colorBackground"),
  successLight: adaptiveColor("#DFF3E9", "#173B33", "?android:attr/colorBackground"),
  warningLight: adaptiveColor("#FFF2D8", "#3B2C11", "?android:attr/colorBackground"),
  errorLight: adaptiveColor("#FEE8DF", "#3C1D22", "?android:attr/colorBackground"),
  purpleLight: adaptiveColor("#EEEAFB", "#28223F", "?android:attr/colorBackground"),
  orangeLight: adaptiveColor("#FFF0E8", "#3A2419", "?android:attr/colorBackground"),
} as const;

export const UI_RADIUS = {
  card: 12,
  control: 10,
  overlay: 14,
  sheet: 18,
  pill: 999,
} as const;

export const APP_TYPOGRAPHY = {
  serif: "serif",
  pageTitleSize: 31,
  sectionTitleSize: 18,
  kickerSize: 10,
} as const;
