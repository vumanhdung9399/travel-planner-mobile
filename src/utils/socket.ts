import { io, Socket } from "socket.io-client";
import { ENV } from "../constants/env";

let socket: Socket | null = null;
let socketUserId: string | null = null;
let socketToken: string | null = null;

export const initSocket = (userId: string, token: string) => {
  const authChanged = socketUserId !== userId || socketToken !== token;

  if (!socket) {
    socket = io(ENV.SOCKET_URL, {
      transports: ["websocket"],
      auth: { userId, token },
    });
    socketUserId = userId;
    socketToken = token;
    return socket;
  }

  socket.auth = { userId, token };
  socketUserId = userId;
  socketToken = token;

  if (authChanged && socket.connected) {
    socket.disconnect();
  }
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketUserId = null;
  socketToken = null;
};

export const getSocket = () => socket;
