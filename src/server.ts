import app from "./app";
import { config } from "./config";
import { disconnectDatabase } from "./utils/database";

const server = app.listen(config.port, () => {
  console.log(`
🚀 Server is running on port ${config.port}
📊 Environment: ${config.nodeEnv}
🌐 Health check: http://localhost:${config.port}/health
📚 Database: Connected
  `);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Received SIGINT. Shutting down gracefully...");

  server.close(async () => {
    console.log("✅ HTTP server closed");
    await disconnectDatabase();
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("👋 Received SIGTERM. Shutting down gracefully...");

  server.close(async () => {
    console.log("✅ HTTP server closed");
    await disconnectDatabase();
    process.exit(0);
  });
});

export default server;
