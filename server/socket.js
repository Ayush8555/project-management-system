import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Store the io instance so route files can emit events
let io = null;

/**
 * Setup Socket.io on the HTTP server.
 * - Authenticates users via JWT token
 * - Manages rooms for projects and tasks
 */
function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "https://project-management-system-two-mu.vercel.app",
        "https://project-management-system-cwxlv9zvi-ayush8555s-projects.vercel.app",
      ],
      credentials: true,
    },
  });

  // Authenticate every socket connection using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("No token provided"));
    }

    try {
      const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      console.warn('Socket JWT Verification Error:', error.message);
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.userId}`);

    // Join a room (e.g., "project:abc123" or "task:xyz789")
    socket.on("join-room", (room) => {
      socket.join(room);
    });

    // Leave a room
    socket.on("leave-room", (room) => {
      socket.leave(room);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

/**
 * Get the Socket.io instance.
 * Route files call this to emit events.
 */
function getIO() {
  return io;
}

export { setupSocket, getIO };
