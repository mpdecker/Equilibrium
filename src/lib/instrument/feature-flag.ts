/**
 * Instrument-mode feature flag.
 *
 * Resolution order (first hit wins):
 *  1. URL param `?instrument=stage|form` — for staging / debugging
 *  2. localStorage key `equilibrium.instrument.mode` — user preference
 *  3. `import.meta.env.VITE_INSTRUMENT_MODE` — build-time default
 *  4. Server rollout `/api/audio-rollout` field `instrument` (`stage`|`form`|`auto`)
 *     — parsed in {@link resolveInstrumentMode} after fetch in App
 *  5. Hard default: "stage" (instrument mode on by default)
 */

export type InstrumentMode = "stage" | "form";

/** Value returned by `/api/audio-rollout` for `instrument`. */
export type ServerInstrumentRolloutValue = "stage" | "form" | "auto";

export type InstrumentModeSource = "url" | "storage" | "env" | "server" | "default";

const STORAGE_KEY = "equilibrium.instrument.mode";
const URL_PARAM = "instrument";

export function parseRolloutInstrumentValue(v: unknown): ServerInstrumentRolloutValue | null {
  if (v === "stage" || v === "form" || v === "auto") return v;
  return null;
}

/**
 * Full precedence including server hint. Use after rollout fetch when URL and
 * storage did not pin a mode (`source` neither `url` nor `storage`).
 */
export function resolveInstrumentMode(opts: {
  serverInstrument: unknown;
}): { mode: InstrumentMode; source: InstrumentModeSource } {
  const fromUrl = readUrl();
  if (fromUrl) return { mode: fromUrl, source: "url" };
  const fromStorage = readStorage();
  if (fromStorage) return { mode: fromStorage, source: "storage" };
  const fromEnv = readEnv();
  if (fromEnv) return { mode: fromEnv, source: "env" };

  const s = parseRolloutInstrumentValue(opts.serverInstrument);
  if (s === "stage") return { mode: "stage", source: "server" };
  if (s === "form") return { mode: "form", source: "server" };

  return { mode: "stage", source: "default" };
}

/** Boot-time read — URL → storage → Vite env → default `stage` (server applied after fetch). */
export function readInstrumentMode(): InstrumentMode {
  const fromUrl = readUrl();
  if (fromUrl) return fromUrl;
  const fromStorage = readStorage();
  if (fromStorage) return fromStorage;
  const fromEnv = readEnv();
  if (fromEnv) return fromEnv;
  return "stage";
}

export function writeInstrumentMode(mode: InstrumentMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode */
  }
}

function readUrl(): InstrumentMode | null {
  if (typeof window === "undefined" || !window.location) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get(URL_PARAM);
    if (v === "stage" || v === "form") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function readStorage(): InstrumentMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "stage" || v === "form") return v;
  } catch {
    /* private mode */
  }
  return null;
}

function readEnv(): InstrumentMode | null {
  try {
    const v = import.meta.env?.VITE_INSTRUMENT_MODE as string | undefined;
    if (v === "stage" || v === "form") return v;
  } catch {
    /* node / vitest */
  }
  return null;
}

const DRAWER_KEY = "equilibrium.instrument.drawerOpen";

export type DrawerDefault = "open" | "closed";

export function readDrawerDefault(): DrawerDefault {
  try {
    const v = localStorage.getItem(DRAWER_KEY);
    if (v === "open" || v === "closed") return v;
  } catch {
    /* ignore */
  }
  return "closed";
}

export function writeDrawerDefault(state: DrawerDefault): void {
  try {
    localStorage.setItem(DRAWER_KEY, state);
  } catch {
    /* ignore */
  }
}
