import { io, Socket } from "socket.io-client";
import { ENV } from "../constants/env";

let socket: Socket | null = null;

export const initSocket = (userId: string, token: string) => {
  if (socket) return socket;

  socket = io(ENV.SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      userId: userId,
      token: token,
    },
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
