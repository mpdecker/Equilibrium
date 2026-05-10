import type { EvolutionSettings, AmbientParams } from "./music-schema.js";

export type JournalRow = { content: string };
export type InteractionRow = { userResponse: string; musicParams: unknown };

export type BuildGenerateMusicPromptInput = {
  mood: string;
  recentJournals: JournalRow[];
  recentInteractions: InteractionRow[];
  /** Compressed preference summary from recent labeled interactions */
  preferenceSummary?: string;
  settings: EvolutionSettings;
  currentParams: AmbientParams;
};

/**
 * Centralized prompt builder — snapshot-testable and safe for journal interpolation.
 */
export function buildGenerateMusicPrompt(input: BuildGenerateMusicPromptInput): string {
  const { mood, recentJournals, recentInteractions, preferenceSummary, settings, currentParams } =
    input;

  const journalLines =
    recentJournals.length > 0
      ? recentJournals.map((j) => `- ${sanitizeJournalLine(j.content)}`).join("\n")
      : "(none)";

  const interactionLines =
    recentInteractions.length > 0
      ? recentInteractions.map((i) => {
          const paramsSnippet = truncateMiddle(JSON.stringify(i.musicParams), 400);
          return `- Rated "${sanitizeJournalLine(i.userResponse)}" for music params: ${paramsSnippet}`;
        }).join("\n")
      : "(none)";

  const preferenceBlock =
    preferenceSummary && preferenceSummary.trim().length > 0
      ? preferenceSummary.trim()
      : "(none — personalize gently from mood and journals only)";

  const paramsSnippet = truncateMiddle(JSON.stringify(currentParams), 600);

  return `
You are an expert audio designer and psychological wellbeing assistant.
The user is listening to a generative ambient music application designed to foster mindfulness and emotional regulation.

Current user state/mood input: "${sanitizeJournalLine(mood)}"

Active synthesis snapshot (currentParams — preserve continuity unless mood clearly asks for change):
${paramsSnippet}

Recent Journal Entries (for deeper context into the user's emotional state):
${journalLines}

Recent Music Preferences (what the user liked/disliked recently):
${interactionLines}

Learned preference compression (derived from their feedback history — bias softly, never overwrite explicit mood):
${preferenceBlock}

Configuration Settings:
- Timbre Diversity: ${settings.timbreDiversity} (0 = very constrained/similar to current, 1 = explore very different timbres/textures)
- Evolution Speed: ${settings.evolutionSpeed} (how quickly things change)
- Feedback Subtlety: ${settings.feedbackSubtlety} (0 = direct, explicit questions; 1 = highly poetic, subtle, abstract reflections)

Also estimate normalized moodSignalIntent as JSON fields inside the response object (each 0 to 1):
- arousal: physiological activation
- valence: pleasantness (higher = more positive)
- tension: stress / tightness
- cognitiveLoad: mental effort / rumination
- grounding: sense of stability / embodiment

Based on this input and configuration, generate new audio and visual parameters to help the user reach an emotional equilibrium.
- If they are stressed, choose lower frequencies, slower LFOs, very wet/long decay reverb, calm colors (deep blues, greens, purples), high noiseAmount (brown noise), low harmonicity, low complexity, long attack/release.
- If they are sluggish/sad, perhaps slightly brighter frequencies, gentle major/lydian intervals, warmer colors, lower noiseAmount, medium harmonicity/modulation, medium complexity, shorter attack/release, higher chorus depth and phaser frequency.
- If they are focused/neutral, clean intervals (fifths, octaves), moderate LFO, clear colors, low noiseAmount, high harmonicity (glassy/FM), higher complexity (more movement/arpeggiation), moderate delay feedback.

Also, formulate a dynamic follow-up question and exactly 3 related, diverse response options to check in on the user's state after listening to this new soundscape for a few minutes.
The question and options MUST be highly customized to their specific current mood ("${sanitizeJournalLine(mood)}").
Adjust the phrasing and poetic nature based on the "Feedback Subtlety" setting.
- If subtlety is close to 0: Use direct, explicit, functional language (e.g., "Still stressed", "Feeling calm", "Too loud").
- If subtlety is close to 1: Use abstract, poetic, sensory language (e.g., "The current holds me", "Seeking more space", "Drifting upward").

Output strictly as a JSON object matching the provided schema. Always include all properties required by the schema, including moodSignalIntent with all five numeric dimensions.
`.trim();
}

function sanitizeJournalLine(s: string): string {
  return s.replace(/\r/g, " ").replace(/"/g, "'").trim().slice(0, 2000);
}

function truncateMiddle(s: string, max: number): string {
  if (s.length <= max) return s;
  const half = Math.floor(max / 2) - 2;
  return `${s.slice(0, half)}…${s.slice(-half)}`;
}
