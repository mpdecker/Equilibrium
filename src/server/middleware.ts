import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const fromHeader =
    typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"].trim() : "";
  req.requestId = fromHeader.slice(0, 64) || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  if (process.env.SERVER_HTTP_LOG === "1" && req.path?.startsWith?.("/api")) {
    console.log(
      JSON.stringify({
        msg: "http_request",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
      }),
    );
  }
  next();
};

/**
 * When `CORS_ORIGINS` is unset, no CORS headers are added (same-origin / dev through Vite proxy).
 * When set (comma-separated), allow those origins for API + preflight.
 */
export function corsMiddleware(originsEnv: string | undefined): RequestHandler {
  const list = originsEnv?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return (req, res, next) => {
    res.append("Vary", "Origin");
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    if (list.length > 0 && origin && list.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Request-Id, X-Session-Id",
      );
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  };
}

export const generateMusicRateLimiter = rateLimit({
  windowMs: 60_000,
  max: () => {
    const n = Number(process.env.GENERATE_MUSIC_RATE_MAX ?? 40);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const sid =
      typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"].trim() : "";
    if (sid) return `session:${sid.slice(0, 128)}`;
    return ipKeyGenerator(req.ip ?? "0.0.0.0");
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: "Too many generation requests; try again shortly",
      requestId: req.requestId ?? null,
    });
  },
});
