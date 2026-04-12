export const categories = [
  { label: "Ăn uống", value: "Ăn uống", icon: "🍜" },
  { label: "Di chuyển", value: "Di chuyển", icon: "🚕" },
  { label: "Khách sạn", value: "Khách sạn", icon: "🏨" },
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
  primaryGradient: ["#6366f1", "#8b5cf6"] as const,

  secondaryGradient: ["#22d3ee", "#4ade80"] as const,

  primary: "#4F46E5",
  secondary: "#10B981",
  accent: "#F59E0B",

  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textLight: "#94A3B8",

  background: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E2E8F0",

  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
} as const;
