import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ActionSheet({ open, onClose, actions }: any) {
  return (
    <Modal transparent visible={open} animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.drag} />

        {actions.map((item: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={() => {
              item.onPress();
              onClose();
            }}
          >
            <Text style={{ color: item.color || "#000" }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },

  drag: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginVertical: 8,
    borderRadius: 2,
  },

  item: {
    padding: 16,
    alignItems: "center",
  },
});
