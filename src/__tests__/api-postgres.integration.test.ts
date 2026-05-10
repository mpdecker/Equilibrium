import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { attachRoutes, bootstrapServerData } from "../server/routes.js";
import { closeDb } from "../db/index.js";
import { requestIdMiddleware } from "../server/middleware.js";
import { ambientParamsFromClientPayload, defaultParams } from "../lib/music-schema.js";

const run = Boolean(process.env.CI === "true" && process.env.DATABASE_URL);

describe.skipIf(!run)("Postgres-backed HTTP API (integration)", () => {
  beforeAll(async () => {
    await bootstrapServerData();
  });

  afterAll(async () => {
    await closeDb();
  });

  async function api(): Promise<express.Application> {
    const app = express();
    app.use(requestIdMiddleware);
    app.use(express.json({ limit: "512kb" }));
    attachRoutes(app, { ai: null });
    return app;
  }

  it("POST /api/journals persists optional session metadata", async () => {
    const app = await api();
    const token = `entry-${Date.now()}`;
    const res = await request(app)
      .post("/api/journals")
      .send({
        content: `hello ${token}`,
        moodText: `hello ${token}`,
        sessionId: "sessionsessionci1",
      });
    expect(res.status).toBe(200);
    expect(res.body.content).toContain(token);
    expect(res.body.sessionId).toBe("sessionsessionci1");

    const listed = await request(app).get("/api/journals");
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body)).toBe(true);
    expect(listed.body.some((j: { content: string }) => j.content.includes(token))).toBe(true);
  });

  it("POST /api/interactions stores metadata columns", async () => {
    const app = await api();
    const params = ambientParamsFromClientPayload(
      defaultParams as unknown as Record<string, unknown>,
    );
    const res = await request(app).post("/api/interactions").send({
      musicParams: params,
      userResponse: "neutral ok",
      sessionId: "sessionsessionci2",
      clientEngine: "tone",
      schemaVersion: 1,
      moodText: "mood line",
      moodSignalIntent: {
        arousal: 0.4,
        valence: 0.55,
        tension: 0.4,
        cognitiveLoad: 0.5,
        grounding: 0.6,
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.clientEngine).toBe("tone");
    expect(res.body.moodText).toBe("mood line");
  });

  it("POST /api/sessions upserts and GET hydrates", async () => {
    const app = await api();
    const sid = `sesspref${Date.now()}`;
    const up = await request(app).post("/api/sessions").send({
      sessionId: sid,
      label: "ci-session",
    });
    expect(up.status).toBe(200);
    expect(up.body.persisted).toBe(true);
    const got = await request(app).get(`/api/sessions/${encodeURIComponent(sid)}`);
    expect(got.status).toBe(200);
    expect(got.body.persisted).toBe(true);
    expect(got.body.label).toBe("ci-session");
  });

  it("GET /api/journals filters by sessionId query", async () => {
    const app = await api();
    const token = `jf-${Date.now()}`;
    const sidA = `sessjfa${Date.now()}`;
    const sidB = `sessjfb${Date.now()}`;
    await request(app).post("/api/journals").send({
      content: `A-${token}`,
      sessionId: sidA,
    });
    await request(app).post("/api/journals").send({
      content: `B-${token}`,
      sessionId: sidB,
    });
    const listA = await request(app).get("/api/journals").query({ sessionId: sidA });
    expect(listA.status).toBe(200);
    expect(listA.body.some((j: { content: string }) => j.content.includes(`A-${token}`))).toBe(true);
    expect(listA.body.some((j: { content: string }) => j.content.includes(`B-${token}`))).toBe(false);
  });

  it("GET /api/preferences returns summary after interaction in session", async () => {
    const app = await api();
    const sid = `sessprf${Date.now()}`;
    await request(app).post("/api/sessions").send({ sessionId: sid });
    const params = ambientParamsFromClientPayload(
      defaultParams as unknown as Record<string, unknown>,
    );
    await request(app).post("/api/interactions").send({
      musicParams: params,
      userResponse: "great calm love",
      sessionId: sid,
    });
    const pref = await request(app).get("/api/preferences").query({ sessionId: sid });
    expect(pref.status).toBe(200);
    expect(typeof pref.body.summary).toBe("string");
    expect(pref.body.summary.length).toBeGreaterThan(0);
  });
});
