# Instrument Mode — Major UI Update Plan

> Status: **Proposed**, awaiting kickoff. Scope: large, phased over multiple weeks. Visual language allowed to evolve.

---

## 1. Vision

Today, Equilibrium is a **form-driven app on top of a decorative ambient stage**. The stage (gradient bloom + grain + particle field) is beautiful but inert — it's wallpaper. Every meaningful interaction routes through buttons, sliders, modals, and a text input.

The next major UI update flips that relationship: **the stage becomes the instrument.** The ambient surface is no longer the backdrop to controls; it is the control. You play Equilibrium like a touch-responsive light — drag, hold, breathe — and the form-based interface becomes a fallback / accessibility / power-user companion.

**Tagline (internal):** *"Less interface, more instrument."*

The form interface (mood input, palette modal, audio lab) does not disappear — it is demoted to a drawer. This preserves the conversational entry point ("I am feeling overwhelmed with work today...") and the keyboard/screen-reader path, while letting the dominant interaction become *gestural and continuous* rather than *typed and discrete*.

---

## 2. Mental Model Shift

| Before | After |
|---|---|
| Form → engine → backdrop | **Stage gestures ↔ engine ↔ stage feedback** |
| Tabs are top-level navigation | Tabs are *modes of the same instrument* |
| Visualizer reads audio | Visualizer reads audio **and** writes user intent |
| Power-user controls live in header chrome | Header is brand + status only; tools live in a single drawer |
| Mobile = stacked dock + nav | Mobile = adaptive single bottom dock that morphs |
| `intensity` / `brightness` are sliders in `AudioLabSheet` | They are the **two primary axes of stage manipulation** |

The macro pipeline already exists in `src/lib/playback-macros.ts` (`applyPlaybackIntensityMacro`, `applyPlaybackBrightnessMacro`) and is wired through `computeEngineParams` in `src/App.tsx`. We are **not inventing new audio plumbing** — we are choosing to expose two existing macros as the dominant interaction.

---

## 3. Design Principles (non-negotiables)

1. **Calm beats clever.** Direct manipulation can easily feel like a toy. Every gesture must reinforce the "ritual instrument" feeling, not the "fidget" feeling. If a gesture provokes a pop, jump, or visual spike, it's wrong.
2. **The form path remains.** Mood text input, quick check-ins, and the audio lab stay reachable in ≤1 tap. We do not orphan keyboard or screen-reader users.
3. **Every gesture has a keyboard equivalent.** Stage gets `role="application"` semantics with arrow-key nudging, space to play/pause, etc. Documented in a single `useStageA11y` hook.
4. **No raw-param controls leak out of the lab.** The instrument exposes *macros* (intensity, brightness, palette, session intent). The 30+ raw params in `AudioLabSheet` stay opt-in expert territory.
5. **Audio responds with crossfade, never with steps.** Drag emits hundreds of events; we coalesce into a target and cross-ramp on idle. No zipper noise, no parameter pops.
6. **Reduced-motion is a first-class path, not an afterthought.** When `prefers-reduced-motion: reduce` is set, gestures degrade to discrete tap+commit interactions with no continuous animation.
7. **No regressions on perceived audio quality.** Engine parity tests (`src/lib/engine/parity*.test.ts`) and shadow comparisons (`src/lib/audio-shadow.ts`) continue to pass.

---

## 4. Architectural Approach

### 4.1 New layers we will introduce

```
src/
  lib/
    instrument/
      gesture-source.ts          // useStageGesture hook: pointer → {dx, dy, hold, keys}
      gesture-mapping.ts         // gesture → macro deltas (pure, testable)
      param-commit.ts            // throttle + RAF coalesce + release-ramp scheduler
      a11y.ts                    // keyboard equivalents, aria attrs, reduced-motion path
      motion-system.ts           // codified spring/easing constants (replaces ad-hoc)
  components/
    instrument/
      InstrumentStage.tsx        // upgraded AmbientStage: interactive, pointer-events: auto
      InstrumentHUD.tsx          // hover-revealed compass / readout overlay
      PaletteWheel.tsx           // long-press radial palette (replaces PaletteModal on stage)
      InstrumentDrawer.tsx       // slide-out home for mood input + tabs (form path)
      GestureHints.tsx           // first-run + low-confidence cursor hints
```

`AmbientStage` itself is preserved as the *visual* layer. `InstrumentStage` wraps it and adds the input layer. This lets us A/B-test (and roll back) by swapping a single component.

### 4.2 Data flow

```
Pointer/Touch/Keyboard event
        │
        ▼
useStageGesture (pointer capture, multi-touch arbiter)
        │  emits: { axisX: -1..1, axisY: -1..1, hold: bool, hue: number? }
        ▼
gesture-mapping (pure)
        │  emits: { intensity?: 0..1, brightness?: 0..1, paletteHint?: ... }
        ▼
useEngineParamCommit (throttle ~33ms, RAF-coalesce, schedule release ramp)
        │
        ▼
engineRef.applyParams(computeEngineParams(next), { rampSeconds })
        │
        ▼
Tone/WASM engine ──► Analyser ──► AudioVisualizer (existing path)
```

The pointer→param→audio→visualizer loop must close in **<60 ms perceived latency**. The visualizer's existing `mouseRef` proximity boost in `src/components/AudioVisualizer.tsx` already proves the rendering layer can react in real time to pointer state — we extend that.

### 4.3 Gesture vocabulary (v1)

| Gesture | Maps to | Notes |
|---|---|---|
| Cursor hover | Reveals HUD readout (current intensity/brightness/palette) | Auto-hides after 3s idle |
| Horizontal drag | `intensity` (motion / LFO depth / complexity) | Centered = current; release ramp 1.2s |
| Vertical drag | `brightness` (filter cutoff / harmonicity / reverb wet) | Up = brighter |
| Click + hold (>500ms) | Opens `PaletteWheel` at cursor | Drag inside wheel rotates hue selection |
| Two-finger pinch (touch) | `intensity` | Reserved alternative for touch ergonomics |
| Two-finger rotate (touch) | Palette hue rotate | Mobile-only; hold-wheel is desktop-only |
| Spacebar | Play/pause | Already supported via `togglePlay` — wire globally |
| Arrow keys | Nudge ±0.05 on intensity/brightness | A11y path |
| `P` key | Open palette wheel centered | A11y path |
| `M` key | Focus mood input in drawer | A11y path |
| Escape | Close drawer / wheel / lab | Standard |

---

## 5. Phased Plan

### Phase 0 — Foundations (preflight) · ~3 days

**Goal:** No user-visible change. Stand up the plumbing so later phases are pure feature work.

**Deliverables**

- `src/lib/instrument/param-commit.ts` — `useEngineParamCommit({ throttleMs, releaseRampSec })` hook. Coalesces drag-driven `applyParams` calls into one RAF; on idle (>120ms), schedules a final commit with `rampSeconds: releaseRampSec` so the engine glides to rest. Unit-tested with fake timers.
- `src/lib/instrument/gesture-source.ts` — `useStageGesture(ref, opts)` hook. Pointer Events API, `setPointerCapture`, multi-touch arbiter, `prefers-reduced-motion` short-circuit. Unit-tested.
- `src/lib/instrument/gesture-mapping.ts` — pure function `mapGestureToMacros(gesture, prevMacros) → macroDelta`. Pure → trivially testable.
- `src/lib/instrument/motion-system.ts` — single source of truth for spring constants currently scattered across `motion/react` calls. Refactor existing `whileHover={{ scale: 1.04 }}` etc. to reference these.
- `src/lib/instrument/a11y.ts` — keyboard mapping table + `useStageA11y` hook.

**Files touched (light):** `App.tsx` (imports only, no behavior change), several components migrated to `motion-system` constants.

**Acceptance**

- All new units have ≥90% line coverage.
- `tsc --noEmit` clean.
- Existing `vitest` suite still green.
- Lighthouse / perf budgets unchanged (no extra DOM, no new layers yet).

**Risks**

- Pointer Events API differences on Safari / iOS — mitigation: matrix-test in `src/__tests__/integration.test.tsx` with `@testing-library/user-event`.

---

### Phase 1 — Instrument Stage v1 (desktop / tablet) · ~1 week

**Goal:** Cursor on the stage *means something*. Drag changes the soundscape. The form path moves into a drawer, still reachable.

**Deliverables**

- `src/components/instrument/InstrumentStage.tsx` — wraps `AmbientStage`, sets `pointer-events: auto` on a transparent capture layer, mounts `useStageGesture` + `useEngineParamCommit`.
- `src/components/instrument/InstrumentHUD.tsx` — minimalist hover readout (mono numerals from new type scale, see Phase 3) showing `intensity · brightness · palette name`. Auto-hides 3s after pointer idle. Respects reduced motion.
- `src/components/instrument/PaletteWheel.tsx` — radial palette appearing at cursor on long-press; replaces `PaletteModal` *on the stage* (modal still accessible from drawer/lab).
- `src/components/instrument/InstrumentDrawer.tsx` — right-side slide-out drawer (desktop) holding `PracticeView`, `SessionView`, `ReflectView`, plus a "tools" handle. Default state: collapsed; opens on hover-edge / `M` key / mood-input-focus intent.
- `App.tsx` — replaces `<AmbientStage>` with `<InstrumentStage>`; routes form views into `<InstrumentDrawer>`. Header simplified (see Phase 3).

**Acceptance**

- I can play the app for 60 seconds without ever using the form path. Mouse/keyboard only.
- Form path is reachable in 1 keystroke (`M`) or 1 hover (drawer edge).
- Drag during playback produces **smooth audio crossfade** verified by ear and by `lastShadowDiagnostics` not regressing.
- Existing component tests for `PracticeView`, `SessionView`, `ReflectView` pass unchanged (they're now rendered inside the drawer).

**Risks**

- Drag intent collision with text selection on overlapping text. Mitigation: capture layer is transparent and *below* text DOM; gestures only activate on stage background regions.
- Power users may dislike losing immediate access to mood input. Mitigation: `localStorage` flag `equilibrium.instrument.drawerDefault = "open" | "closed"`, defaulting to `closed` for new users, `open` for existing.

---

### Phase 2 — Mobile Instrument (touch idiom) · ~1 week

**Goal:** Touch users get an instrument that respects single-thumb ergonomics. Bottom chrome consolidates.

**Deliverables**

- Touch gesture set wired in `useStageGesture`: one-finger drag → intensity/brightness; two-finger pinch → intensity (alt); two-finger rotate → palette hue; tap → toggle HUD; double-tap → play/pause.
- New unified mobile dock (replaces `MobileNowPlayingBar` + `MobilePrimaryNav`):
  - Collapsed: single pill with play/pause + status + tab indicator.
  - Expanded (tap or swipe-up): reveals tab nav, palette dots, lab handle.
  - Animated morph respects reduced motion (degrades to instant transition).
- Session-active state: play button morphs into a progress ring with phase glyph (settling/regulating/return).

**Files touched**

- `src/components/NowPlayingDock.tsx` — `MobileNowPlayingBar` deprecated; replaced by `src/components/instrument/MobileInstrumentDock.tsx`.
- `src/components/PrimaryNavigation.tsx` — `MobilePrimaryNav` deprecated; integrated into new dock.

**Acceptance**

- Bottom-of-screen vertical real estate goes from `9.5rem` to `~4.5rem` collapsed, `~9rem` expanded.
- Lighthouse mobile score not worse than current.
- Manual test pass on iOS Safari 17, Chrome Android.

**Risks**

- Two-finger gestures can conflict with browser pinch-zoom. Mitigation: `touch-action: none` only on the stage capture layer, not on the document.
- Discoverability of touch gestures. Mitigation: first-run hints in Phase 5.

---

### Phase 3 — Visual Language Evolution · ~4 days

**Goal:** Tighten the visual system to support the instrument's calmer, more spatial feel. Reduce reliance on opacity-on-opacity layering.

**Deliverables**

- `src/constants/visual-system.ts` extended:
  - **Density tier**: `comfortable` (instrument default) and `compact` (form/lab/drawer). Each surface picks one.
  - **Surface tiers**: `surface.base` / `surface.raised` / `surface.float` — replaces ad-hoc `bg-white/[0.03]` / `bg-white/[0.04]` / `bg-white/[0.08]` chaos with three named levels.
  - **Numeric/HUD type**: a single mono-numeral style for instrument readouts (`tabular-nums`, `text-[11px]`, `tracking-[0.14em]`).
  - **Instrument-only tokens**: `eq-cursor`, `eq-trail`, `eq-focus-aura`, `eq-wheel-stroke`.
- Type scale: drop the duplicated `text-[2.75rem]` / `text-[1.65rem]` headings to a 4-step ramp (`display`, `heading`, `subheading`, `eyebrow`).
- Audit and migrate **all** `bg-white/[0.0X]` / `border-white/[0.0Y]` literals to the new tiered tokens. Document the count migrated in the PR.
- `motion-system.ts` (Phase 0) gets documented constants and one short MD comment block at the top.

**Acceptance**

- Visual diff review: side-by-side screenshots show no aesthetic regression on Practice / Session / Reflect / AudioLab.
- `rg "bg-white/\[0\." src/components` returns 0 hits in components updated this phase.
- `tsc --noEmit` clean.

**Risks**

- Visual drift on screens we forget to update. Mitigation: storybook-lite — a single `dev` route that renders every component on one page; verify before merging.

---

### Phase 4 — Drawer & Secondary Surface Re-skin · ~5 days

**Goal:** The drawer, lab, palette modal, journal composer, and dialogs feel like *companions* to the instrument, not co-equal interfaces.

**Deliverables**

- `AudioLabSheet` re-skinned as bottom slide-up tray with two tiers: **macros visible by default**; **raw params behind "Expert" disclosure**.
- `JournalComposer` re-skinned as right-edge slide-in with the stage still visible behind a soft dim (instead of black overlay).
- `JournalHistoryPanel` becomes a peelable strip that doesn't displace the stage.
- `SessionCompleteDialog` becomes an in-stage moment (centered glass card, no dimming) — the stage continues to breathe behind it for ~5s before auto-dismiss option.
- `PaletteModal` retained as a11y/desktop fallback but visually realigned to the wheel idiom.

**Acceptance**

- Every secondary surface shares the same in/out motion grammar (defined in `motion-system.ts`).
- No surface fully obscures the stage anymore — calm continuity preserved.
- All existing tests in `src/components/__tests__/` pass with no behavior changes (only visual).

---

### Phase 5 — Onboarding / First-Run · ~3 days

**Goal:** A new user understands "this is an instrument" within 30 seconds, without a tutorial wall.

**Deliverables**

- `src/components/instrument/FirstRun.tsx` — 3 ambient steps, dismissable at any time:
  1. **"This is the breath."** — A ghost cursor demos a horizontal drag; the stage responds visibly.
  2. **"This is your voice."** — Drawer auto-opens; mood input pulses gently.
  3. **"This is your time."** — Session tab highlights briefly; intent picker appears.
- `localStorage` key `equilibrium.firstRun.completed = boolean`. Replayable from `AudioLabSheet`.
- Crisis-support link from `ReflectView` is preserved and surfaced once during first-run for safety.
- Telemetry: anonymous `firstRunStep:{1,2,3}.{viewed,skipped,completed}` events (opt-in, gated by a new privacy preference; see open question 6.2).

**Acceptance**

- New users (clean `localStorage`) see step 1 within 1.5s of first paint.
- Existing users do **not** see first-run.
- Skipping at any step does not interfere with normal use; `Escape` works.

---

### Phase 6 — Polish, Perf, Observability · ~4 days

**Goal:** Production hardening before flipping the rollout flag globally.

**Deliverables**

- Render-perf pass: instrument drag holds 60fps on M1/MacBook Air baseline; ≥45fps on iPhone 12 baseline. Verified by `performance.measure` traces.
- Audio-perf pass: confirm no glitches with rapid drag → `lastShadowDiagnostics` within tolerance over 10 minutes of continuous gesturing.
- Add `instrument.gesture.{intensity,brightness,palette,session}` events to interaction recording (`recordInteraction` in `App.tsx`) so future tuning has data.
- Feature-flag the entire instrument behind a runtime flag that mirrors the existing audio-engine rollout pattern in `apiFetch("/api/audio-rollout")`. Expose `instrument: "stage" | "form"` in `AudioRolloutState`.
- Docs: `docs/INSTRUMENT_MODE.md` covering gesture vocab, a11y path, and how to roll back.

**Acceptance**

- Feature flag flip-tested staging → 10% → 100%.
- No P0/P1 regressions in the test suite.
- Documented rollback procedure (one config change reverts to current Practice/Session/Reflect form UI).

---

## 6. Open Design Questions

1. **Drawer side: left or right on desktop?** Right keeps the brand/header on the left edge undisturbed; left matches the trend of "controls live where the keyboard hand reaches". *Default: right, revisit after Phase 1.*
2. **Telemetry consent.** We currently send no client telemetry. Adding even anonymous events deserves a separate small privacy review and an explicit opt-in switch in settings. *Default: do not ship telemetry in Phase 5; ship it in a follow-up only after consent UX is approved.*
3. **What happens to tabs?** Three options:
   a. Keep tabs in the drawer.
   b. Promote tabs to "modes" controlled from the dock; the drawer always shows the active mode's controls.
   c. Eliminate tabs; reflect/session are inferred from interaction (e.g. holding play opens session config).
   *Default: (a) for Phase 1; revisit before Phase 4.*
4. **Cursor representation.** Hide native cursor over the stage and draw a custom reticle? Higher cohesion, but accessibility and OS cursor preferences must be respected. *Default: keep native cursor; add a faint trail behind it.*
5. **Per-user gesture sensitivity.** Some users will want micro-precision; others coarse. *Default: ship a single tuning; add a preference only if Phase 6 telemetry shows wide variance in usage.*
6. **Should the engine selector (preview/wasm/auto) move out of `AppHeader`?** Yes — into the lab's expert disclosure. Header keeps brand + offline/sync status only.

---

## 7. Out of Scope (explicitly)

- Re-architecting the audio engine. The macro pipeline is the surface area.
- Server-side changes. No new API endpoints.
- A native shell beyond the existing Capacitor wrapping. Capacitor `App.addListener("resume", ...)` integration in `App.tsx` is preserved as-is.
- Theming (light mode, custom user themes). Stays dark-only.
- Multi-user or sharing features.
- Re-doing the audio visualizer's particle algorithm (we're adding input handling, not changing render).
- Any changes to `SyncIDB` / outbox / journals data layer.

---

## 8. Milestones & Checkpoints

| Milestone | After Phase | Demo deliverable |
|---|---|---|
| **M1: Plumbing green** | 0 | Internal demo: hooks/units, no UI change |
| **M2: Instrument v1 desktop** | 1 | Stakeholder review: cursor manipulates the stage |
| **M3: Mobile instrument** | 2 | Phone walkthrough video |
| **M4: Visual language locked** | 3 | Visual diff sign-off, design tokens documented |
| **M5: All surfaces aligned** | 4 | End-to-end UX walkthrough, all secondary surfaces re-skinned |
| **M6: Onboarded** | 5 | First-run video, fresh-localStorage flow |
| **M7: GA-ready** | 6 | Rollout flag at 100%, docs published, telemetry opt-in shipped or deferred |

Each milestone is a candidate point to **stop, ship, and reassess** if priorities change. M2 is the most important checkpoint — that's where we decide if instrument mode actually feels right.

---

## 9. Success Metrics

Quantitative (post-Phase 6, when telemetry is available):

- **Time-to-first-meaningful-interaction** (TTFMI) — median time from first paint to first param change. Target: <15s for new users (vs. estimated ~30s today, dominated by reading the mood input prompt).
- **Gesture share** — % of param changes coming from stage gestures vs. form. Target: ≥50% within first week of GA, ≥70% within first month.
- **Session-completion rate** — % of started sessions that reach the end (not pre-empted). Target: no regression vs. baseline.
- **No-glitch sessions** — `lastShadowDiagnostics.withinTolerance` rate during gesture-heavy sessions. Target: ≥99%.

Qualitative:

- A returning user's first sentence about the app changes from "AI music thing" to "instrument" or "soundscape thing".
- The Audio Lab is opened by ≤10% of sessions (because macros are now ambient).

---

## 10. Execution Order Cheat Sheet

```
Week 1:  Phase 0 (foundations)
Week 2:  Phase 1 (desktop instrument v1)             ◀ M2 checkpoint
Week 3:  Phase 2 (mobile instrument)
Week 4:  Phase 3 (visual language) + Phase 4 (drawer/secondary re-skin) — parallel tracks
Week 5:  Phase 5 (first-run) + Phase 6 (polish/perf/flag)
Week 6:  Bake / staged rollout / docs
```

Total: ~6 weeks elapsed, ~4-4.5 weeks of focused work.

---

## 11. Pre-Phase-0 Decisions Needed

Before we start writing code, please confirm:

1. **Direction of drawer on desktop** (right by default — see §6.1).
2. **Telemetry stance** — okay to defer all client telemetry to a follow-up plan? (recommended)
3. **Tab fate** — okay to keep tabs in the drawer for Phase 1 and decide their long-term fate at M5? (recommended)
4. **Custom cursor** — keep native cursor, add a soft trail? (recommended) Or hide native and draw fully custom?
5. **Rollback bar** — is "one config flag flips back to today's UI" the right rollback design, or do we want to keep both UIs co-existing for longer?

Once these are confirmed, Phase 0 can start.
