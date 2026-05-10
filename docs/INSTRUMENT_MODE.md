# Instrument Mode

Equilibrium ships with two coexisting UI modes:

- **`stage`** — *Instrument mode.* Default. The ambient stage is interactive: cursor / touch on the stage shapes the soundscape. Form-based UI (mood input, tabs) lives in a slide-out drawer.
- **`form`** — *Form mode.* The original layout: tabs on top, form-driven Practice / Session / Reflect views, ambient backdrop. Retained as the documented accessibility, low-end, and rollback path.

The implementation is documented here so it can be tuned, debugged, and rolled back without re-deriving the architecture.

---

## 1. How to switch modes

In order of precedence:

1. **URL param** — `?instrument=stage` or `?instrument=form`. Useful for staging URLs and bug repros. Wins over everything below.
2. **localStorage** — `equilibrium.instrument.mode = "stage" | "form"`. Set by the app any time the user makes an explicit choice (UI toggle remains a follow-up).
3. **Build env** — `VITE_INSTRUMENT_MODE` in `.env`.
4. **Server rollout** — `GET /api/audio-rollout` field `instrument` (`"stage"` | `"form"` | `"auto"`). Only applied after the fetch resolves **when** URL and localStorage did not already pin a mode. If you need client-only defaults, keep the server value at `auto`.
5. **Hard default** — `"stage"` when nothing else applies.

`resolveInstrumentMode({ serverInstrument })` in [`src/lib/instrument/feature-flag.ts`](../src/lib/instrument/feature-flag.ts) encodes the full chain (including server); `readInstrumentMode()` is the synchronous boot path (URL → storage → env → default), before `/api/audio-rollout` returns.

To roll back to form mode for everyone via env **without** relying on user localStorage, set `INSTRUMENT_MODE=form` on the server (see §10).

---

## 2. Architecture

### 2.1 Layers

```
src/
  lib/instrument/
    motion-system.ts       Codified spring/easing constants (+ surface.collapse for lab disclosure).
    gesture-mapping.ts     Pure: gesture snapshot → macro deltas.
    gesture-source.ts      Pointer Events → snapshot stream (1 / 2 fingers).
    param-commit.ts        RAF-coalesced engine.applyParams scheduler.
    a11y.ts                Keyboard equivalents + STAGE_ARIA bag.
    feature-flag.ts        Mode + drawer-default persistence + resolveInstrumentMode(server).
    audio-lab-prefs.ts     Expert disclosure open/closed in Audio Lab (localStorage).
    index.ts               Barrel.

  components/audio-lab/
    NowPlayingPanel.tsx, PaletteSection.tsx, EnginePanel.tsx
    AgenticEvolution.tsx, AdvancedSoundDesign.tsx, SectionDivider.tsx

  components/instrument/
    InstrumentStage.tsx        Composes AmbientStage + capture layer + gestures + HUD + wheel.
    InstrumentHUD.tsx          Hover-revealed numeric readout.
    PaletteWheel.tsx           Long-press radial palette picker.
    InstrumentDrawer.tsx       Right-edge slide-out for form views.
    MobileInstrumentDock.tsx   Single adaptive bottom dock (replaces NowPlayingBar + PrimaryNav).
    FirstRun.tsx               3-step ambient walkthrough (localStorage flag).
```

### 2.2 Data flow during a gesture

```
Pointer / Touch / Keyboard event
  ↓
useStageGesture                  (pointer-event capture, multi-touch arbiter)
  ↓
mapGestureToMacros               (pure: snapshot → {intensity, brightness, paletteHintIndex})
  ↓
useEngineParamCommit             (RAF coalesce; release ramp on idle)
  ↓
engine.applyParams(projected)    (Tone / WASM / preview)
  ↓
Analyser → AudioVisualizer       (existing path, unchanged)
```

The pointer-to-audio loop bypasses React state during drag (everything in refs). React state is updated only on `onMacrosRelease` so secondary surfaces (lab sheet sliders) stay in sync without 60Hz re-renders.

### 2.3 Gesture vocabulary

| Input                       | Effect                                     |
|---                          |---                                         |
| Cursor hover                | Shows HUD readout (auto-hides ~2.4s idle)  |
| Horizontal drag             | `intensity` (motion / LFO / complexity)    |
| Vertical drag               | `brightness` (filter / harmonicity / wet)  |
| Long-press (>500ms)         | Opens `PaletteWheel` at cursor             |
| Tap                         | Pulses HUD                                 |
| Two-finger pinch            | `intensity` (alt; touch only)              |
| Two-finger rotate           | Advances palette hint                      |
| Spacebar                    | Play / pause                               |
| Arrow keys (Shift = bigger) | Nudge intensity / brightness               |
| `P`                         | Open palette wheel (centered)              |
| `M`                         | Open drawer + focus mood input             |
| `Escape`                    | Close drawer / wheel / sheet               |

### 2.4 Param commit semantics

`useEngineParamCommit` exposes:

- `commit(params)` — coalesced; one engine apply per RAF; resets idle timer.
- `commitImmediate(params, hint?)` — flush now (palette pick, mood result).
- `release()` — immediate flush with `releaseRampSec` (default 1.2s).
- `cancel()` — drop any pending apply (component unmount).

`flush` skips the apply only when **both the params reference and the ramp value** are unchanged. This lets the release path re-apply the last drag value with the longer release ramp.

---

## 3. A11y / keyboard parity

`STAGE_ARIA` is `role="application"` with a descriptive label. The stage is reachable in the tab order; once focused, all gestures have keyboard equivalents (`useStageA11y`). The drawer always preserves a path to the mood input via `M` and an edge-trigger button on desktop.

`prefers-reduced-motion` is honored by:

- `withReducedMotion(...)` swaps to an instant tween for surface motion.
- `useStageGesture` itself is unaffected — what changes is what motion is applied in response.

---

## 4. Visual language additions (Phase 3)

Additive to `src/constants/visual-system.ts`. Legacy `VS.*` is preserved.

- `SURFACE.base / raised / float` — three named tiers replacing ad-hoc `bg-white/[0.0X]` literals. Use via `surfaceClass(tier, "rounded-2xl p-4")`.
- `SURFACE.selected` — accent “on” chips (tabs, segmented controls, pills).
- `SURFACE.scrim.{soft,default,dense}` — full-screen overlays; use `scrimClass(layer, extra)`.
- `selectedSurfaceClass(extra)` — composes `SURFACE.selected` (bg + border + glow).
- `DENSITY.comfortable / compact` — paddings + gaps for two density levels.
- `TYPE.display / heading / subheading / subheadingMuted / eyebrow / numeric` — ramp + muted copy + tabular numeric.
- `INSTRUMENT_TOKEN.*` — includes `dividerClass` for section breaks in dense sheets.

Migration of legacy components to the new tokens is **incremental** and ongoing (form-mode surfaces, dock, journal, lab). New components should prefer the new tokens; `VS.*` remains for untouched legacy stacks.

---

## 5. Feature flag rollout plan

The current default is `stage`. To phase in:

1. Set `VITE_INSTRUMENT_MODE=form` in production. All **new** clients without overrides see form mode.
2. Add `?instrument=stage` to internal staging URLs for QA.
3. Cohort via **`INSTRUMENT_MODE`** on the server (`stage` / `form` / `auto`). When set to `form` or `stage`, the client applies it after `/api/audio-rollout` unless the user pinned URL or localStorage.
4. Default flip to `stage` globally once telemetry / qual feedback is satisfactory.

The `/api/audio-rollout` payload includes `instrument` (see §10). Health (`GET /api/health`) mirrors it under `audioRollout.instrument`.

---

## 6. Rollback procedure

If instrument mode causes a P0:

1. Set `VITE_INSTRUMENT_MODE=form` and redeploy. Existing users with `localStorage` overrides will still see stage mode unless they clear it; deploy a small client patch that calls `writeInstrumentMode("form")` once, behind a build flag, if you need a hard kill.
2. Or, revert the InstrumentStage import in `App.tsx`'s instrument branch — both branches still exist intentionally.
3. The legacy form-mode tests in `src/__tests__/App.test.tsx` and `src/__tests__/integration.test.tsx` continue to validate that path; they pin to `form` mode in `beforeEach`.

---

## 7. Deferred work / known follow-ups

- **Tab fate** (open question §6.3 of the plan) — tabs currently live inside the drawer. Decide whether to keep, promote to dock, or eliminate at M5 review.
- **Telemetry** — explicit decision was to defer. No client telemetry is added in this rollout.
- **Drawer side preference** — currently right-side only; left-side preference is a future toggle.
- **`SURFACE.depth` ladder** — sheets still use `bg-eq-depth/*` distinct from `SURFACE.float`; consolidate in a future pass.
- **Storybook-lite dev route** — not built. Visual diff review for token migration is currently manual.
- **PaletteModal / dock play chrome** — heavy bespoke gradients kept intentionally; not normalized to white-alpha `SURFACE` tiers yet.

Completed in this cycle: **server `instrument` flag**, **Audio Lab expert disclosure**, **legacy token adoption** (major form-mode components + Audio Lab split).

---

## 10. Server-side `instrument` flag

| Env | Values | Meaning |
|-----|-------|---------|
| `INSTRUMENT_MODE` | `stage` \| `form` \| `auto` (default) | Exposed as JSON field `instrument` on `GET /api/audio-rollout` and `GET /api/health` → `audioRollout.instrument`. |

Implementation: `getServerInstrumentMode()` in [`src/lib/feature-flags.ts`](../src/lib/feature-flags.ts). Invalid values fall back to `auto` (defer to client defaults).

The client stores the parsed rollout on `AudioRolloutState.instrument` and calls `resolveInstrumentMode` so URL/storage still win.

---

## 11. Audio Lab expert disclosure

- **Macros first** — Playback intensity / brightness sliders stay in [`NowPlayingPanel`](../src/components/audio-lab/NowPlayingPanel.tsx) and are always visible once playback macros apply.
- **Expert sections** — *Agentic Evolution* and *Advanced sound design* render only after **Show expert controls** (`aria-expanded`, `aria-controls="audio-lab-expert"`). Motion uses `MOTION.surface.collapse` with `withReducedMotion`.
- **Persistence** — `equilibrium.audioLab.expert` = `"1"` \| `"0"` via [`src/lib/instrument/audio-lab-prefs.ts`](../src/lib/instrument/audio-lab-prefs.ts).
- **Layout** — Subcomponents live under `src/components/audio-lab/`.

---

## 8. Test coverage map

| Area                              | File                                                                     |
|---                                |---                                                                       |
| Motion constants                  | `src/lib/instrument/motion-system.test.ts`                               |
| Gesture mapping (pure)            | `src/lib/instrument/gesture-mapping.test.ts`                             |
| Gesture source (pointer)          | `src/lib/instrument/gesture-source.test.tsx`                             |
| Param commit (RAF + release)      | `src/lib/instrument/param-commit.test.tsx`                               |
| A11y / keyboard                   | `src/lib/instrument/a11y.test.tsx`                                       |
| Feature flag + resolveInstrumentMode | `src/lib/instrument/feature-flag.test.ts`, `src/lib/feature-flags.test.ts`     |
| HTTP API rollout                     | `src/__tests__/api.test.ts`                                              |
| Audio Lab prefs + panels             | `src/lib/instrument/audio-lab-prefs.test.ts`, `src/components/audio-lab/__tests__/*.tsx`, `src/components/__tests__/AudioLabSheet.test.tsx` |
| Visual system tokens                 | `src/constants/visual-system.test.ts`                                    |
| Instrument App integration        | `src/components/instrument/__tests__/InstrumentMode.test.tsx`            |
| Mobile dock                       | `src/components/instrument/__tests__/MobileInstrumentDock.test.tsx`      |
| First-run walkthrough             | `src/components/instrument/__tests__/FirstRun.test.tsx`                  |
| Form-mode integration (rollback)  | `src/__tests__/App.test.tsx`, `src/__tests__/integration.test.tsx`       |

---

## 9. Performance notes

- Drag never causes a React re-render. Macros live in refs (`intensityPlaybackRef`, `brightnessPlaybackRef`); React state updates only on release.
- `useEngineParamCommit` coalesces to one engine call per RAF (~16ms). With `dragRampSec = 0.08`, the audio crossfade follows pointer motion smoothly without zipper noise.
- The instrument stage's capture layer is one transparent `<div>`. The visual stage is unchanged — the heavy lift (particles, gradients) is the same as before.
- HUD and palette wheel use `motion/react` springs from the centralized `MOTION` constants; no per-component animation tuning.
