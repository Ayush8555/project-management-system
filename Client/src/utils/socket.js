import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5009";

let socket = null;

/**
 * Connect to the Socket.io server.
 * Call this after the user logs in.
 */
function connectSocket() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  // Don't create a new connection if one already exists
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"], // Skip long-polling for faster connection
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected");
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket connection error:", err.message);
  });

  return socket;
}

/**
 * Disconnect the socket.
 * Call this when the user logs out.
 */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance.
 * Returns null if not connected.
 */
function getSocket() {
  return socket;
}

/**
 * Join a room (e.g., "project:abc123" or "task:xyz789")
 */
function joinRoom(room) {
  if (socket) {
    socket.emit("join-room", room);
  }
}

/**
 * Leave a room
 */
function leaveRoom(room) {
  if (socket) {
    socket.emit("leave-room", room);
  }
}

export { connectSocket, disconnectSocket, getSocket, joinRoom, leaveRoom };
