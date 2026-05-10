# Audio Runtime Spike — Decision Memo

**Status:** Phase 0 complete (comparative analysis without binding production code to one native stack yet).

## Goal

Select a primary synthesis runtime for migrating off pure Tone.js while preserving web delivery and enabling stronger deterministic testing.

## Candidates Evaluated

| Criterion | Tone.js (baseline) | Rust DSP → WASM + AudioWorklet | SuperCollider + OSC bridge |
|-----------|-------------------|---------------------------------|----------------------------|
| Signal quality ceiling | Moderate; abstraction overhead | High; sample-accurate custom DSP | Very high; mature UGens |
| Browser fit | Native | Strong (WASM worklets) | Requires sidecar/service |
| Latency / jitter | Good | Excellent in-worklet | Network-dependent |
| Deterministic testing | Hard (random + Transport) | Strong with seeded RNG + offline buffers | Medium (OSC timing) |
| Team operational cost | Lowest | Medium (Rust + WASM pipeline) | Higher (process lifecycle) |
| Migration effort | — | Medium–high | Medium (control-plane split) |

## Benchmark Scenarios (conceptual)

Representative moods drive parameter sets aligned with current `AmbientParams`:

1. **Calm / grounded** — low `baseFrequency`, low `lfoSpeed`, high `reverbWet`, brown noise bias.
2. **Focused** — moderate brightness, higher `harmonicity`, moderate `complexity` and delay.
3. **Stressed** — strong low-frequency bias, reduced `complexity`, longer envelopes, wet/long decay.

These scenarios inform parity harness tests (fingerprints + bounds), not raw PCM bit-exact matching.

## Recommendation

**Primary target:** **Rust DSP core compiled to WebAssembly, hosted in an AudioWorklet**, with TypeScript as control plane only.

**Rationale:** Best balance of sound-quality headroom, in-browser deployment (matches current product), and testability (deterministic WASM + buffer-level assertions). SuperCollider remains a strong prototyping reference but is deferred as the default production path due to operational complexity.

**Explicit non-goals for v1 port**

- Bit-exact parity with Tone.js (aim for perceptual/feature parity within tolerances).
- Real-time ML inference inside the audio thread.
- Desktop-only JUCE path (optional future track).

## Next Steps

See repository implementation: canonical music schema (`src/lib/music-schema.ts`), parity harness (`src/lib/audio-fingerprint.ts`, `src/lib/engine/parity.ts`), engine adapter (`src/lib/engine/types.ts`), and rollout flags (`src/lib/feature-flags.ts`).
