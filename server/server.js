import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration - allow credentials (cookies)
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5009;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Workspaces: http://localhost:${PORT}/api/workspaces`);
  console.log(`   - Projects: http://localhost:${PORT}/api/projects`);
  console.log(`   - Tasks: http://localhost:${PORT}/api/tasks`);
  console.log(`   - Comments: http://localhost:${PORT}/api/comments`);
  console.log(`   - Users: http://localhost:${PORT}/api/users`);
});



