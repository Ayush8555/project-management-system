import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";
import prisma from "./configs/prisma.js";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import userRoutes from "./routes/users.js";
import searchRoutes from "./routes/search.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();

// Trust proxy — required for rate limiting behind Render/Vercel reverse proxy
app.set('trust proxy', 1);

// Gzip compression — reduces response size by 60-80%
app.use(compression());

/**
 * Response time logging middleware — tracks slow endpoints for monitoring.
 * Logs any request that takes longer than 1 second.
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ SLOW: ${req.method} ${req.originalUrl} — ${duration}ms`);
    }
  });
  next();
});

/**
 * ETag support — enables conditional responses.
 * When client sends If-None-Match header matching the ETag,
 * Express returns 304 Not Modified (zero body transfer).
 */
app.set('etag', 'weak');

/**
 * Rate limiting — 500 requests per minute per IP.
 * 
 * WHY 500/min (not 200/15min):
 * A single page load triggers 2-4 API calls.
 * A user clicking around for 1 minute easily hits 20-30 requests.
 * 200/15min = 13/min — even a SINGLE active user gets rate-limited.
 * With 20 users sharing an IP (office), they'd be blocked instantly.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints (10 per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "https://project-management-system-two-mu.vercel.app",
  "https://project-management-system-cwxlv9zvi-ayush8555s-projects.vercel.app"
];  

// CORS configuration - allow credentials (cookies)
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/**
 * Cache-Control middleware for GET API responses.
 * Tells browsers/CDNs to not cache API responses (private),
 * but allows conditional revalidation via ETag.
 */
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, no-cache, must-revalidate');
  }
  next();
});

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Global error handler — catches unhandled errors instead of crashing
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5009;

// Pre-warm the Prisma connection pool on startup
prisma.$connect().then(() => {
  console.log('✅ Database connection pool established');
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
}).catch((err) => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});

export default app;
