# Equilibrium

**Generative ambient music for mindfulness and emotional regulation.**

Equilibrium generates real-time, evolving ambient soundscapes tailored to your emotional state. Type how you're feeling, and the AI (Google Gemini 2.5 Flash) interprets your mood into audio synthesis parameters — chord partials, harmonic structure, LFO modulation, noise texture, and a matching color palette. The soundscape evolves continuously, with follow-up check-in prompts from the AI to deepen emotional awareness.

Supports **web browsers** and **native mobile** (iOS/Android via Capacitor) with offline journaling and sync.

---

## Architecture

```
                  ┌──────────────────────────────┐
                  │       Browser / Capacitor     │
                  │  ┌─────────────────────────┐  │
                  │  │     React 19 SPA         │  │
                  │  │  ┌────────────────────┐  │  │
                  │  │  │  Instrument Mode   │  │  │
                  │  │  │  (gesture→macros)  │  │  │
                  │  │  └────────┬───────────┘  │  │
                  │  │  ┌────────┴───────────┐  │  │
                  │  │  │  Form Mode         │  │  │
                  │  │  │  (tabs: Practice   │  │  │
                  │  │  │   Session Reflect) │  │  │
                  │  │  └────────────────────┘  │  │
                  │  │  ┌────────────────────┐  │  │
                  │  │  │  Audio Engine      │  │  │
                  │  │  │  Tone.js / WASM+Wk │  │  │
                  │  │  └────────────────────┘  │  │
                  │  │  IndexedDB (offline)     │  │
                  │  └─────────────────────────┘  │
                  └────────────┬─────────────────┘
                               │  HTTP/JSON
                               ▼
                  ┌──────────────────────────────┐
                  │    Express 4 Server (Node)    │
                  │  ┌─────────────────────────┐  │
                  │  │  /api/generate-music     │──┼──▶ Gemini 2.5 Flash
                  │  │  /api/sessions           │  │
                  │  │  /api/journals           │  │
                  │  │  /api/interactions       │  │
                  │  │  /api/preferences        │  │
                  │  │  /api/health             │  │
                  │  │  /api/audio-rollout      │  │
                  │  └─────────────────────────┘  │
                  └────────────┬─────────────────┘
                               │  Drizzle ORM
                               ▼
                  ┌──────────────────────────────┐
                  │  PostgreSQL 16               │
                  │  sessions, journals,         │
                  │  interactions, preferences   │
                  └──────────────────────────────┘
```

### Key components

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Motion | SPA with two UI modes (instrument/stage + form) |
| **Audio** | Tone.js + WebAssembly DSP via AudioWorklet | Real-time synthesis; WASM/AudioWorklet for production, Tone.js fallback |
| **AI** | Google Gemini 2.5 Flash (`@google/genai`) | Mood→music parameter generation, feedback prompts |
| **Server** | Express 4, TypeScript, tsx/esbuild | REST API, AI proxy, rate limiting |
| **Database** | PostgreSQL via Drizzle ORM | Sessions, journals, interactions, preference profiles |
| **Mobile** | Capacitor 6 (Android/iOS) | Native WebView wrapper, offline sync |
| **Tests** | Vitest 4, Testing Library, jsdom, supertest | Unit, integration, API contract tests |

---

## Quick start

### Prerequisites

- **Node.js** ≥ 20
- **Google Gemini API key** ([aistudio.google.com](https://aistudio.google.com))
- PostgreSQL (optional — the app degrades gracefully without it)

### Setup

```bash
git clone <repo-url>
cd Equilibrium

npm install

# Copy and configure environment
cp .env.example .env
# Edit .env → set GEMINI_API_KEY, optionally DATABASE_URL
```

### Development

```bash
npm run dev
# → http://localhost:3000
```

The dev server runs Express with Vite middleware. The SPA hot-reloads without a separate Vite process. Port and host are configurable via `PORT` and `HOST` env vars.

### Production build

```bash
npm run build
# Compiles WASM → builds SPA (vite) → bundles server (esbuild)
npm run start
# → node dist/server.cjs
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key for mood→music generation |
| `DATABASE_URL` | No | — | PostgreSQL connection string; app degrades without it |
| `PORT` | No | `3000` | HTTP server port |
| `HOST` | No | `0.0.0.0` | HTTP server bind address |
| `CORS_ORIGINS` | No | — | Comma-separated allowed origins (needed for mobile/Capacitor) |
| `AUDIO_ENGINE` | No | `auto` | Server audio engine preference: `tone`, `stub`, `wasm`, `auto` |
| `AUDIO_SHADOW_MODE` | No | — | Include shadow fingerprint in `/api/generate-music` responses |
| `GENERATE_MUSIC_RATE_MAX` | No | `40` | Max `/api/generate-music` requests per minute per session/IP |
| `SERVER_HTTP_LOG` | No | — | Set to `1` to log JSON-formatted HTTP requests to console |
| `AUDIO_ENGINE_AUTO_WASM` | No | `1` | Enable automatic WASM/worklet promotion from `auto` |
| `VITE_API_BASE_URL` | No | — | (Build time) API base URL for Capacitor WebView |

See [`docs/AUDIO_ENV.md`](docs/AUDIO_ENV.md) for audio-specific variables and rollout flags.

---

## API reference

All endpoints return JSON. Request IDs are returned in `X-Request-Id` headers and response bodies for tracing.

### Health

```
GET /api/health
```

Returns server status, AI/DB connectivity, schema version, and audio rollout configuration.

### Sessions

```
POST /api/sessions
Body: { sessionId, userId?, label?, soundscapeEnvelope?, metadata? }

GET /api/sessions/:sessionId
```

Client-owned soundscape sessions. `POST` upserts; `GET` retrieves by ID. Sessions work without a database (returns `persisted: false`).

### Preferences

```
GET /api/preferences?sessionId=...
```

Returns AI-derived preference summary text for the session, auto-generated from recent interactions.

### Journals

```
GET /api/journals?sessionId=...
POST /api/journals
Body: { content, sessionId?, moodText?, clientMutationId? }
```

Journal entries with offline deduplication via `clientMutationId`.

### Interactions

```
GET /api/interactions?sessionId=...
POST /api/interactions
Body: { musicParams, userResponse, sessionId?, moodText?, moodSignalIntent?, ... }
```

Mood→music feedback pairs. Used to build preference profiles and provide context for future generations.

### Generate Music

```
POST /api/generate-music
Body: { mood, currentParams?, settings?, sessionId? }
Headers: X-Session-Id (optional)
Rate limit: 40 req/min per session or IP (configurable)
```

The core AI endpoint. Sends mood + session context (journals, prior interactions, preference summary) to Gemini and returns new audio synthesis parameters, a feedback prompt, a mood signal intent, and (optionally) a WASM parity shadow comparison.

### Audio Rollout

```
GET /api/audio-rollout
```

Returns the server's current audio engine preference and rollout flags. Clients use this to switch between Tone.js and WASM/AudioWorklet synthesis.

---

## Database

### Schema

| Table | Primary key | Key columns |
|-------|-------------|-------------|
| `sessions` | `id` (varchar 128) | `user_id`, `label`, `metadata` (jsonb), `soundscape_envelope` (jsonb) |
| `preference_profiles` | `session_id` (FK→sessions) | `summary_text`, `updated_at` |
| `journals` | `id` (serial) | `content`, `session_id`, `mood_text`, `client_mutation_id` |
| `interactions` | `id` (serial) | `music_params` (jsonb), `user_response`, `session_id`, `mood_signal_intent` (jsonb), `client_mutation_id` |

### Migrations

```bash
npm run db:migrate
```

Runs pending Drizzle migrations from `drizzle/` against `DATABASE_URL`. Migrations also run automatically at server startup via `initDb()`.

---

## Audio engine

Equilibrium supports two synthesis backends behind a common `IAmbientEngine` interface:

| Engine | File | Use case |
|--------|------|----------|
| **Tone.js** | `src/lib/engine/tone-ambient-engine.ts` | Default, feature-complete, browser-native |
| **WASM/AudioWorklet** | `src/lib/engine/worklet-ambient-engine.ts` | Production path, lower CPU, better determinism |
| **Stub** | `src/lib/engine/stub-engine.ts` | Deterministic PCM preview for tests |

The engine mode is resolved at runtime via:
1. Explicit option passed to `createAmbientEngine()`
2. Client environment variable `VITE_AUDIO_ENGINE`
3. Server `/api/audio-rollout` effective engine

The WASM DSP (`wasm/equilibrium_dsp.wat`) implements chord partial synthesis, additive harmonics, lowpass envelope, and LFO modulation. Compile with `npm run build:wasm` using wabt.

---

## UI modes

Equilibrium has two UI modes, selected via URL query `?instrument=`:

| Mode | URL | Description |
|------|-----|-------------|
| **Stage** | `?instrument=stage` | Full-screen interactive ambient stage with gesture-based audio control, palette wheel, HUD, and slide-out drawer for forms |
| **Form** | `?instrument=form` | Traditional 3-tab layout: Practice (mood input), Session (timed), Reflect (journal) |

See [`docs/INSTRUMENT_MODE.md`](docs/INSTRUMENT_MODE.md) for the full gesture pipeline, keyboard shortcuts, and rollout plan.

---

## Offline support

- Playback uses the last persisted soundscape (localStorage + IndexedDB)
- Journals and interactions are queued via IndexedDB outbox when offline
- On reconnect, the outbox flushes with `clientMutationId`-based idempotent deduplication
- `/api/generate-music` requires network; offline mood entry logs locally and keeps current params

---

## Mobile (Capacitor)

```bash
npm run cap:sync       # Build + sync to native projects
npm run cap:ios        # Build + sync + open Xcode
npm run cap:android    # Build + sync + open Android Studio
```

Set `VITE_API_BASE_URL` at build time when the API runs on a different origin than the WebView. Configure `CORS_ORIGINS` on the server for Capacitor origins (`https://localhost`, `capacitor://localhost`).

See [`docs/MOBILE.md`](docs/MOBILE.md) for full mobile setup.

---

## Testing

```bash
npm test               # Unit + integration tests (Vitest)
npm run test:postgres  # PostgreSQL integration tests
npm run test:coverage  # With coverage report
npm run lint           # TypeScript type-check (tsc --noEmit)
```

CI runs lint, test, build, and PostgreSQL integration tests on every push/PR (see `.github/workflows/ci.yml`).

---

## Project structure

```
src/
├── main.tsx                 # React entry point
├── App.tsx                  # Root orchestrator (state, modes, sync)
├── app/                     # App layout components (instrument/form)
├── server/                  # Express backend (routes, middleware)
├── db/                      # Drizzle ORM schema + migration runner
├── components/              # React UI components
│   ├── instrument/          #   Instrument mode components
│   ├── audio-lab/           #   Audio Lab controls
│   └── __tests__/           #   Component tests
├── lib/                     # Business logic (~50 modules)
│   ├── engine/              #   Audio engine abstraction (tone/wasm/stub)
│   ├── dsp/                 #   DSP primitives (FFT, sonic contract)
│   ├── instrument/          #   Gesture pipeline, motion system, a11y
│   └── ...                  #   Synth, prompts, sync, validation, etc.
├── hooks/                   #   React hooks
├── constants/               #   Design system tokens
└── __tests__/               #   Integration + API tests

wasm/                        # WebAssembly Text Format DSP source
public/
├── wasm/                    # Compiled .wasm binaries
└── worklets/                # AudioWorkletProcessor implementation

drizzle/                     # PostgreSQL migration SQL files
docs/                        # Additional documentation
android/                     # Capacitor Android native project
```

---

## Documentation index

| Document | Content |
|----------|---------|
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Operations: deployment, monitoring, troubleshooting, rollback |
| [`docs/AUDIO_ENV.md`](docs/AUDIO_ENV.md) | Audio engine environment variables and rollout flags |
| [`docs/AUDIO_RUNTIME_DECISION.md`](docs/AUDIO_RUNTIME_DECISION.md) | WASM vs Tone.js architecture decision memo |
| [`docs/INSTRUMENT_MODE.md`](docs/INSTRUMENT_MODE.md) | Instrument/stage mode architecture and gesture pipeline |
| [`docs/MOBILE.md`](docs/MOBILE.md) | Capacitor build, deploy, and offline sync |
| [`docs/DEV_RUNBOOK_MANUAL_TESTING.md`](docs/DEV_RUNBOOK_MANUAL_TESTING.md) | Manual QA checklist for UI and audio behavior |
