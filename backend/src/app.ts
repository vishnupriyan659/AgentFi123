import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import compression from "compression";
import crypto from "crypto";
import agentRoutes from "./routes/agentRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import intentRoutes from "./routes/intentRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";
import copilotRoutes from "./routes/copilotRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== "production";
const app = express();

// 1. Stricter Rate Limiter for Authentication Endpoints (e.g., /api/auth/*)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 20, // 20 requests per 15 min in prod, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication requests, please try again later.",
    retryAfter: "Please try again later"
  }
});

// 2. Stricter Rate Limiter for Transaction & Intent Execution Endpoints (e.g., /api/intents/*, /api/transactions/*)
export const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 300 : 60, // 60 write/execution requests per 15 min in prod, 300 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many intent or transaction requests, please try again later.",
    retryAfter: "Please try again later"
  }
});

// 3. General API Limiter with Polling Support
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 1000, // 1000 requests per 15 min in prod, 5000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    retryAfter: "Please try again later"
  },
  skip: (req: Request) => {
    if (!isDevelopment) return false;
    const url = req.originalUrl || req.url || req.path;
    return (
      url === "/" ||
      url.includes("/health") ||
      url.includes("/agents/state") ||
      url.includes("/agents/activity") ||
      url.includes("/metrics")
    );
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(generalApiLimiter);
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
  credentials: true
}));
app.use(express.json());

// Request IDs
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

app.use(morgan("dev"));

// Routes
app.use("/api/agents", agentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/intents", transactionLimiter, intentRoutes);
app.use("/api/transfers", transactionLimiter, transferRoutes);
app.use("/api/transactions", transactionLimiter, transactionRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/demo", transactionLimiter, demoRoutes);
app.use("/api/copilot", generalApiLimiter, copilotRoutes);
app.use("/api/market", generalApiLimiter, marketRoutes);

// Root Endpoints
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "AgentFi Backend",
    status: "online",
    health: "/api/health"
  });
});

app.get("/api", (_req: Request, res: Response) => {
  res.json({
    service: "AgentFi Backend API",
    status: "online",
    health: "/api/health"
  });
});

// Health Endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "agentfi-backend",
    timestamp: new Date().toISOString(),
    version: "1.0",
    uptime: process.uptime()
  });
});

// Metrics Endpoint
app.get("/api/metrics", (req: Request, res: Response) => {
  res.json({
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime()
  });
});

// Central Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Central Error:", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      status: err.status || 500
    }
  });
});

export default app;
