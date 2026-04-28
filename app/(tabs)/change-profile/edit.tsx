import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { AvatarPicker } from "@/src/components/profile/AvatarEdit";
import { api } from "@/src/services/api";
import { UserProfile } from "@/src/type/user";
import { COLORS } from "@/src/utils/constants";
import { showSuccess } from "@/src/utils/errorHandler";
import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { useUserStore } from "@store/user.store";
import { profileSchema } from "@utils/validation";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FormValues = {
  name: string;
  phone: string;
  bank: string;
  bankAccNumber: string;
};

export default function EditProfileScreen() {
  const { user, setUser } = useUserStore();
  const [banks, setBanks] = useState<any[]>([]);
  const [openBank, setOpenBank] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      bank: user?.bank || "",
      bankAccNumber: user?.bankAccNumber || "",
    },
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (banks.length && user?.bank) {
      setValue("bank", String(user.bank));
    }
  }, [banks, user?.bank]);

  const fetchBanks = async () => {
    try {
      const res = await fetch("https://api.vietqr.io/v2/banks").then((r) =>
        r.json(),
      );
      setBanks(res.data || []);
    } catch (error) {
      console.error("Failed to fetch banks:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách ngân hàng");
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Quyền bị từ chối",
            "Bạn cần cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingAvatar(true);

        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `avatar_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const res = await api.patch("/users/me/avatar", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setUser({ ...user, avatar: res.data.avatar } as UserProfile);
        showSuccess("Cập nhật ảnh đại diện thành công");
      }
    } catch (error: any) {
      console.error("Error picking/uploading image:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tải ảnh lên. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await api.patch("/users/me", data);

      const dataUser = {
        ...(user as UserProfile),
        name: data.name,
        phone: data.phone,
        bank: data.bank,
        bankAccNumber: data.bankAccNumber,
      };
      setUser(dataUser);
      showSuccess("Sửa thông tin thành công");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const message =
        error?.response?.data?.message ||
        "Cập nhật thất bại. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <CommonHeader title="Chỉnh sửa hồ sơ" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* ScrollView cho form - sẽ bị đẩy lên khi bàn phím hiện */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AvatarPicker
            uri={user?.avatar ?? ""}
            onPickImage={pickImage}
            loading={uploadingAvatar}
          />

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Tên hiển thị"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                placeholder="Nhập tên của bạn"
              />
            )}
          />

          <Input
            label="Email"
            value={user?.email || ""}
            disabled
            placeholder="Email của bạn"
          />

          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                label="Số điện thoại"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.phone?.message}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="bank"
            render={({ field }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.label}>Ngân hàng</Text>
                <TouchableOpacity
                  style={[styles.input, styles.bankSelector]}
                  onPress={() => setOpenBank(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: field.value
                        ? COLORS.textPrimary
                        : COLORS.textLight,
                    }}
                  >
                    {banks.find((b) => String(b.bin) === field.value)
                      ?.shortName || "Chọn ngân hàng"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
                {errors.bank?.message && (
                  <Text style={styles.error}>{errors.bank.message}</Text>
                )}

                <Modal
                  visible={openBank}
                  animationType="slide"
                  onRequestClose={() => setOpenBank(false)}
                >
                  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Danh sách ngân hàng</Text>
                      <TouchableOpacity onPress={() => setOpenBank(false)}>
                        <Text style={styles.closeBtn}>Đóng</Text>
                      </TouchableOpacity>
                    </View>

                    <FlatList
                      data={banks}
                      keyExtractor={(item) => String(item.bin)}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.menuItem,
                            field.value === String(item.bin) &&
                              styles.menuItemActive,
                          ]}
                          onPress={() => {
                            field.onChange(String(item.bin));
                            setOpenBank(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.menuItemText,
                              field.value === String(item.bin) &&
                                styles.menuItemTextActive,
                            ]}
                          >
                            {item.shortName} - {item.name}
                          </Text>
                          {field.value === String(item.bin) && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={COLORS.primary}
                            />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </SafeAreaView>
                </Modal>
              </View>
            )}
          />

          <Controller
            control={control}
            name="bankAccNumber"
            render={({ field }) => (
              <Input
                label="Số tài khoản"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.bankAccNumber?.message}
                placeholder="Nhập số tài khoản ngân hàng"
                keyboardType="numeric"
              />
            )}
          />

          {/* Thêm spacer để tạo khoảng cách trước khi đến button cố định */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Button cố định ở cuối màn hình */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Input({ label, error, disabled, ...props }: any) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        editable={!disabled}
        placeholderTextColor={COLORS.textLight}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
          error && styles.inputError,
        ]}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  inputDisabled: {
    backgroundColor: "#F1F5F9",
    color: COLORS.textSecondary,
  },

  inputError: {
    borderColor: COLORS.error,
  },

  bankSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  btn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  btnDisabled: {
    opacity: 0.6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  error: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: 6,
  },

  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  menuItemActive: {
    backgroundColor: "#F0F0FF",
  },

  menuItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  menuItemTextActive: {
    fontWeight: "600",
    color: COLORS.primary,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  closeBtn: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});
