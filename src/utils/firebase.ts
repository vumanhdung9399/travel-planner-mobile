import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { api } from "../services/api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);

export const initFCM = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAP_ID_KEY,
    });

    const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();

    localStorage.setItem("deviceId", deviceId);

    await api.post("/device-token/save-device-token", { token: token, deviceId: deviceId });

    onMessage(messaging, (payload: any) => {
      if (Notification.permission === "granted") {
        new Notification(payload.data?.title || "Thông báo", {
          body: payload.data?.body,
          icon: "src/assets/logo.png",
        });
      }
    });
  } catch (err) {
    console.error("FCM ERROR:", err);
  }
};
