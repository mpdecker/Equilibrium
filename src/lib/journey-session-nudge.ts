/** Suppress Practice → Session nudge for remainder of browser tab session. */
export const SESSION_NUDGE_SUPPRESS_SESSION_KEY = "equilibrium.journey.sessionNudge.suppress";

export function readSessionNudgeSuppressSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_NUDGE_SUPPRESS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSessionNudgeSuppressSession(): void {
  try {
    sessionStorage.setItem(SESSION_NUDGE_SUPPRESS_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}
