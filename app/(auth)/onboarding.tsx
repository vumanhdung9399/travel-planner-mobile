import { useAuthStore } from "@/src/store/auth.store";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { Text } from "react-native-paper";

interface Slide {
  key: string;
  title: string;
  text: string;
  image: number;
}

const slides: Slide[] = [
  {
    key: "1",
    title: "Quản lý chi tiêu dễ dàng",
    text: "Theo dõi mọi khoản chi tiêu trong chuyến đi một cách đơn giản và minh bạch. Chia sẻ chi phí với bạn bè chưa bao giờ dễ đến thế.",
    image: require("@/assets/images/onboarding-1.png"),
  },
  {
    key: "2",
    title: "Lịch trình thông minh",
    text: "Lên kế hoạch chi tiết cho từng ngày trong chuyến đi. Đặt thông báo nhắc nhở để không bỏ lỡ bất kỳ hoạt động nào.",
    image: require("@/assets/images/onboarding-2.png"),
  },
  {
    key: "3",
    title: "Cân đối thu chi tự động",
    text: "Kết thúc chuyến đi, hệ thống tự động tính toán ai nợ ai bao nhiêu. Thanh toán dễ dàng qua mã QR.",
    image: require("@/assets/images/onboarding-3.png"),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeFirstTime } = useAuthStore();
  const sliderRef = useRef<AppIntroSlider>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const finish = () => {
    completeFirstTime();
    router.replace("/(auth)/login");
  };

  const renderItem = ({ item }: { item: Slide }) => (
    <LinearGradient
      colors={["#123F35", "#184F42", "#153F35"]}
      locations={[0, 0.56, 1]}
      style={styles.slide}
    >
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientBottom} />

      <View style={styles.imageArea}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.text}</Text>
      </View>
    </LinearGradient>
  );

  const renderButton = (label: string) => (
    <View style={styles.nextButton}>
      <Text style={styles.nextButtonText}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#123F35" />

      {activeIndex < slides.length - 1 ? (
        <TouchableOpacity style={styles.skipButton} onPress={finish}>
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      ) : null}

      <AppIntroSlider
        ref={sliderRef}
        data={slides}
        renderItem={renderItem}
        renderNextButton={() => renderButton("Tiếp theo")}
        renderDoneButton={() => renderButton("Bắt đầu")}
        showSkipButton={false}
        onSlideChange={setActiveIndex}
        onDone={finish}
        activeDotStyle={styles.activeDot}
        dotStyle={styles.dot}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#153F35" },
  slide: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 52,
    paddingBottom: 92,
    justifyContent: "center",
    overflow: "hidden",
  },
  ambientTop: {
    position: "absolute",
    width: 310,
    height: 310,
    top: -190,
    right: -150,
    borderRadius: 155,
    backgroundColor: "rgba(223,243,233,.06)",
  },
  ambientBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    left: -150,
    bottom: -150,
    borderRadius: 130,
    backgroundColor: "rgba(237,118,94,.055)",
  },
  skipButton: {
    position: "absolute",
    zIndex: 10,
    top: 14,
    right: 16,
    minWidth: 72,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: "600" },
  imageArea: {
    height: "49%",
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", maxWidth: 330, height: "100%" },
  copy: { alignItems: "center", paddingHorizontal: 6 },
  title: {
    color: "#FFFFFF",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 37,
    textAlign: "center",
  },
  description: {
    marginTop: 16,
    maxWidth: 350,
    color: "rgba(255,255,255,.67)",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  nextButton: {
    minWidth: 108,
    minHeight: 46,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
    borderRadius: UI_RADIUS.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.08)",
  },
  nextButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,.25)",
  },
  activeDot: {
    width: 20,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
  },
});
