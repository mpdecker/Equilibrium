/**
 * Thin Capacitor bridge — native shell only. Audio always runs in the shared WebView
 * path (Tone / worklet / preview); this module never forks synthesis.
 */

export function isNativeApp(): boolean {
  try {
    // Sync check via global Capacitor when available (injected by native shell).
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap && typeof cap.isNativePlatform === "function") {
      return cap.isNativePlatform();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Soft checkpoint pulse for timed sessions (Haptics on native, Vibration API on web). */
export async function pulseSessionCheckpoint(durationMs = 14): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
  } catch {
    /* plugin missing or web */
  }
  try {
    navigator.vibrate?.(durationMs);
  } catch {
    /* unsupported */
  }
}

/** Status bar + future shell polish — safe no-op on web. */
export async function bootstrapNativeShell(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0a0502" });
    } catch {
      /* optional plugin */
    }
  } catch {
    /* web */
  }
}
