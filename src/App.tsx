import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { useReducedMotion } from "motion/react";
import type { AmbientParams, EvolutionSettings } from "./lib/synth";
import { defaultParams, defaultSettings } from "./lib/synth";
import type { MoodSignalIntent } from "./lib/signal-intent";
import type { EngineAnalyserLike, IAmbientEngine } from "./lib/engine/types";
import { createAmbientEngine } from "./lib/engine/create-engine";
import { PracticeView } from "./components/PracticeView";
import { SessionView } from "./components/SessionView";
import { ReflectView } from "./components/ReflectView";
import { JourneyStepper } from "./components/JourneyStepper";
import type { ColorPaletteDef } from "./constants/color-palettes";
import { COLOR_PALETTES } from "./constants/color-palettes";
import type { ShadowComparisonResult } from "./lib/audio-shadow";
import {
  readDrawerDefault,
  readInstrumentMode,
  resolveInstrumentMode,
  parseRolloutInstrumentValue,
  writeDrawerDefault,
  type InstrumentMode,
  type ServerInstrumentRolloutValue,
} from "./lib/instrument/feature-flag";
import type { MacroState } from "./lib/instrument";
import {
  resolveRuntimeSynthesisMode,
  runtimeModeToEngineFlag,
  type RuntimeSynthesisMode,
} from "./lib/audio-engine-preference";
import { STORED_SYNTH_KEY, readStoredSynthesisPreference } from "./lib/app/synthesis-storage";
import { processSentiment } from "./lib/app/process-sentiment";
import { MOOD_CROSSFADE_SECONDS, PALETTE_CROSSFADE_SECONDS } from "./constants/audio-transitions";
import { AMBIENT_PARAMS_SCHEMA_VERSION } from "./lib/music-schema";
import {
  persistSoundscapeEnvelope,
  loadSoundscapeEnvelope,
  loadSoundscapeEnvelopeMerged,
  soundscapeTimestampMs,
} from "./lib/session-storage";
import { isSoundscapeEnvelope, toSoundscapeEnvelope } from "./lib/music-params-envelope";
import { apiFetch } from "./lib/api-fetch";
import { upsertBackendSession } from "./lib/backend-session";
import { postJournalOrQueue, postInteractionOrQueue, newMutationId } from "./lib/sync-queue";
import {
  readSessionNudgeSuppressSession,
  writeSessionNudgeSuppressSession,
} from "./lib/journey-session-nudge";
import type { PrimaryTabId } from "./components/PrimaryNavigation";
import { InstrumentAppLayout } from "./app/InstrumentAppLayout";
import { FormAppLayout } from "./app/FormAppLayout";
import { AppSharedModals } from "./app/AppSharedModals";
import type { AudioRolloutState } from "./app/audio-rollout-state";
import { useOutboxNetworkSync } from "./hooks/useOutboxNetworkSync";
import { useJournalList } from "./hooks/useJournalList";
import { useFeedbackPromptWhilePlaying } from "./hooks/useFeedbackPromptWhilePlaying";
import { useTimedSession } from "./hooks/useTimedSession";
import { FirstRun } from "./components/instrument/FirstRun";

export default function App() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [replayFirstRun, setReplayFirstRun] = useState(false);
  const gestureMacroStartRef = useRef<MacroState | null>(null);

  const engineRef = useRef<IAmbientEngine | null>(null);
  const lastMoodIntentRef = useRef<MoodSignalIntent | null>(null);
  const [analyser, setAnalyser] = useState<EngineAnalyserLike | null>(null);

  const storedSynth = readStoredSynthesisPreference();
  const [settings, setSettings] = useState<EvolutionSettings>(() => ({
    ...defaultSettings,
    ...(storedSynth ? { synthesisEngine: storedSynth } : {}),
  }));

  const [rollout, setRollout] = useState<AudioRolloutState | null>(null);
  const [lastShadowDiagnostics, setLastShadowDiagnostics] = useState<ShadowComparisonResult | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [params, setParams] = useState<AmbientParams>(defaultParams);
  const [moodInput, setMoodInput] = useState("");
  const [history, setHistory] = useState<{ time: string; mood: string; params: AmbientParams }[]>([]);

  const [showPaletteModal, setShowPaletteModal] = useState(false);

  const [dynamicPrompt, setDynamicPrompt] = useState<{ question: string; options: string[] } | null>(null);

  const [showJournal, setShowJournal] = useState(false);

  const [isComposingJournal, setIsComposingJournal] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  const [mainTab, setMainTab] = useState<PrimaryTabId>("practice");
  const [showAudioLab, setShowAudioLab] = useState(false);
  const [intensityPlayback, setIntensityPlayback] = useState(0.88);
  const [brightnessPlayback, setBrightnessPlayback] = useState(0.9);
  const [instrumentMode, setInstrumentMode] = useState<InstrumentMode>(() => readInstrumentMode());
  const [drawerOpen, setDrawerOpen] = useState<boolean>(() => readDrawerDefault() === "open");
  const [soundSessionId, setSoundSessionId] = useState<string | null>(null);
  const soundSessionIdRef = useRef<string | null>(null);
  soundSessionIdRef.current = soundSessionId;
  const [explainLine, setExplainLine] = useState<string | null>(null);

  /** Post-compose nudge toward Session (tab-session capped via sessionStorage). */
  const [offerSessionNudge, setOfferSessionNudge] = useState(false);

  const { netOnline, outboxPending, outboxSyncing, refreshOutboxCount } = useOutboxNetworkSync();
  const { journals, loadJournals } = useJournalList(showJournal, soundSessionId);

  useEffect(() => {
    if (!soundSessionId || soundSessionId.length < 8) return;
    const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
    if (!online) return;
    const env = loadSoundscapeEnvelope();
    void upsertBackendSession({
      sessionId: soundSessionId,
      ...(env && env.sessionId === soundSessionId ? { soundscapeEnvelope: env } : {}),
    });
  }, [soundSessionId]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const intensityPlaybackRef = useRef(0.88);
  const brightnessPlaybackRef = useRef(0.9);
  intensityPlaybackRef.current = intensityPlayback;
  brightnessPlaybackRef.current = brightnessPlayback;

  const { showFeedbackPrompt, setShowFeedbackPrompt } = useFeedbackPromptWhilePlaying(
    isPlaying,
    settings.evolutionSpeed,
  );

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const {
    sessionIntentPick,
    setSessionIntentPick,
    sessionDurationPick,
    setSessionDurationPick,
    sessionActive,
    sessionActiveRef,
    sessionCompleteOpen,
    setSessionCompleteOpen,
    sessionProgress,
    sessionA11yTip,
    sessionBaseParamsRef,
    computeEngineParams,
    beginTimedSession,
    endTimedSession,
  } = useTimedSession({
    intensityPlaybackRef,
    brightnessPlaybackRef,
    engineRef,
    paramsRef,
    isPlayingRef,
    isPlaying,
    setIsPlaying,
    setIsStarting,
    setAnalyser,
  });

  const clientEnginePlaybackRef = useRef<"tone" | "stub" | "wasm">("tone");

  const resolvedRuntime: RuntimeSynthesisMode = useMemo(() => {
    const eff = rollout?.effectiveEngine ?? "tone";
    return resolveRuntimeSynthesisMode(settings.synthesisEngine, eff);
  }, [settings.synthesisEngine, rollout?.effectiveEngine]);

  useEffect(() => {
    clientEnginePlaybackRef.current = resolvedRuntime === "preview" ? "stub" : resolvedRuntime;
  }, [resolvedRuntime]);

  useEffect(() => {
    try {
      localStorage.setItem(STORED_SYNTH_KEY, settings.synthesisEngine);
    } catch {
      /* ignore */
    }
  }, [settings.synthesisEngine]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch("/api/audio-rollout")
      .then((r) => r.json())
      .then((body: unknown) => {
        if (cancelled || !body || typeof body !== "object") return;
        const o = body as Record<string, unknown>;
        const rawEff = o.effectiveEngine === "stub" ? "stub" : o.effectiveEngine === "wasm" ? "wasm" : "tone";
        const eff: AudioRolloutState["effectiveEngine"] = rawEff;
        const instrument: ServerInstrumentRolloutValue = parseRolloutInstrumentValue(o.instrument) ?? "auto";
        setRollout({
          engine: typeof o.engine === "string" ? o.engine : "tone",
          effectiveEngine: eff,
          shadowMode: o.shadowMode === true,
          schemaVersion: typeof o.schemaVersion === "number" ? o.schemaVersion : 1,
          instrument,
        });
        const resolved = resolveInstrumentMode({ serverInstrument: instrument });
        if (resolved.source !== "url" && resolved.source !== "storage") {
          setInstrumentMode(resolved.mode);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const flag = runtimeModeToEngineFlag(resolvedRuntime);
    const engine = createAmbientEngine({ engineMode: flag });
    engineRef.current = engine;
    setAnalyser(engine.getAnalyser());
    engine.applyParams(computeEngineParams(paramsRef.current));
    engine.applyEvolutionSettings(settingsRef.current);

    let cancelled = false;
    const resume = async () => {
      if (!isPlayingRef.current || cancelled) return;
      await Tone.start();
      await engine.start();
      engine.applyParams(computeEngineParams(paramsRef.current));
      engine.applyEvolutionSettings(settingsRef.current);
    };
    void resume();

    return () => {
      cancelled = true;
      engine.stop();
      engine.dispose();
      engineRef.current = null;
    };
  }, [resolvedRuntime, computeEngineParams]);

  useEffect(() => {
    const sync = loadSoundscapeEnvelope();
    if (sync?.params) {
      setParams(sync.params);
      setSoundSessionId(sync.sessionId);
      if (sync.moodSignalIntent) lastMoodIntentRef.current = sync.moodSignalIntent;
    }

    let cancelled = false;
    void loadSoundscapeEnvelopeMerged().then((merged) => {
      if (cancelled || !merged?.params) return;
      const syncTs = sync ? soundscapeTimestampMs(sync) : -1;
      if (soundscapeTimestampMs(merged) > syncTs) {
        setParams(merged.params);
        setSoundSessionId(merged.sessionId);
        if (merged.moodSignalIntent) lastMoodIntentRef.current = merged.moodSignalIntent;
        persistSoundscapeEnvelope(merged);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPlaying && engineRef.current) {
      const base = sessionBaseParamsRef.current ?? paramsRef.current;
      engineRef.current.applyParams(computeEngineParams(base));
    }
  }, [brightnessPlayback, intensityPlayback, isPlaying, computeEngineParams]);

  const saveJournalEntry = async () => {
    if (!composeText.trim()) return;
    setIsSavingJournal(true);
    try {
      const mutationId = newMutationId();
      const body = {
        content: composeText.trim(),
        clientMutationId: mutationId,
        ...(soundSessionIdRef.current ? { sessionId: soundSessionIdRef.current } : {}),
      };
      await postJournalOrQueue(body);
      setComposeText("");
      setIsComposingJournal(false);
      await refreshOutboxCount();
      await loadJournals();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingJournal(false);
    }
  };

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyEvolutionSettings(settings);
    }
  }, [settings]);

  const recordInteraction = async (
    musicParams: AmbientParams,
    userResponse: string,
    moodSignalIntent?: MoodSignalIntent | null,
  ) => {
    const envelope = toSoundscapeEnvelope({
      params: musicParams,
      moodSignalIntent: moodSignalIntent ?? undefined,
      sessionId: soundSessionIdRef.current ?? undefined,
    });
    try {
      const mutationId = newMutationId();
      await postInteractionOrQueue({
        musicParams: envelope,
        userResponse,
        clientMutationId: mutationId,
        ...(moodSignalIntent ? { moodSignalIntent } : {}),
        ...(soundSessionIdRef.current ? { sessionId: soundSessionIdRef.current } : {}),
        clientEngine: clientEnginePlaybackRef.current,
        schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
      });
      await refreshOutboxCount();
    } catch (e) {
      console.error("Failed to save interaction", e);
    }
  };

  const recordInstrumentGesture = useCallback(
    async (gestureTag: string) => {
      const envelope = toSoundscapeEnvelope({
        params: paramsRef.current,
        moodSignalIntent: lastMoodIntentRef.current ?? undefined,
        sessionId: soundSessionIdRef.current ?? undefined,
      });
      try {
        await postInteractionOrQueue({
          musicParams: envelope,
          userResponse: `instrument.gesture.${gestureTag}`,
          clientMutationId: newMutationId(),
          ...(soundSessionIdRef.current ? { sessionId: soundSessionIdRef.current } : {}),
          clientEngine: clientEnginePlaybackRef.current,
          schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
        });
        await refreshOutboxCount();
      } catch (e) {
        console.error("Failed to record instrument gesture", e);
      }
    },
    [refreshOutboxCount],
  );

  const submitMood = async (mood: string, isFeedback = false) => {
    if (!mood.trim() || isAnalyzing) return;

    if (isFeedback) {
      await recordInteraction(params, mood, lastMoodIntentRef.current);
    }

    setIsAnalyzing(true);
    const result = await processSentiment(mood, params, settings, {
      getSoundSessionId: () => soundSessionIdRef.current,
      refreshOutboxCount,
    });

    lastMoodIntentRef.current = result.moodSignalIntent ?? null;

    setLastShadowDiagnostics(
      result.shadow &&
        typeof result.shadow === "object" &&
        "withinTolerance" in result.shadow
        ? (result.shadow as ShadowComparisonResult)
        : null,
    );

    setExplainLine(typeof result.explainLine === "string" ? result.explainLine : null);

    if (result.envelope && isSoundscapeEnvelope(result.envelope)) {
      persistSoundscapeEnvelope(result.envelope);
      setSoundSessionId(result.envelope.sessionId);
    }

    if (sessionActive) {
      sessionBaseParamsRef.current = { ...result.params };
    }

    setParams(result.params);
    setDynamicPrompt(result.feedbackPrompt);

    setHistory((prev) => [...prev, { time: new Date().toISOString(), mood: mood, params: result.params }]);

    if (engineRef.current && isPlaying) {
      engineRef.current.applyParams(computeEngineParams(result.params), {
        rampSeconds: MOOD_CROSSFADE_SECONDS,
      });
    }

    setMoodInput("");
    setIsAnalyzing(false);
    setShowFeedbackPrompt(false);

    if (
      !isFeedback &&
      isPlayingRef.current &&
      !sessionActiveRef.current &&
      !readSessionNudgeSuppressSession()
    ) {
      setOfferSessionNudge(true);
    }
  };

  const togglePlay = async () => {
    if (!engineRef.current || isStarting) return;

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      setIsStarting(true);
      try {
        await Tone.start();
        await engineRef.current.start();
        setAnalyser(engineRef.current.getAnalyser());
        engineRef.current.applyParams(computeEngineParams(params));
        setIsPlaying(true);
      } catch (e) {
        console.error("Failed to start audio engine:", e);
      } finally {
        setIsStarting(false);
      }
    }
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMood(moodInput);
  };

  const openPaletteFromLab = useCallback(() => {
    setShowAudioLab(false);
    setShowPaletteModal(true);
  }, []);

  const commitEngineParams = useCallback(
    (next: AmbientParams) => {
      setParams(next);
      if (engineRef.current) {
        engineRef.current.applyParams(computeEngineParams(next));
      }
    },
    [computeEngineParams],
  );

  const handlePalettePick = useCallback(
    (palette: ColorPaletteDef) => {
      const newParams = { ...paramsRef.current, colorPalette: palette.colors, ...palette.params };
      setParams(newParams);
      if (engineRef.current && isPlayingRef.current) {
        engineRef.current.applyParams(computeEngineParams(newParams), {
          rampSeconds: PALETTE_CROSSFADE_SECONDS,
        });
      }
      setShowPaletteModal(false);
      void recordInstrumentGesture("palette");
    },
    [computeEngineParams, recordInstrumentGesture],
  );

  const instrumentMacros = useMemo<MacroState>(
    () => ({ intensity: intensityPlayback, brightness: brightnessPlayback }),
    [intensityPlayback, brightnessPlayback],
  );

  const handleMacrosDrag = useCallback((next: MacroState) => {
    if (gestureMacroStartRef.current === null) {
      gestureMacroStartRef.current = {
        intensity: intensityPlaybackRef.current,
        brightness: brightnessPlaybackRef.current,
      };
    }
    intensityPlaybackRef.current = next.intensity;
    brightnessPlaybackRef.current = next.brightness;
  }, []);

  const handleMacrosRelease = useCallback(
    (final: MacroState) => {
      const start = gestureMacroStartRef.current;
      gestureMacroStartRef.current = null;
      intensityPlaybackRef.current = final.intensity;
      brightnessPlaybackRef.current = final.brightness;
      setIntensityPlayback(final.intensity);
      setBrightnessPlayback(final.brightness);
      if (start) {
        const eps = 0.004;
        const parts: string[] = [];
        if (Math.abs(final.intensity - start.intensity) > eps) parts.push("intensity");
        if (Math.abs(final.brightness - start.brightness) > eps) parts.push("brightness");
        if (parts.length) void recordInstrumentGesture(parts.join("+"));
      }
    },
    [recordInstrumentGesture],
  );

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    writeDrawerDefault("open");
  }, []);

  const handleFocusMoodInput = useCallback(() => {
    setMainTab("practice");
    openDrawer();
    window.setTimeout(() => {
      const el = document.getElementById("mood-input") as HTMLInputElement | null;
      el?.focus();
    }, 80);
  }, [openDrawer]);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    writeDrawerDefault(open ? "open" : "closed");
  }, []);

  const dismissSessionNudge = useCallback(() => {
    writeSessionNudgeSuppressSession();
    setOfferSessionNudge(false);
  }, []);

  const openSessionFromNudge = useCallback(() => {
    writeSessionNudgeSuppressSession();
    setOfferSessionNudge(false);
    setMainTab("session");
    if (instrumentMode === "stage") openDrawer();
  }, [instrumentMode, openDrawer]);

  const handlePaletteHintAdvance = useCallback(
    (delta: number) => {
      if (!delta) return;
      const currentIdx = COLOR_PALETTES.findIndex(
        (p) =>
          p.colors[0] === paramsRef.current.colorPalette[0] &&
          p.colors[1] === paramsRef.current.colorPalette[1] &&
          p.colors[2] === paramsRef.current.colorPalette[2],
      );
      const start = currentIdx >= 0 ? currentIdx : 0;
      const next = (start + delta + COLOR_PALETTES.length * 100) % COLOR_PALETTES.length;
      handlePalettePick(COLOR_PALETTES[next]);
    },
    [handlePalettePick],
  );

  const playbackStatusLine = isStarting
    ? "Waking up engine..."
    : isPlaying
      ? "Synthesizing generative audio..."
      : "Engine paused";

  const journeyTrail = useMemo(
    () => (
      <JourneyStepper
        activeTab={mainTab}
        recommendSession={
          (!!soundSessionId || history.length > 0) && !sessionActive && mainTab === "practice"
        }
        onSelect={(id) => {
          setMainTab(id);
          if (instrumentMode === "stage") openDrawer();
        }}
      />
    ),
    [mainTab, soundSessionId, history.length, sessionActive, instrumentMode, openDrawer],
  );

  const tabContent =
    mainTab === "practice" ? (
      <PracticeView
        isPlaying={isPlaying}
        isAnalyzing={isAnalyzing}
        moodInput={moodInput}
        explainLine={explainLine}
        dynamicPrompt={dynamicPrompt}
        showFeedbackPrompt={showFeedbackPrompt}
        onMoodInputChange={setMoodInput}
        onMoodSubmit={handleMoodSubmit}
        onQuickMood={(mood) => void submitMood(mood)}
        onFeedbackOption={(opt) => void submitMood(opt, true)}
        sessionNudgeVisible={offerSessionNudge && mainTab === "practice"}
        onDismissSessionNudge={dismissSessionNudge}
        onOpenSessionFromNudge={openSessionFromNudge}
      />
    ) : mainTab === "session" ? (
      <SessionView
        sessionIntentPick={sessionIntentPick}
        sessionDurationPick={sessionDurationPick}
        sessionActive={sessionActive}
        isStarting={isStarting}
        sessionProgress={sessionProgress}
        onDurationPick={setSessionDurationPick}
        onIntentPick={setSessionIntentPick}
        onBeginSession={() => {
          void recordInstrumentGesture("session");
          void beginTimedSession();
        }}
        onEndSession={endTimedSession}
      />
    ) : (
      <ReflectView
        onLeaveFeedback={() => {
          setMainTab("practice");
          if (instrumentMode === "stage") openDrawer();
        }}
        onJournal={() => setIsComposingJournal(true)}
        onHistory={() => setShowJournal(true)}
      />
    );

  const sharedModals = (
    <AppSharedModals
      showPaletteModal={showPaletteModal}
      onClosePaletteModal={() => setShowPaletteModal(false)}
      onSelectPalette={handlePalettePick}
      isComposingJournal={isComposingJournal}
      composeText={composeText}
      isSavingJournal={isSavingJournal}
      onComposeTextChange={setComposeText}
      onCloseJournalComposer={() => setIsComposingJournal(false)}
      onSaveJournal={saveJournalEntry}
      showAudioLab={showAudioLab}
      onCloseAudioLab={() => setShowAudioLab(false)}
      resolvedRuntime={resolvedRuntime}
      rollout={rollout}
      lastShadowDiagnostics={lastShadowDiagnostics}
      isPlaying={isPlaying}
      isStarting={isStarting}
      onTogglePlay={togglePlay}
      intensityPlayback={intensityPlayback}
      onIntensityChange={setIntensityPlayback}
      brightnessPlayback={brightnessPlayback}
      onBrightnessChange={setBrightnessPlayback}
      onOpenPalettesFromLab={openPaletteFromLab}
      params={params}
      onParamsChange={commitEngineParams}
      settings={settings}
      onSettingsChange={setSettings}
      sessionCompleteOpen={sessionCompleteOpen}
      onCloseSessionComplete={() => setSessionCompleteOpen(false)}
      onSessionCompleteFeedback={(feedback) =>
        recordInteraction(params, feedback, lastMoodIntentRef.current)
      }
      onSessionCompleteReflect={() => {
        setSessionCompleteOpen(false);
        setMainTab("reflect");
        if (instrumentMode === "stage") openDrawer();
      }}
      onSessionCompleteJournal={() => {
        setSessionCompleteOpen(false);
        setIsComposingJournal(true);
        if (instrumentMode === "stage") openDrawer();
      }}
      onReplayWalkthrough={() => {
        setShowAudioLab(false);
        setReplayFirstRun(true);
      }}
    />
  );

  if (instrumentMode === "stage") {
    return (
      <>
      <InstrumentAppLayout
        sessionA11yTip={sessionA11yTip}
        params={params}
        settings={settings}
        isPlaying={isPlaying}
        isStarting={isStarting}
        prefersReducedMotion={prefersReducedMotion}
        analyser={analyser}
        engineRef={engineRef}
        computeEngineParams={computeEngineParams}
        instrumentMacros={instrumentMacros}
        handleMacrosDrag={handleMacrosDrag}
        handleMacrosRelease={handleMacrosRelease}
        handlePalettePick={handlePalettePick}
        togglePlay={togglePlay}
        handleFocusMoodInput={handleFocusMoodInput}
        handlePaletteHintAdvance={handlePaletteHintAdvance}
        isComposingJournal={isComposingJournal}
        showPaletteModal={showPaletteModal}
        showAudioLab={showAudioLab}
        netOnline={netOnline}
        outboxPending={outboxPending}
        outboxSyncing={outboxSyncing}
        showJournal={showJournal}
        onOpenDrawer={openDrawer}
        onOpenDrawerAndCompose={() => {
          openDrawer();
          setIsComposingJournal(true);
        }}
        onToggleJournal={() => setShowJournal(!showJournal)}
        onOpenAudioLab={() => setShowAudioLab(true)}
        journals={journals}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={handleDrawerOpenChange}
        journeyTrail={journeyTrail}
        mainTab={mainTab}
        onMainTabChange={setMainTab}
        tabContent={tabContent}
        playbackStatusLine={playbackStatusLine}
        sessionProgress={sessionProgress}
        sessionDurationPick={sessionDurationPick}
        onOpenPalettes={() => setShowPaletteModal(true)}
        sharedModals={sharedModals}
      />
      <FirstRun
        prefersReducedMotion={prefersReducedMotion}
        forceOpen={replayFirstRun ? true : undefined}
        onComplete={() => setReplayFirstRun(false)}
      />
      </>
    );
  }

  return (
    <>
    <FormAppLayout
      sessionA11yTip={sessionA11yTip}
      params={params}
      settings={settings}
      isPlaying={isPlaying}
      prefersReducedMotion={prefersReducedMotion}
      analyser={analyser}
      sharedModals={sharedModals}
      netOnline={netOnline}
      outboxPending={outboxPending}
      outboxSyncing={outboxSyncing}
      showJournal={showJournal}
      showAudioLab={showAudioLab}
      onWrite={() => setIsComposingJournal(true)}
      onToggleJournal={() => setShowJournal(!showJournal)}
      onOpenAudioLab={() => setShowAudioLab(true)}
      journals={journals}
      journeyTrail={journeyTrail}
      mainTab={mainTab}
      onMainTabChange={setMainTab}
      tabContent={tabContent}
      playbackStatusLine={playbackStatusLine}
      isStarting={isStarting}
      sessionProgress={sessionProgress}
      sessionDurationPick={sessionDurationPick}
      onTogglePlay={togglePlay}
      onOpenPalettes={() => setShowPaletteModal(true)}
    />
    <FirstRun
      prefersReducedMotion={prefersReducedMotion}
      forceOpen={replayFirstRun ? true : undefined}
      onComplete={() => setReplayFirstRun(false)}
    />
    </>
  );
}
