import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { connectDatabase } from "./utils/database";

// Import routes
import authRoutes from "./routes/auth.routes";
import branchRoutes from "./routes/branch.routes";
import bankAccountRoutes from "./routes/bankAccount.routes";
import transactionRoutes from "./routes/transaction.routes";
import transactionCategoryRoutes from "./routes/transactionCategory.routes";
import dailyBalanceRoutes from "./routes/dailyBalance.routes";
import reportRoutes from "./routes/report.routes";

// Import middleware
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP",
    },
  },
});
app.use("/api", limiter);

// Body parsing middleware
app.set('query parser', 'extended');
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging middleware
app.use(morgan("combined"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/bank-accounts", bankAccountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transaction-categories", transactionCategoryRoutes);
app.use("/api/daily-balances", dailyBalanceRoutes);
app.use("/api/reports", reportRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});
// Error handling middleware
app.use(errorHandler);

// Initialize database connection
connectDatabase();

export default app;
