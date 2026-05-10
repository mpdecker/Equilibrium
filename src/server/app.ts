import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { bootstrapServerData, attachRoutes } from "./routes.js";
import { corsMiddleware, requestIdMiddleware } from "./middleware.js";

export async function createApp(): Promise<express.Application> {
  await bootstrapServerData();

  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(corsMiddleware(process.env.CORS_ORIGINS));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "512kb" }));

  const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

  attachRoutes(app, { ai });

  const enableViteMiddleware =
    process.env.NODE_ENV !== "production" && process.env.VITEST !== "true";

  if (enableViteMiddleware) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}
