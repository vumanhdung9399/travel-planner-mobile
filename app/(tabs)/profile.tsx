import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@store/user.store";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { user } = useUserStore();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.card}>
        <View style={styles.center}>
          <Image
            source={
              user.avatar
                ? { uri: user.avatar }
                : require("@/assets/avatar-default.svg")
            }
            style={styles.avatar}
          />

          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <StatItem label="Chuyến đi" value={user.stats?.trips} />
          <StatItem label="Nhóm" value={user.stats?.groups} />
          <StatItem label="Chi phí" value={user.stats?.expenses} />
        </View>

        {/* Actions */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push("/profile/edit")}
          >
            <Text style={styles.btnText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnOutline}>
            <Text>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.card}>
        <MenuItem
          text="Chuyến đi của tôi"
          onPress={() => router.push("/trips")}
        />
        <MenuItem
          text="Thông báo"
          onPress={() => router.push("/notifications")}
        />
        <MenuItem text="Cài đặt" onPress={() => router.push("/settings")} />
        <MenuItem
          text="Đổi mật khẩu"
          onPress={() => router.push("/profile/change-password")}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatItem({ label, value }: any) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value || 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ text, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text>{text}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  name: {
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 16,
  },

  email: {
    color: "#777",
    fontSize: 13,
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontWeight: "bold",
    fontSize: 16,
  },

  statLabel: {
    fontSize: 12,
    color: "#777",
  },

  row: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },

  btnPrimary: {
    flex: 1,
    backgroundColor: "#1976d2",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  logoutBtn: {
    backgroundColor: "#ff4d4f",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
