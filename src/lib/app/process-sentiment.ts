import type { AmbientParams, EvolutionSettings } from "../synth";
import type { MoodSignalIntent } from "../signal-intent";
import type { ShadowComparisonResult } from "../audio-shadow";
import { newMutationId, postJournalOrQueue } from "../sync-queue";
import { apiFetch } from "../api-fetch";

export type ProcessSentimentResult = {
  envelope?: unknown;
  params: AmbientParams;
  moodSignalIntent?: MoodSignalIntent;
  feedbackPrompt: { question: string; options: string[] };
  shadow?: ShadowComparisonResult;
  explainLine?: string;
};

export type ProcessSentimentDeps = {
  getSoundSessionId: () => string | null;
  refreshOutboxCount: () => Promise<void>;
};

export async function processSentiment(
  mood: string,
  currentParams: AmbientParams,
  evolutionSettings: EvolutionSettings,
  deps: ProcessSentimentDeps,
): Promise<ProcessSentimentResult> {
  const soundSessionId = deps.getSoundSessionId();
  const sessionOpts = soundSessionId ? { sessionId: soundSessionId } : {};

  const offlineFallback: ProcessSentimentResult = {
    params: currentParams,
    moodSignalIntent: undefined,
    feedbackPrompt: {
      question: "How is this space feeling?",
      options: ["Centering", "A bit intense", "Need more uplift"],
    },
    explainLine:
      "You're offline. Your sound stays as-is; journaling and picks will sync when you're back online.",
  };

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const journalMutation = newMutationId();
      await postJournalOrQueue({
        content: mood,
        moodText: mood,
        clientMutationId: journalMutation,
        ...sessionOpts,
      });
      await deps.refreshOutboxCount();
      return offlineFallback;
    }

    const journalMutation = newMutationId();
    void postJournalOrQueue({
      content: mood,
      moodText: mood,
      clientMutationId: journalMutation,
      ...sessionOpts,
    }).then(() => deps.refreshOutboxCount());

    const response = await apiFetch("/api/generate-music", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(soundSessionId ? { "X-Session-Id": soundSessionId } : {}),
      },
      body: JSON.stringify({
        mood,
        currentParams,
        settings: evolutionSettings,
        ...sessionOpts,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate music");
    }
    const data = (await response.json()) as ProcessSentimentResult;
    return data;
  } catch (e) {
    console.error("Failed to generate music parameters", e);
    return {
      params: currentParams,
      moodSignalIntent: undefined,
      feedbackPrompt: {
        question: "How is this space feeling?",
        options: ["Centering", "A bit intense", "Need more uplift"],
      },
    };
  }
}
