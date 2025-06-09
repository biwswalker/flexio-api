declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    PORT: string;
    API_VERSION: string;
    CORS_ORIGIN: string;
    DATABASE_URL: string;
    JWT_SECRET_KEY: string;
    JWT_EXPIRES_IN: string;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX_REQUESTS: string;
    AES_SECRET_KEY: string;
    BCRYPT_SALT_ROUNDS: string;
  }
}
