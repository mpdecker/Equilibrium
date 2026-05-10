const STORAGE_KEY = "equilibrium.audioLab.expert";

/** Whether expert (agentic evolution + advanced sound design) blocks are disclosed. */
export function readAudioLabExpertOpen(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "1";
  } catch {
    /* private mode */
    return false;
  }
}

export function writeAudioLabExpertOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
