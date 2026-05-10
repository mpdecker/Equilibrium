# Audio migration environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GEMINI_API_KEY` | Server | Required for `/api/generate-music` (Google GenAI). |
| `DATABASE_URL` | Server | Optional Postgres URL for journals / interactions context. |
| `AUDIO_SHADOW_MODE` | Server | When `true` or `1`, `/api/generate-music` includes `shadow` synthetic fingerprint comparison payload. |
| `AUDIO_ENGINE` | Server | Preference reported by `GET /api/audio-rollout` (`tone`, `stub`, `wasm`, `auto`). |
| — | `GET /api/audio-rollout` | Response includes `effectiveEngine`: typically `tone` or `wasm` when the worklet path is rolled out; `stub` forces preview PCM only when configured server-side. |
| `AUDIO_ENGINE_AUTO_WASM` | Server | When unset or `1`, `effectiveEngine` may resolve `wasm` for eligible clients when rollout selects worklets; set `0` to disable automatic WASM/worklet promotion from `auto`. |
| `VITE_AUDIO_ENGINE` | Client build | `tone` (default), `preview`/`stub`, `wasm`, or `auto` — passed through `resolveRuntimeSynthesisMode()` into `createAmbientEngine()`. |
| — | Unit tests | Pass `{ engineMode: "stub" }` to `createAmbientEngine` to bypass Vite env (see `create-engine.ts`). |

Dotenv: root `server.ts` loads `dotenv/config` so `.env` is picked up for local runs via `npm run dev`.
