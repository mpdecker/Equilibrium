import { unwrapMusicParams } from "./music-params-envelope.js";
import type { AmbientParams } from "./music-schema.js";

export type InteractionLike = { userResponse: string; musicParams: unknown };

const POSITIVE =
  /^(yes|good|great|better|calm|centering|help|helps|nice|love|perfect|soothe|relax|peace|soft|gentle|thank)/i;
const NEGATIVE =
  /^(no|bad|worse|too|intense|loud|overwhelm|anxious|hate|skip|harsh|sharp|grating|stop)/i;

/** Keywords suggesting low-arousal preference (bias complexity/noise down slightly). */
const CALMISH = /\b(calm|quiet|soft|sleep|rest|still|gentle|slow)\b/i;
/** Keywords suggesting focus / clarity preference (bias noise down, modulation moderate). */
const FOCUSISH = /\b(focus|study|work|clear|sharp|alert|concentrat)\b/i;

function sentimentBucket(text: string): "positive" | "negative" | "neutral" {
  const t = text.trim();
  if (!t) return "neutral";
  if (POSITIVE.test(t)) return "positive";
  if (NEGATIVE.test(t)) return "negative";
  return "neutral";
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Compress recent labeled interactions into a short prompt fragment for personalization v0.
 */
export function buildPreferenceSummaryFromInteractions(
  rows: InteractionLike[],
  maxChars = 900,
): string {
  const positiveParams: AmbientParams[] = [];
  const negativeHints: string[] = [];
  const calmVotes = { calm: 0, focus: 0 };

  for (const row of rows) {
    const t = row.userResponse.trim();
    if (t.startsWith("instrument.gesture.")) continue;
    const bucket = sentimentBucket(row.userResponse);
    const params = unwrapMusicParams(row.musicParams);
    if (bucket === "positive") {
      positiveParams.push(params);
      const t = row.userResponse.trim();
      if (CALMISH.test(t)) calmVotes.calm++;
      if (FOCUSISH.test(t)) calmVotes.focus++;
    } else if (bucket === "negative") {
      negativeHints.push(row.userResponse.trim().slice(0, 120));
    }
  }

  if (positiveParams.length === 0 && negativeHints.length === 0) {
    return "";
  }

  const lines: string[] = [];

  if (positiveParams.length > 0) {
    lines.push(
      `User tends to respond well to soundscapes near these averages (use as gentle bias, not hard constraints): complexity≈${avg(positiveParams.map((p) => p.complexity)).toFixed(2)}, noiseAmount≈${avg(positiveParams.map((p) => p.noiseAmount)).toFixed(2)}, reverbWet≈${avg(positiveParams.map((p) => p.reverbWet)).toFixed(2)}, baseFrequency≈${Math.round(avg(positiveParams.map((p) => p.baseFrequency)))}Hz, harmonicity≈${avg(positiveParams.map((p) => p.harmonicity)).toFixed(2)}, modulationIndex≈${avg(positiveParams.map((p) => p.modulationIndex)).toFixed(2)}, chorusDepth≈${avg(positiveParams.map((p) => p.chorusDepth)).toFixed(2)}, phaserFreq≈${avg(positiveParams.map((p) => p.phaserFrequency)).toFixed(2)}, delayFeedback≈${avg(positiveParams.map((p) => p.delayFeedback)).toFixed(2)}.`,
    );
  }

  if (calmVotes.calm > 0 || calmVotes.focus > 0) {
    const parts: string[] = [];
    if (calmVotes.calm > calmVotes.focus)
      parts.push("recent calming language — prefer softer evolution and conservative highs");
    else if (calmVotes.focus > calmVotes.calm)
      parts.push("recent focus language — lean clearer beds, avoid muddy washes");
    else parts.push("mixed calm/focus cues — keep contrast moderate");
    lines.push(`Interaction tone: ${parts[0]}.`);
  }

  if (negativeHints.length > 0) {
    lines.push(
      `Recent friction phrases (avoid repeating similar harshness): ${negativeHints.slice(0, 4).join(" · ")}.`,
    );
  }

  const out = lines.join("\n").trim();
  return out.length > maxChars ? `${out.slice(0, maxChars - 1)}…` : out;
}
