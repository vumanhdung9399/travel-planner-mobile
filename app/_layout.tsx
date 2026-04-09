import { AppToast } from "@/src/components/AppToast";
import CustomDrawer from "@/src/components/layout/CustomDrawer";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: { width: 280 },
        }}
      >
        <Drawer.Screen name="(tabs)" />
      </Drawer>

      <AppToast />
    </GestureHandlerRootView>
  );
}
