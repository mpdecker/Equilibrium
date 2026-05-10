import "dotenv/config";
import { createApp } from "./src/server/app.js";
import { closeDb } from "./src/db/index.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function startServer() {
  try {
    const app = await createApp();
    const server = app.listen(PORT, HOST, () => {
      const hostHint = HOST === "0.0.0.0" ? "localhost" : HOST;
      console.log(`Server running on http://${hostHint}:${PORT}`);
    });
    const shutdown = async (signal: string) => {
      console.warn(`${signal} received, shutting down`);
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await closeDb();
      process.exit(0);
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    await closeDb();
    process.exit(1);
  }
}

void startServer();
