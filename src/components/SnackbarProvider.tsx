import React, { createContext, useContext, useState } from "react";
import { Snackbar } from "react-native-paper";

type SnackbarType = "success" | "error";

const SnackbarContext = createContext<any>(null);

export const SnackbarProvider = ({ children }: { children: any }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<SnackbarType>("success");

  const show = (msg: string, t: SnackbarType = "success") => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  };

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={2000}
        style={{
          backgroundColor: type === "error" ? "#ef4444" : "#22c55e",
        }}
      >
        {message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => useContext(SnackbarContext);
