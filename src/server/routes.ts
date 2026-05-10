import type { Express, Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import type { GoogleGenAI } from "@google/genai";
import { getDb, getPool, initDb } from "../db/index.js";
import { journals, interactions, sessions, preferenceProfiles } from "../db/schema.js";
import {
  AMBIENT_PARAMS_SCHEMA_VERSION,
  ambientParamsFromClientPayload,
  generateMusicRequestSchema,
  interactionPostSchema,
  journalPostSchema,
  mergeGenerateMusicSessionId,
  normalizeEvolutionSettings,
  parseOptionalSessionIdFromQuery,
  parsePreferencesQuery,
  sessionIdStringSchema,
  sessionUpsertSchema,
  validateFeedbackPrompt,
  validateMusicParams,
  type AmbientParams,
  type ParsedMusicInput,
} from "../lib/music-schema.js";
import { buildGenerateMusicPrompt } from "../lib/prompt.js";
import { safeParseJsonObject } from "../lib/json-utils.js";
import { GEMINI_MUSIC_RESPONSE_SCHEMA } from "../lib/gemini-response-schema.js";
import {
  inferMoodSignalIntentFromText,
  parseMoodSignalIntent,
  realizeAmbientParamsFromIntent,
  buildSoftExplainLine,
  type MoodSignalIntent,
} from "../lib/signal-intent.js";
import {
  isMusicParamsEnvelope,
  toSoundscapeEnvelope,
  unwrapMusicParams,
  unwrapMoodIntent,
  unwrapSessionMeta,
} from "../lib/music-params-envelope.js";
import { buildPreferenceSummaryFromInteractions } from "../lib/preference-summary.js";
import {
  isAudioShadowModeEnabled,
  getServerAudioEnginePreference,
  getServerInstrumentMode,
  resolveEffectiveServerEngine,
} from "../lib/feature-flags.js";
import { computeShadowComparison } from "../lib/audio-shadow.js";
import { sendInternalError } from "./json-error.js";
import { generateMusicRateLimiter } from "./middleware.js";

type DrizzleDb = ReturnType<typeof getDb>;

async function ensureSessionRow(db: DrizzleDb, sessionId: string): Promise<void> {
  await db
    .insert(sessions)
    .values({
      id: sessionId,
      userId: null,
      label: null,
      metadata: null,
      soundscapeEnvelope: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: sessions.id });
}

async function refreshPreferenceProfileForSession(db: DrizzleDb, sessionId: string): Promise<void> {
  await ensureSessionRow(db, sessionId);
  const sess = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
  const rows = await db.query.interactions.findMany({
    where: eq(interactions.sessionId, sessionId),
    limit: 12,
    orderBy: [desc(interactions.createdAt)],
  });
  const preferenceInteractionRows = rows.map((r) => ({
    userResponse: r.userResponse,
    musicParams: r.musicParams,
  }));
  const summary = buildPreferenceSummaryFromInteractions(preferenceInteractionRows);
  await db
    .insert(preferenceProfiles)
    .values({
      sessionId,
      userId: sess?.userId ?? null,
      summaryText: summary,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: preferenceProfiles.sessionId,
      set: {
        summaryText: summary,
        updatedAt: new Date(),
        userId: sess?.userId ?? null,
      },
    });
}

export type AttachRoutesDeps = {
  ai: GoogleGenAI | null;
};

export function attachRoutes(app: Express, deps: AttachRoutesDeps): void {
  app.get("/api/health", async (req: Request, res: Response) => {
    let dbConnected = false;
    const pool = getPool();
    if (pool) {
      try {
        await pool.query("SELECT 1");
        dbConnected = true;
      } catch {
        /* pool may be mid-shutdown or DB unreachable */
      }
    }
    res.json({
      ok: true,
      requestId: req.requestId ?? null,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      dbConnected,
      ambientParamsSchemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
      audioRollout: {
        engine: getServerAudioEnginePreference(),
        effectiveEngine: resolveEffectiveServerEngine(),
        shadowMode: isAudioShadowModeEnabled(),
        instrument: getServerInstrumentMode(),
      },
    });
  });

  app.post("/api/sessions", async (req: Request, res: Response) => {
    try {
      const parsed = sessionUpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid body",
          details: parsed.error.flatten(),
          requestId: req.requestId ?? null,
        });
      }
      const { sessionId, userId, label, soundscapeEnvelope, metadata } = parsed.data;
      const now = new Date();

      if (!process.env.DATABASE_URL) {
        return res.json({
          sessionId,
          userId: userId ?? null,
          label: label ?? null,
          metadata: metadata ?? null,
          soundscapeEnvelope: soundscapeEnvelope ?? null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          persisted: false,
        });
      }

      const db = getDb();
      const insertValues = {
        id: sessionId,
        userId: userId ?? null,
        label: label ?? null,
        metadata: metadata ?? null,
        soundscapeEnvelope: soundscapeEnvelope ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const updateSet: Record<string, unknown> = { updatedAt: now };
      if (userId !== undefined) updateSet.userId = userId;
      if (label !== undefined) updateSet.label = label;
      if (metadata !== undefined) updateSet.metadata = metadata;
      if (soundscapeEnvelope !== undefined) updateSet.soundscapeEnvelope = soundscapeEnvelope;

      await db.insert(sessions).values(insertValues).onConflictDoUpdate({
        target: sessions.id,
        set: updateSet,
      });

      const row = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      });

      res.json({
        sessionId,
        userId: row?.userId ?? null,
        label: row?.label ?? null,
        metadata: row?.metadata ?? null,
        soundscapeEnvelope: row?.soundscapeEnvelope ?? null,
        createdAt: row?.createdAt ?? now,
        updatedAt: row?.updatedAt ?? now,
        persisted: true,
      });
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.get("/api/sessions/:sessionId", async (req: Request, res: Response) => {
    try {
      const sidParsed = sessionIdStringSchema.safeParse(req.params.sessionId);
      if (!sidParsed.success) {
        return res.status(400).json({
          error: "Invalid session id",
          details: sidParsed.error.flatten(),
          requestId: req.requestId ?? null,
        });
      }
      const sessionId = sidParsed.data;

      if (!process.env.DATABASE_URL) {
        return res.json({
          sessionId,
          userId: null,
          label: null,
          metadata: null,
          soundscapeEnvelope: null,
          createdAt: null,
          updatedAt: null,
          persisted: false,
        });
      }

      const db = getDb();
      const row = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      });

      if (!row) {
        return res.json({
          sessionId,
          userId: null,
          label: null,
          metadata: null,
          soundscapeEnvelope: null,
          createdAt: null,
          updatedAt: null,
          persisted: false,
        });
      }

      res.json({
        sessionId,
        userId: row.userId ?? null,
        label: row.label ?? null,
        metadata: row.metadata ?? null,
        soundscapeEnvelope: row.soundscapeEnvelope ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        persisted: true,
      });
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.get("/api/preferences", async (req: Request, res: Response) => {
    try {
      const parsed = parsePreferencesQuery(req.query);
      if (!parsed) {
        return res.status(400).json({
          error: "sessionId query parameter required",
          requestId: req.requestId ?? null,
        });
      }
      const { sessionId } = parsed;

      if (!process.env.DATABASE_URL) {
        return res.json({
          sessionId,
          summary: "",
          schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
          updatedAt: null,
        });
      }

      const db = getDb();
      await ensureSessionRow(db, sessionId);
      let prof = await db.query.preferenceProfiles.findFirst({
        where: eq(preferenceProfiles.sessionId, sessionId),
      });
      if (!prof) {
        await refreshPreferenceProfileForSession(db, sessionId);
        prof = await db.query.preferenceProfiles.findFirst({
          where: eq(preferenceProfiles.sessionId, sessionId),
        });
      }

      res.json({
        sessionId,
        summary: prof?.summaryText ?? "",
        schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
        updatedAt: prof?.updatedAt ?? null,
      });
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.get("/api/journals", async (req: Request, res: Response) => {
    try {
      if (!process.env.DATABASE_URL) return res.json([]);
      const db = getDb();
      const sessionIdFilter = parseOptionalSessionIdFromQuery(req.query);
      const entries = await db.query.journals.findMany({
        ...(sessionIdFilter ? { where: eq(journals.sessionId, sessionIdFilter) } : {}),
        orderBy: [desc(journals.createdAt)],
      });
      res.json(entries);
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.post("/api/journals", async (req: Request, res: Response) => {
    try {
      const parsed = journalPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid body",
          details: parsed.error.flatten(),
          requestId: req.requestId ?? null,
        });
      }
      const { content, sessionId: bodySessionId, moodText, clientMutationId } = parsed.data;

      if (!process.env.DATABASE_URL) {
        return res.json({
          id: 1,
          content,
          sessionId: bodySessionId ?? null,
          moodText: moodText ?? null,
          clientMutationId: clientMutationId ?? null,
          createdAt: new Date(),
        });
      }
      const db = getDb();
      if (bodySessionId) {
        await ensureSessionRow(db, bodySessionId);
      }
      if (clientMutationId) {
        const dedup = await db.query.journals.findFirst({
          where: eq(journals.clientMutationId, clientMutationId),
        });
        if (dedup) {
          res.json(dedup);
          return;
        }
      }
      const result = await db
        .insert(journals)
        .values({
          content,
          sessionId: bodySessionId ?? null,
          moodText: moodText ?? null,
          clientMutationId: clientMutationId ?? null,
        })
        .returning();
      res.json(result[0]);
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.get("/api/interactions", async (req: Request, res: Response) => {
    try {
      if (!process.env.DATABASE_URL) return res.json([]);
      const db = getDb();
      const sessionIdFilter = parseOptionalSessionIdFromQuery(req.query);
      const entries = await db.query.interactions.findMany({
        ...(sessionIdFilter ? { where: eq(interactions.sessionId, sessionIdFilter) } : {}),
        orderBy: [desc(interactions.createdAt)],
      });
      res.json(entries);
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.post("/api/interactions", async (req: Request, res: Response) => {
    try {
      const parsed = interactionPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid body",
          details: parsed.error.flatten(),
          requestId: req.requestId ?? null,
        });
      }

      const {
        musicParams: rawParams,
        userResponse,
        moodSignalIntent,
        sessionId: bodySessionId,
        moodText,
        schemaVersion,
        clientEngine,
        clientMutationId,
      } = parsed.data;

      let envelopeParams: AmbientParams;
      if (isMusicParamsEnvelope(rawParams)) {
        envelopeParams = unwrapMusicParams(rawParams);
      } else if (rawParams && typeof rawParams === "object" && !Array.isArray(rawParams)) {
        envelopeParams = ambientParamsFromClientPayload(rawParams as Record<string, unknown>);
      } else {
        envelopeParams = ambientParamsFromClientPayload({});
      }

      const intentFromBody =
        moodSignalIntent && typeof moodSignalIntent === "object"
          ? parseMoodSignalIntent(moodSignalIntent)
          : undefined;

      const intentFromEnvelope =
        isMusicParamsEnvelope(rawParams) ? unwrapMoodIntent(rawParams) : undefined;

      const resolvedIntent = intentFromBody ?? intentFromEnvelope;
      const meta = unwrapSessionMeta(rawParams);
      const envelope = toSoundscapeEnvelope({
        params: envelopeParams,
        moodSignalIntent: resolvedIntent,
        sessionId: bodySessionId ?? meta.sessionId,
      });

      if (!process.env.DATABASE_URL) {
        return res.json({
          id: 1,
          musicParams: envelope,
          userResponse,
          sessionId: bodySessionId ?? meta.sessionId ?? null,
          moodText: moodText ?? null,
          schemaVersion: schemaVersion ?? AMBIENT_PARAMS_SCHEMA_VERSION,
          clientEngine: clientEngine ?? null,
          clientMutationId: clientMutationId ?? null,
          createdAt: new Date(),
        });
      }

      const db = getDb();
      const resolvedSessionId = bodySessionId ?? meta.sessionId ?? null;
      if (resolvedSessionId) {
        await ensureSessionRow(db, resolvedSessionId);
      }
      if (clientMutationId) {
        const dedup = await db.query.interactions.findFirst({
          where: eq(interactions.clientMutationId, clientMutationId),
        });
        if (dedup) {
          res.json(dedup);
          return;
        }
      }
      const result = await db
        .insert(interactions)
        .values({
          musicParams: envelope,
          userResponse,
          sessionId: bodySessionId ?? meta.sessionId ?? null,
          moodText: moodText ?? null,
          moodSignalIntent: resolvedIntent ?? null,
          schemaVersion: schemaVersion ?? AMBIENT_PARAMS_SCHEMA_VERSION,
          clientEngine: clientEngine ?? null,
          clientMutationId: clientMutationId ?? null,
        })
        .returning();
      const inserted = result[0]!;
      if (inserted.sessionId) {
        await refreshPreferenceProfileForSession(db, inserted.sessionId);
      }
      res.json(inserted);
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.post("/api/generate-music", generateMusicRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsedBody = generateMusicRequestSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsedBody.error.flatten(),
          requestId: req.requestId ?? null,
        });
      }

      const { mood, currentParams: rawCurrent, settings: rawSettings, sessionId: clientSessionId } =
        parsedBody.data;
      const headerSessionId =
        typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : undefined;
      const effectiveSessionId = mergeGenerateMusicSessionId(clientSessionId, headerSessionId);

      const settings = normalizeEvolutionSettings(rawSettings);
      const currentParams = ambientParamsFromClientPayload(rawCurrent);

      let recentJournals: { content: string }[] = [];
      let recentInteractions: { userResponse: string; musicParams: unknown }[] = [];
      let preferenceInteractionRows: { userResponse: string; musicParams: unknown }[] = [];

      if (process.env.DATABASE_URL) {
        try {
          const db = getDb();
          const journalWhere = effectiveSessionId
            ? eq(journals.sessionId, effectiveSessionId)
            : undefined;
          recentJournals = await db.query.journals.findMany({
            ...(journalWhere ? { where: journalWhere } : {}),
            limit: 5,
            orderBy: [desc(journals.createdAt)],
          });
          const interactionWhere = effectiveSessionId
            ? eq(interactions.sessionId, effectiveSessionId)
            : undefined;
          const rows = await db.query.interactions.findMany({
            ...(interactionWhere ? { where: interactionWhere } : {}),
            limit: 12,
            orderBy: [desc(interactions.createdAt)],
          });
          preferenceInteractionRows = rows.map((r) => ({
            userResponse: r.userResponse,
            musicParams: r.musicParams,
          }));
          recentInteractions = preferenceInteractionRows.slice(0, 5);
        } catch {
          /* DB optional during dev */
        }
      }

      const preferenceSummary = buildPreferenceSummaryFromInteractions(preferenceInteractionRows);

      const prompt = buildGenerateMusicPrompt({
        mood,
        recentJournals,
        recentInteractions,
        preferenceSummary,
        settings,
        currentParams,
      });

      if (!deps.ai) {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured",
          requestId: req.requestId ?? null,
        });
      }

      const response = await deps.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_MUSIC_RESPONSE_SCHEMA,
        },
      });

      const responseText = response.text ?? "";
      const obj = safeParseJsonObject(responseText);
      let validParams = validateMusicParams(obj as ParsedMusicInput);

      let moodSignalIntent: MoodSignalIntent =
        parseMoodSignalIntent(obj.moodSignalIntent) ??
        inferMoodSignalIntentFromText(mood);

      validParams = realizeAmbientParamsFromIntent(moodSignalIntent, validParams);

      const feedbackPrompt = validateFeedbackPrompt(obj as ParsedMusicInput);

      const envelope = toSoundscapeEnvelope({
        params: validParams,
        moodSignalIntent,
        sessionId: effectiveSessionId,
      });

      const payload: Record<string, unknown> = {
        envelope,
        params: validParams,
        moodSignalIntent,
        feedbackPrompt,
        explainLine: buildSoftExplainLine(moodSignalIntent, validParams),
        schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
      };

      if (isAudioShadowModeEnabled()) {
        payload.shadow = computeShadowComparison(validParams);
      }

      res.json(payload);
    } catch (error) {
      sendInternalError(res, error, req.requestId);
    }
  });

  app.get("/api/audio-rollout", (req: Request, res: Response) => {
    res.json({
      engine: getServerAudioEnginePreference(),
      effectiveEngine: resolveEffectiveServerEngine(),
      shadowMode: isAudioShadowModeEnabled(),
      schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
      instrument: getServerInstrumentMode(),
    });
  });
}

/** Boot DB migrations (idempotent). Mirrors legacy server startup logging. */
export async function bootstrapServerData(): Promise<void> {
  try {
    await initDb();
    if (process.env.DATABASE_URL) {
      console.log("Database initialized");
    }
  } catch (err) {
    console.error("Failed to initialize database (is DATABASE_URL set?):", err);
  }
}
