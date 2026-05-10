/** Format elapsed / remaining Wall-clock segments for timed sessions (progress 0..1). */

export type SessionClockLabels = {
  elapsedLabel: string;
  remainingLabel: string;
};

export function formatSessionClockLabels(progress01: number, durationMin: number): SessionClockLabels {
  const clamped = Math.max(0, Math.min(1, progress01));
  const totalSec = Math.max(0, durationMin * 60);
  const elapsedSec =
    totalSec <= 0 ? 0 : Math.min(Math.floor(totalSec), Math.round(clamped * totalSec));
  const remainingSec = Math.max(0, Math.round(totalSec) - elapsedSec);

  const fmt = (wholeSeconds: number) => {
    const m = Math.floor(wholeSeconds / 60);
    const r = wholeSeconds % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return {
    elapsedLabel: fmt(elapsedSec),
    remainingLabel: `${fmt(remainingSec)} left`,
  };
}
