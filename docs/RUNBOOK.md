# Equilibrium — Operations Runbook

Operational reference for deploying, monitoring, and troubleshooting the Equilibrium application.

---

## 1. Deployment

### 1.1 Requirements

| Dependency | Version | Notes |
|-----------|---------|-------|
| Node.js | ≥ 20 | `package.json` engines constraint |
| PostgreSQL | 16 | Optional; app degrades without it |
| Gemini API key | — | Required for AI music generation endpoint |

### 1.2 Build pipeline

```bash
npm run build
```

This runs three steps in sequence:
1. `npm run build:wasm` — Compiles `wasm/*.wat` to `public/wasm/*.wasm` using wabt
2. `vite build` — Builds the React SPA into `dist/`
3. `tsx build-server.ts` — Bundles the Express server to `dist/server.cjs` (CommonJS) via esbuild

### 1.3 Artifacts

| Artifact | Location | Format |
|----------|----------|--------|
| SPA static files | `dist/` (excl. `server.cjs`) | HTML, JS, CSS, WASM |
| Server bundle | `dist/server.cjs` | CommonJS (esbuild) |
| WASM binaries | `public/wasm/` (copied to `dist/wasm/` by Vite) | WebAssembly |
| AudioWorklet | `public/worklets/` (copied to `dist/worklets/`) | JS |

### 1.4 Start

```bash
npm run start
# → node dist/server.cjs
```

The server:
1. Loads `.env` via `dotenv/config`
2. Runs database migrations (if `DATABASE_URL` is set)
3. Creates the Express app (see `src/server/app.ts`)
4. Serves `dist/` statically with SPA fallback
5. Listens on `PORT` (default `3000`) at `HOST` (default `0.0.0.0`)

### 1.5 Environment validation checklist

Before deploying to production, verify:

- [ ] `GEMINI_API_KEY` is set and valid
- [ ] `DATABASE_URL` points to a reachable PostgreSQL instance
- [ ] `CORS_ORIGINS` includes all production frontend origins
- [ ] `NODE_ENV=production` (disables Vite dev middleware)
- [ ] `PORT` and `HOST` are configured for the deployment environment
- [ ] `GENERATE_MUSIC_RATE_MAX` is tuned for expected load (default: 40 req/min)
- [ ] `JSON_BODY_LIMIT` is appropriate (default: 512kb)

### 1.6 Graceful shutdown

The server handles `SIGTERM` and `SIGINT` (`server.ts:15-24`):
- Closes the HTTP server (stops accepting new connections)
- Closes the PostgreSQL connection pool
- Exits with code 0

---

## 2. Environment variables — full reference

### Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | None (DB is optional) |

### Server

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP listen port | `3000` |
| `HOST` | HTTP bind address | `0.0.0.0` |
| `NODE_ENV` | Set to `production` to disable Vite middleware | — |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | None (same-origin only) |
| `JSON_BODY_LIMIT` | Max JSON request body size | `512kb` |
| `SERVER_HTTP_LOG` | Set to `1` to log JSON HTTP access logs | Off |

### Rate limiting

| Variable | Purpose | Default |
|----------|---------|---------|
| `GENERATE_MUSIC_RATE_MAX` | Max `/api/generate-music` req/min per session or IP | `40` |

### Audio rollout (server-side)

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUDIO_ENGINE` | Server engine preference: `tone`, `stub`, `wasm`, `auto` | `auto` |
| `AUDIO_ENGINE_AUTO_WASM` | Enable WASM promotion from `auto`: `1` (yes) or `0` (no) | `1` |
| `AUDIO_SHADOW_MODE` | Include WASM parity shadow in `/api/generate-music` | Off |

### Build-time (Vite)

| Variable | Purpose | Used by |
|----------|---------|---------|
| `VITE_API_BASE_URL` | API origin for Capacitor WebView | Client build |
| `VITE_HMR` | Enable Vite HMR (set to `false` for AI Studio) | Vite config |
| `VITE_INSTRUMENT_DEFAULT_MODE` | Default instrument mode (`stage` / `form` / `auto`) | Client build |

---

## 3. Database operations

### 3.1 Connection pool

The server uses a singleton `pg.Pool` (`src/db/index.ts:36`). If `DATABASE_URL` is unset, all database operations are no-ops — the app runs in a degraded mode without persistence.

### 3.2 Run migrations

```bash
npm run db:migrate
```

Executes pending Drizzle migrations from `drizzle/` against `DATABASE_URL`. Migrations also run automatically at server startup via `initDb()`.

### 3.3 Generate new migrations

```bash
npx drizzle-kit generate
```

After modifying `src/db/schema.ts`, run this to generate SQL migration files in `drizzle/`.

### 3.4 Health check — DB connectivity

```bash
curl http://localhost:3000/api/health | jq '{dbConnected, databaseUrlConfigured}'
```

Returns:
```json
{
  "dbConnected": true,
  "databaseUrlConfigured": true
}
```

### 3.5 Backup

```bash
pg_dump "$DATABASE_URL" > equilibrium_backup_$(date -I).sql
```

The schema uses JSONB columns for `metadata`, `soundscape_envelope`, `music_params`, and `mood_signal_intent` — standard `pg_dump` captures these correctly.

---

## 4. Monitoring

### 4.1 Health endpoint

```
GET /api/health
```

Response fields:

| Field | Type | Meaning |
|-------|------|---------|
| `ok` | boolean | Server is running |
| `requestId` | string | Correlation ID |
| `aiConfigured` | boolean | `GEMINI_API_KEY` is set |
| `databaseUrlConfigured` | boolean | `DATABASE_URL` is set |
| `dbConnected` | boolean | PostgreSQL pool responded to `SELECT 1` |
| `ambientParamsSchemaVersion` | number | Current params schema version |
| `audioRollout.engine` | string | Server engine preference |
| `audioRollout.effectiveEngine` | string | Resolved effective engine |
| `audioRollout.shadowMode` | boolean | Shadow comparison enabled |
| `audioRollout.instrument` | string | Instrument mode default |

### 4.2 Request correlation

Every request gets a `requestId` (UUID v4). Clients can pass `X-Request-Id` header; the server echoes it back in `X-Request-Id` response header and includes it in error response bodies. All API routes include `requestId` in their JSON responses.

### 4.3 HTTP access logs

Set `SERVER_HTTP_LOG=1` to emit JSON access logs for `/api` requests:

```json
{"msg":"http_request","requestId":"abc123","method":"POST","path":"/api/generate-music"}
```

### 4.4 Rate limit headers

`/api/generate-music` responses include standard rate limit headers:

| Header | Meaning |
|--------|---------|
| `RateLimit-Limit` | Max requests per window |
| `RateLimit-Remaining` | Remaining in current window |
| `RateLimit-Reset` | Window reset timestamp |

### 4.5 Key metrics to alert on

| Condition | Check | Criticality |
|-----------|-------|-------------|
| `ok: false` or 5xx | `/api/health` | Critical |
| `dbConfigured: true` & `dbConnected: false` | DB down while configured | High |
| `aiConfigured: false` | Missing API key | High |
| Rate limit 429s | Error rate on `/api/generate-music` | Medium |
| Gemini API errors (non-2xx) | Server logs | Medium |

---

## 5. Troubleshooting

### 5.1 "GEMINI_API_KEY is not configured" (503)

**Cause:** `GEMINI_API_KEY` env var is unset or invalid.
**Fix:** Set `GEMINI_API_KEY` in `.env` or deployment environment. Verify with `GET /api/health` → `aiConfigured`.

### 5.2 "Database not initialized" error

**Cause:** `DATABASE_URL` is set but the pool failed to connect (`initDb()` threw).
**Check:** Verify PostgreSQL is reachable from the server. The server will emit `Failed to initialize database` at startup.

### 5.3 Audio not playing

**Cause:** Browser autoplay policy requires a user gesture before `AudioContext` can start.
**Check:** Ensure the user has clicked the Play button. Check browser console for `AudioContext was not allowed to start` warnings.

### 5.4 WASM/AudioWorklet loading failures

**Cause:** Missing `.wasm` files or AudioWorklet processor script.
**Check:**
```bash
ls dist/wasm/equilibrium_dsp.wasm
ls dist/worklets/equilibrium-dsp-processor.js
```
Rebuild with `npm run build:wasm` and `npm run build` if missing.

### 5.5 Offline sync not flushing

**Cause:** Network connectivity not re-established, or CORS blocking API calls.
**Check:**
- Browser DevTools → Network tab → verify API calls succeed when online
- For Capacitor: verify `VITE_API_BASE_URL` is set and `CORS_ORIGINS` includes WebView origins
- Check browser console for sync queue errors

### 5.6 Rate limited (429)

**Cause:** Too many `/api/generate-music` requests within a 60-second window.
**Response body:** `{"error": "Too many generation requests; try again shortly"}`
**Fix:** Wait for the window to reset, or increase `GENERATE_MUSIC_RATE_MAX`.

### 5.7 Migration conflicts

**Cause:** Drizzle migration journal (`drizzle/meta/_journal.json`) is out of sync with applied migrations.
**Fix:** Drop and recreate the database, or manually reconcile the journal. The `drizzle/meta/_journal.json` tracks which migrations have been applied.

---

## 6. Audio engine rollout

### 6.1 Switching engines

The audio engine can be changed at runtime without redeployment:

```bash
# Switch all clients to WASM/AudioWorklet
export AUDIO_ENGINE=wasm

# Roll back to Tone.js
export AUDIO_ENGINE=tone

# Let clients auto-select (follows AUDIO_ENGINE_AUTO_WASM flag)
export AUDIO_ENGINE=auto
```

Set `AUDIO_ENGINE_AUTO_WASM=0` to prevent automatic WASM promotion from `auto` mode.

### 6.2 Shadow mode

Enable `AUDIO_SHADOW_MODE=true` to include parity comparison data in `/api/generate-music` responses. This is used for A/B testing WASM vs Tone.js output determinism without affecting playback.

### 6.3 Instrument mode rollout

The instrument/stage mode is controlled by `VITE_INSTRUMENT_DEFAULT_MODE` (build-time) and server-side feature flags. Clients resolve their mode via: URL query → localStorage → server flag → build default. See [`docs/INSTRUMENT_MODE.md`](INSTRUMENT_MODE.md) for the full resolution chain.

---

## 7. Incident response

### 7.1 Gemini API outage

**Symptom:** `/api/generate-music` returns 5xx errors or timeouts.
**Impact:** Users cannot generate new soundscapes. Existing playback continues unaffected.
**Actions:**
1. Verify Gemini API status at [Google Cloud Status Dashboard](https://status.cloud.google.com/)
2. Check server logs for Gemini API error responses
3. If prolonged, consider switching to a fallback model or deploying offline-only mode
4. Users can still use the offline mode and journaling features

### 7.2 Database outage

**Symptom:** `POST /api/sessions`, journals, and interactions return errors. `/api/health` shows `dbConnected: false`.
**Impact:** Persistence is degraded. API endpoints return in-memory-only responses.
**Actions:**
1. Check PostgreSQL server status and connectivity
2. Verify connection string in `DATABASE_URL`
3. Restore from backup if data loss occurred
4. The app handles this gracefully — endpoints return `persisted: false` without crashing

### 7.3 Service restart procedure

```bash
# Graceful stop (sends SIGTERM → graceful shutdown)
kill -TERM $(pgrep -f "node dist/server.cjs")

# Force kill if graceful shutdown hangs (>10s)
kill -KILL $(pgrep -f "node dist/server.cjs")

# Start
cd /path/to/equilibrium
npm run start
```

---

## 8. CI/CD

### 8.1 CI pipeline

`.github/workflows/ci.yml` runs on push to `main`/`master` and all PRs:

| Job | Steps |
|-----|-------|
| `build-test` | `npm ci` → `npm run lint` → `npm test` → `npm run build` |
| `postgres-api` | Spins up PostgreSQL 16 service → `npm ci` → `npm run test:postgres` |

### 8.2 Test requirements

- `npm run lint` (TypeScript type-check) must pass
- `npm test` (Vitest unit/integration) must pass
- PostgreSQL integration tests use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/equilibrium_test` with `GEMINI_API_KEY=ci-placeholder`

---

## 9. Development quick reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Full production build |
| `npm run start` | Start production server |
| `npm test` | Run unit + integration tests |
| `npm run test:postgres` | Run PostgreSQL integration tests |
| `npm run lint` | TypeScript type-check |
| `npm run db:migrate` | Apply database migrations |
| `npm run cap:sync` | Build + Capacitor sync |
| `npm run clean` | Remove `dist/` |

---

## 10. Related documentation

| Document | Topic |
|----------|-------|
| [`README.md`](../README.md) | Project overview, architecture, API reference |
| [`AUDIO_ENV.md`](AUDIO_ENV.md) | Audio engine env vars and rollout flags |
| [`AUDIO_RUNTIME_DECISION.md`](AUDIO_RUNTIME_DECISION.md) | WASM vs Tone.js architecture decision |
| [`INSTRUMENT_MODE.md`](INSTRUMENT_MODE.md) | Instrument mode architecture and gesture pipeline |
| [`MOBILE.md`](MOBILE.md) | Capacitor build, deploy, offline sync |
| [`DEV_RUNBOOK_MANUAL_TESTING.md`](DEV_RUNBOOK_MANUAL_TESTING.md) | Manual QA checklist |
