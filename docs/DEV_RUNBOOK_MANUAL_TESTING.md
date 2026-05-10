# Dev runbook — manual testing

Step-by-step checks for local QA after UI or app-shell changes. Automated coverage lives in Vitest; this document is for **eyes, ears, and browser behavior** that tests do not fully replace.

---

## 1. Prerequisites

- **Node.js** ≥ 20 (`package.json` `engines`).
- **Environment** — copy [`.env.example`](../.env.example) to `.env` and set at least:
  - `GEMINI_API_KEY` — required for mood → music generation (`POST /api/generate-music`). Without it, server behavior may degrade; confirm what your branch expects.
  - `DATABASE_URL` — optional for full journal/API persistence; many flows still work with degraded DB paths.
- **Audio** — use headphones or a known-good speaker; browser autoplay policies require a **user gesture** before audio starts (play button).

---

## 2. Start the dev server

From the repository root:

```bash
npm install
npm run dev
```

Default URL: [http://localhost:3000](http://localhost:3000) (see `PORT` in [`server.ts`](../server.ts); override with `PORT=...` if needed).

The dev server runs Express with **Vite middleware** ([`src/server/app.ts`](../src/server/app.ts)), so the SPA hot-reloads without a separate `vite` process.

---

## 3. Instrument vs form mode

Equilibrium supports two UI modes (see [`docs/INSTRUMENT_MODE.md`](INSTRUMENT_MODE.md)):

| Mode   | URL query              | What to verify briefly                          |
|--------|------------------------|-------------------------------------------------|
| Stage  | `?instrument=stage`    | Full-screen interactive stage; drawer for forms |
| Form   | `?instrument=form`   | Classic tabs + column layout over `AmbientStage` |

**Checks**

1. Load [http://localhost:3000/?instrument=form](http://localhost:3000/?instrument=form) — header, journey stepper, **Practice / Session / Reflect** tabs, bottom now-playing chrome (desktop footer + mobile bar + nav) render without overlap errors.
2. Load [http://localhost:3000/?instrument=stage](http://localhost:3000/?instrument=stage) — stage fills viewport; header overlay; **drawer** opens from header actions; **desktop dock** + **mobile instrument dock** visible at correct breakpoints (resize window past `md` breakpoint).

---

## 4. Audio engine and playback

1. Open Audio Lab (header / dock, depending on mode).
2. Click **Play** — expect engine start (possible short “Waking up engine…” state).
3. **Pause** — audio stops; UI reflects paused state.
4. Change **synthesis engine** preference in Audio Lab if exposed — engine should recreate without white screen (watch console for errors).

---

## 5. Instrument stage (gestures and chrome)

With `?instrument=stage`:

1. **Drag** on stage — intensity / brightness should feel mapped to sound (no runaway console errors).
2. **Long-press** — palette wheel (if enabled in build).
3. **Keyboard** — `Space` play/pause, `M` mood drawer, `Escape` closes overlays (per [`docs/INSTRUMENT_MODE.md`](INSTRUMENT_MODE.md) §2.3).
4. Open **palette modal** from dock — selection applies and modal closes.
5. With **journal composer** or **palette modal** or **Audio Lab** open, stage should report **disabled** / non-interactive as before (no accidental gestures).

---

## 6. Practice — mood and AI path

1. In **Practice**, enter a short mood line and submit.
2. Confirm loading state, then new params / palette / feedback prompt if returned.
3. **Offline** — DevTools → Network → Offline; submit again — expect offline copy and no hard crash; sound may stay unchanged (see `processSentiment` offline behavior).

---

## 7. Session — timed flow

1. Switch to **Session**, pick duration and intent, **Begin session**.
2. Confirm **progress** updates (ring or bar, depending on layout).
3. Let session complete (or use a very short duration if you temporarily change it for QA) — **Session complete** dialog appears.
4. Exercise **Reflect** / **Journal** actions from the dialog — in stage mode, drawer should open where applicable.

---

## 8. Reflect — journal and history

1. **Reflect** → open **history** / journal list — list loads or shows cached/offline behavior.
2. **Compose** journal entry — save; confirm outbox / pending indicators in header if you have queued items.
3. Toggle **online** after offline edits — flush behavior (no duplicate errors in console).

---

## 9. Shared modals (both modes)

Repeat in **stage** and **form** where relevant:

- **Palette modal** — open, pick palette, close.
- **Audio Lab sheet** — open, tweak a macro slider, open palettes from lab, close sheet.
- **Session complete** — feedback buttons, reflect, journal callbacks (see §7).

---

## 10. Mobile and safe areas

Use DevTools device emulation or a real phone on the same LAN (if you expose `HOST` / tunnel):

- Bottom dock / nav clears **safe-area-inset-bottom** (no content hidden behind home indicator).
- Drawer / sheet gestures still scroll and dismiss.

---

## 11. Regression matrix (app shell / layout refactors)

Quick pass after moving [`src/App.tsx`](../src/App.tsx) wiring into [`src/app/`](../src/app/) layouts:

| Area              | Stage | Form |
|-------------------|-------|------|
| Header + rollout chips | ✓ | ✓ |
| Journal side panel / inline | ✓ | ✓ |
| Now playing + lab entry | ✓ | ✓ |
| Tab content (Practice/Session/Reflect) | ✓ (drawer) | ✓ (main) |
| `sharedModals` (palette, composer, lab, session end) | ✓ | ✓ |

---

## 12. Commands before opening a PR

```bash
npm run lint
npm test
```

Optional: `npm run test:postgres` if your change touches API + DB integration.

---

## 13. Known limitations

- Vitest/jsdom does not implement canvas fully — visualizer tests may log canvas warnings; rely on browser for visual stage checks.
- Native **Capacitor** resume → outbox flush is only verifiable on device or emulator, not in desktop Chrome alone.
