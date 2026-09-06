import { MaterialIcons } from "@expo/vector-icons";
import { View } from "react-native";
import type { TimelineType } from "@/src/type/trip";

const visuals = {
  transportation: { icon: "directions-car", background: "#E6F2FA", color: "#3D86B8" },
  accommodation: { icon: "hotel", background: "#EEE8FA", color: "#7B61B9" },
  dining: { icon: "restaurant", background: "#FBECDD", color: "#C66A32" },
  sightseeing: { icon: "place", background: "#DFF3EA", color: "#218468" },
  activity: { icon: "local-activity", background: "#FBE5EA", color: "#C8526A" },
  shopping: { icon: "shopping-bag", background: "#F4E7F5", color: "#A44F9F" },
  rest: { icon: "coffee", background: "#E8F0EC", color: "#5B7D6F" },
  other: { icon: "push-pin", background: "#ECEFF1", color: "#65747B" },
} as const;

export default function TimelineTypeIcon({ type, size = 26 }: { type?: TimelineType; size?: number }) {
  const visual = visuals[type || "other"] || visuals.other;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: visual.background, alignItems: "center", justifyContent: "center" }}>
    <MaterialIcons name={visual.icon} size={16} color={visual.color} />
  </View>;
}
