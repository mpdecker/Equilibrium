import type { Response } from "express";

/** Safe client payload for unexpected server failures (never leak stacks). */
export function sendInternalError(res: Response, err: unknown, requestId?: string): void {
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${requestId ?? "server"}]`, err, stack);

  const body: Record<string, unknown> = {
    error: "Internal server error",
    requestId: requestId ?? null,
  };
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    body.detail = err.message;
  }

  res.status(500).json(body);
}
