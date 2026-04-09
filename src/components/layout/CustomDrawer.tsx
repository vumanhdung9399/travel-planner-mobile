import { useUserStore } from "@/src/store/user.store";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { router, usePathname } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function CustomDrawer(props: any) {
  const pathname = usePathname();
  const { user } = useUserStore();

  const menu = [
    { label: "Nhóm của tôi", path: "/" },
    { label: "Cá nhân", path: "/profile" },
  ];

  return (
    <DrawerContentScrollView {...props}>
      {/* User */}
      <View style={{ padding: 16, flexDirection: "row", gap: 10 }}>
        <Image
          source={{ uri: user?.avatar ?? "" }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
        <View>
          <Text style={{ fontWeight: "600" }}>{user?.name}</Text>
          <Text style={{ color: "#888", fontSize: 12 }}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={{ padding: 16 }}>
        {menu.map((item) => {
          const isActive = pathname === item.path;

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.path)}
              style={{
                padding: 12,
                borderRadius: 12,
                marginBottom: 8,
                backgroundColor: isActive ? "#eef2ff" : "transparent",
              }}
            >
              <Text
                style={{
                  color: isActive ? "#4f46e5" : "#333",
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </DrawerContentScrollView>
  );
}
