import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import type { GoogleGenAI } from "@google/genai";
import { bootstrapServerData, attachRoutes } from "../server/routes.js";
import { requestIdMiddleware } from "../server/middleware.js";
import { AMBIENT_PARAMS_SCHEMA_VERSION } from "../lib/music-schema.js";

const stubPayload = {
  baseFrequency: 180,
  chordIntervals: [0, 7, 12],
  filterCutoffMax: 1200,
  lfoSpeed: 0.12,
  reverbWet: 0.7,
  volume: -12,
  droneVolume: -14,
  padVolume: -14,
  arpVolume: -12,
  bellVolume: -10,
  subVolume: -14,
  colorPalette: ["#111111", "#222222", "#333333"],
  oscillatorType: "sine",
  harmonicity: 2,
  modulationIndex: 2,
  noiseAmount: 0.15,
  noiseType: "pink",
  delayTime: "4n",
  delayFeedback: 0.35,
  complexity: 0.55,
  attackTime: 3,
  releaseTime: 7,
  reverbDecay: 6,
  chorusDepth: 0.45,
  phaserFrequency: 0.6,
  moodSignalIntent: {
    arousal: 0.8,
    valence: 0.35,
    tension: 0.85,
    cognitiveLoad: 0.7,
    grounding: 0.35,
  },
  feedbackPrompt: {
    question: "How is this resonance?",
    options: ["Softer", "Hold steady", "More lift"],
  },
};

function mockGemini(): GoogleGenAI {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify(stubPayload),
      }),
    },
  } as unknown as GoogleGenAI;
}

async function createTestApiApp(ai: GoogleGenAI | null) {
  await bootstrapServerData();
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "512kb" }));
  attachRoutes(app, { ai });
  return app;
}

describe("HTTP API (attachRoutes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.AUDIO_ENGINE;
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.AUDIO_SHADOW_MODE;
    delete process.env.INSTRUMENT_MODE;
  });

  it("GET /api/health returns probe fields", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.requestId).toBeDefined();
    expect(res.headers["x-request-id"]).toBe(res.body.requestId);
    expect(res.body.ambientParamsSchemaVersion).toBe(AMBIENT_PARAMS_SCHEMA_VERSION);
    expect(res.body.audioRollout?.effectiveEngine).toBeDefined();
    expect(res.body.audioRollout?.instrument).toBe("auto");
  });

  it("POST /api/generate-music validates mood body", async () => {
    const app = await createTestApiApp(mockGemini());
    const res = await request(app).post("/api/generate-music").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/generate-music returns params and moodSignalIntent", async () => {
    const app = await createTestApiApp(mockGemini());
    const res = await request(app)
      .post("/api/generate-music")
      .send({ mood: "feeling stressed", currentParams: {}, settings: {} });
    expect(res.status).toBe(200);
    expect(res.body.params).toBeDefined();
    expect(res.body.envelope).toBeDefined();
    expect(res.body.envelope.envelopeVersion).toBe(2);
    expect(res.body.envelope.sessionId).toBeDefined();
    expect(res.body.explainLine).toBeDefined();
    expect(res.body.params.baseFrequency).toBeGreaterThanOrEqual(40);
    expect(res.body.moodSignalIntent).toBeDefined();
    expect(res.body.moodSignalIntent.tension).toBeGreaterThan(0.5);
    expect(res.body.feedbackPrompt.options).toHaveLength(3);
    expect(res.body.schemaVersion).toBe(AMBIENT_PARAMS_SCHEMA_VERSION);
  });

  it("POST /api/generate-music returns 503 without AI client", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app)
      .post("/api/generate-music")
      .send({ mood: "calm", settings: {} });
    expect(res.status).toBe(503);
  });

  it("POST /api/interactions wraps envelope", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app)
      .post("/api/interactions")
      .send({
        musicParams: { baseFrequency: 100 },
        userResponse: "nice",
        moodSignalIntent: {
          arousal: 0.5,
          valence: 0.5,
          tension: 0.5,
          cognitiveLoad: 0.5,
          grounding: 0.5,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.musicParams.envelopeVersion).toBe(2);
    expect(res.body.musicParams.schemaVersion).toBe(AMBIENT_PARAMS_SCHEMA_VERSION);
    expect(res.body.musicParams.sessionId).toBeDefined();
    expect(res.body.musicParams.params.baseFrequency).toBeDefined();
  });

  it("POST /api/generate-music includes shadow payload when enabled", async () => {
    process.env.AUDIO_SHADOW_MODE = "true";
    const app = await createTestApiApp(mockGemini());
    const res = await request(app)
      .post("/api/generate-music")
      .send({ mood: "calm", settings: {} });
    expect(res.status).toBe(200);
    expect(res.body.shadow).toBeDefined();
    expect(res.body.shadow.withinTolerance).toBe(true);
    delete process.env.AUDIO_SHADOW_MODE;
  });

  it("GET /api/audio-rollout exposes flags", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/audio-rollout");
    expect(res.status).toBe(200);
    expect(res.body.engine).toBeDefined();
    expect(res.body.effectiveEngine).toBe("tone");
    expect(res.body.instrument).toBe("auto");
  });

  it("GET /api/audio-rollout reflects INSTRUMENT_MODE=stage", async () => {
    process.env.INSTRUMENT_MODE = "stage";
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/audio-rollout");
    expect(res.status).toBe(200);
    expect(res.body.instrument).toBe("stage");
    delete process.env.INSTRUMENT_MODE;
  });

  it("GET /api/audio-rollout reflects INSTRUMENT_MODE=form", async () => {
    process.env.INSTRUMENT_MODE = "form";
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/audio-rollout");
    expect(res.status).toBe(200);
    expect(res.body.instrument).toBe("form");
    delete process.env.INSTRUMENT_MODE;
  });

  it("GET /api/audio-rollout treats invalid INSTRUMENT_MODE as auto", async () => {
    process.env.INSTRUMENT_MODE = "bogus";
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/audio-rollout");
    expect(res.status).toBe(200);
    expect(res.body.instrument).toBe("auto");
    delete process.env.INSTRUMENT_MODE;
  });

  it("GET /api/audio-rollout reflects AUDIO_ENGINE=wasm", async () => {
    process.env.AUDIO_ENGINE = "wasm";
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/audio-rollout");
    expect(res.status).toBe(200);
    expect(res.body.engine).toBe("wasm");
    expect(res.body.effectiveEngine).toBe("wasm");
    expect(res.body.instrument).toBe("auto");
    delete process.env.AUDIO_ENGINE;
  });

  it("POST /api/sessions echoes without database", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app)
      .post("/api/sessions")
      .send({ sessionId: "sessionsess12", label: "test" });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("sessionsess12");
    expect(res.body.label).toBe("test");
    expect(res.body.persisted).toBe(false);
  });

  it("POST /api/sessions validates session id length", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).post("/api/sessions").send({ sessionId: "short" });
    expect(res.status).toBe(400);
  });

  it("GET /api/sessions/:sessionId returns persisted false without database", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/sessions/sessionsess12");
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("sessionsess12");
    expect(res.body.persisted).toBe(false);
  });

  it("GET /api/sessions/:sessionId rejects invalid id", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/sessions/x");
    expect(res.status).toBe(400);
  });

  it("GET /api/preferences requires sessionId query", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/preferences");
    expect(res.status).toBe(400);
  });

  it("GET /api/preferences returns empty summary without database", async () => {
    const app = await createTestApiApp(null);
    const res = await request(app).get("/api/preferences").query({ sessionId: "sessionsess12" });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("sessionsess12");
    expect(res.body.summary).toBe("");
    expect(res.body.updatedAt).toBeNull();
  });

  it("POST /api/generate-music uses X-Session-Id when body omits sessionId", async () => {
    const app = await createTestApiApp(mockGemini());
    const res = await request(app)
      .post("/api/generate-music")
      .set("X-Session-Id", "sessionsession1")
      .send({ mood: "calm", settings: {} });
    expect(res.status).toBe(200);
    expect(res.body.envelope.sessionId).toBe("sessionsession1");
  });
});
