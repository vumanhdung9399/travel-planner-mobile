import { useAuthStore } from "@/src/store/auth.store";
import { COLORS } from "@/src/utils/constants";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Image,
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
  image: any; // Sử dụng require() cho ảnh local
  backgroundColor: string;
}

const slides: Slide[] = [
  {
    key: "1",
    title: "Quản lý chi tiêu\ndễ dàng",
    text: "Theo dõi mọi khoản chi tiêu trong chuyến đi một cách đơn giản và minh bạch. Chia sẻ chi phí với bạn bè chưa bao giờ dễ đến thế.",
    image: require("@/assets/images/onboarding-1.png"),
    backgroundColor: "#fff",
  },
  {
    key: "2",
    title: "Lịch trình\nthông minh",
    text: "Lên kế hoạch chi tiết cho từng ngày trong chuyến đi. Đặt thông báo nhắc nhở để không bỏ lỡ bất kỳ hoạt động nào.",
    image: require("@/assets/images/onboarding-2.png"),
    backgroundColor: "#fff",
  },
  {
    key: "3",
    title: "Cân đối thu chi\ntự động",
    text: "Kết thúc chuyến đi, hệ thống tự động tính toán ai nợ ai bao nhiêu. Thanh toán dễ dàng qua mã QR.",
    image: require("@/assets/images/onboarding-3.png"),
    backgroundColor: "#fff",
  },
];

const OnboardingScreen = () => {
  const router = useRouter();
  const { completeFirstTime } = useAuthStore();
  const sliderRef = useRef<AppIntroSlider>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleDone = async () => {
    completeFirstTime();
    router.replace("/(auth)/login");
  };

  const handleSkip = async () => {
    completeFirstTime();
    router.replace("/(auth)/login");
  };

  const renderItem = ({ item }: { item: Slide }) => {
    return (
      <View style={styles.slide}>
        {/* Background Decorations */}
        <View style={styles.bgDecorTop}>
          <LinearGradient
            colors={COLORS.primaryGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bgCircle1}
          />
          <LinearGradient
            colors={[COLORS.primaryGradient[1], COLORS.primaryGradient[0]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bgCircle2}
          />
        </View>

        <View style={styles.bgDecorBottom}>
          <LinearGradient
            colors={COLORS.primaryGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bgCircle3}
          />
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.imageWrapper}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const renderNextButton = () => (
    <View style={styles.buttonContainer}>
      <LinearGradient
        colors={COLORS.primaryGradient as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.nextButton}
      >
        <Text style={styles.nextButtonText}>Tiếp theo</Text>
      </LinearGradient>
    </View>
  );

  const renderDoneButton = () => (
    <View style={styles.buttonContainer}>
      <LinearGradient
        colors={COLORS.primaryGradient as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.doneButton}
      >
        <Text style={styles.doneButtonText}>Bắt đầu</Text>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Skip button */}
      {activeIndex < slides.length - 1 && (
        <TouchableOpacity
          style={styles.skipButtonContainer}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      )}

      <AppIntroSlider
        ref={sliderRef}
        data={slides}
        renderItem={renderItem}
        renderNextButton={renderNextButton}
        renderDoneButton={renderDoneButton}
        showSkipButton={false}
        onSlideChange={(index) => setActiveIndex(index)}
        onDone={handleDone}
        bottomButton
        activeDotStyle={styles.activeDotStyle}
        dotStyle={styles.dotStyle}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  // Background decorations
  bgDecorTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 250,
    height: 250,
  },
  bgCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.06,
  },
  bgCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.04,
    top: 60,
    left: 40,
  },
  bgDecorBottom: {
    position: "absolute",
    bottom: 150,
    left: -60,
    width: 200,
    height: 200,
  },
  bgCircle3: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.04,
  },
  // Skip button
  skipButtonContainer: {
    position: "absolute",
    top: 40,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.primaryGradient[1],
  },
  // Illustration
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    width: "100%",
  },
  imageWrapper: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  // Content
  contentContainer: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 38,
  },
  text: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  // Buttons
  buttonContainer: {
    marginBottom: 16,
    paddingHorizontal: 24,
    width: "100%",
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // Dots
  dotStyle: {
    backgroundColor: COLORS.border,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDotStyle: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 8,
    borderRadius: 4,
  },
});

export default OnboardingScreen;
