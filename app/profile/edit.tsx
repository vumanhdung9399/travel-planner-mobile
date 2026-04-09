import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { AvatarPicker } from "@/src/components/profile/AvatarEdit";
import { api } from "@/src/services/api";
import { UserProfile } from "@/src/type/user";
import { showSuccess } from "@/src/utils/errorHandler";
import { yupResolver } from "@hookform/resolvers/yup";
import { useUserStore } from "@store/user.store";
import { profileSchema } from "@utils/validation";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name,
      phone: user?.phone,
      bank: "",
      bankAccNumber: user?.bankAccNumber,
    },
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (banks.length && user) {
      setValue("bank", String(user.bank));
    }
  }, [banks]);

  const fetchBanks = async () => {
    const res = await fetch("https://api.vietqr.io/v2/banks").then((r) =>
      r.json(),
    );
    setBanks(res.data);
  };

  /* ---------------- AVATAR ---------------- */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: result.assets[0].fileName,
        type: "image/jpeg",
      } as any);

      const res = await api.patch("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser({ ...user, avatar: res.data.avatar } as UserProfile);
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (data: FormValues) => {
    await api.patch("/users/me", data);
    await new Promise((r) => setTimeout(r, 1000));
    const dataUser = {
      ...(user as UserProfile),
      name: data.name,
      phone: data.phone,
      bank: data.bank,
      bankAccNumber: data.bankAccNumber,
    };
    setUser(dataUser);
    showSuccess("Sửa thông tin thành công");
  };

  return (
    <View style={{ flex: 1 }}>
      <CommonHeader title="Chỉnh sửa hồ sơ" />
      <View style={styles.container}>
        {/* Avatar */}
        <AvatarPicker uri={user?.avatar ?? ""} onPickImage={pickImage} />

        {/* Form */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Tên"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Input label="Email" value={user?.email} disabled />

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label="Số điện thoại"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="bank"
          render={({ field }) => (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Ngân hàng</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setOpenBank(true)}
              >
                <Text style={{ color: field.value ? "#000" : "#999" }}>
                  {banks.find((b) => String(b.bin) === field.value)
                    ?.shortName || "Chọn ngân hàng"}
                </Text>
              </TouchableOpacity>
              <Modal
                visible={openBank}
                animationType="slide"
                onRequestClose={() => setOpenBank(false)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Danh sách ngân hàng</Text>
                    <TouchableOpacity onPress={() => setOpenBank(false)}>
                      <Text style={styles.closeBtn}>Đóng</Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={banks}
                    keyExtractor={(item) => item.bin}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          field.onChange(String(item.bin));
                          setOpenBank(false);
                        }}
                      >
                        <Text
                          style={{
                            fontWeight:
                              field.value === String(item.bin)
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {item.shortName} - {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
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
            />
          )}
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={styles.btnText}>
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------------- COMPONENT ---------------- */

function Input({ label, error, disabled, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        editable={!disabled}
        style={[styles.input, disabled && { backgroundColor: "#f5f5f5" }]}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/* ---------------- STYLE ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  label: { marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
  },

  btn: {
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: { color: "#fff", fontWeight: "bold" },

  error: { color: "red", fontSize: 12 },

  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 16,
  },
});
