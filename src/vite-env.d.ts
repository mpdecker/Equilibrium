/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin for `/api/*` (e.g. `https://api.example.com`). Empty = same-origin. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUDIO_ENGINE?: string;
  /** Enables WASM `noiseAt` only (noise spine; unified module `/wasm/equilibrium_dsp.wasm`). */
  readonly VITE_PREVIEW_WASM_NOISE?: string;
  /** Full preview mono block renderer in WASM (`renderBlock`; same WASM binary). */
  readonly VITE_PREVIEW_WASM_DSP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
