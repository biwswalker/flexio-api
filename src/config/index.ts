import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL!,
  bcryptRounds: process.env.BCRYPT_SALT_ROUNDS || 10,
  jwt: {
    secret: process.env.JWT_SECRET_KEY!,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  },
  aes: {
    secret: process.env.AES_SECRET_KEY
  }
};
