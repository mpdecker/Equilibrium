import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import * as Tone from "tone";
import type { AmbientParams } from "../lib/synth";
import type { EngineAnalyserLike, IAmbientEngine } from "../lib/engine/types";
import type { SessionIntent } from "../lib/session-arc";
import { applySessionArcToParams } from "../lib/session-arc";
import {
  applyPlaybackBrightnessMacro,
  applyPlaybackIntensityMacro,
} from "../lib/playback-macros";

type UseTimedSessionOptions = {
  intensityPlaybackRef: MutableRefObject<number>;
  brightnessPlaybackRef: MutableRefObject<number>;
  engineRef: MutableRefObject<IAmbientEngine | null>;
  paramsRef: MutableRefObject<AmbientParams>;
  isPlayingRef: MutableRefObject<boolean>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  setIsStarting: (v: boolean) => void;
  setAnalyser: (a: EngineAnalyserLike | null) => void;
};

export function useTimedSession({
  intensityPlaybackRef,
  brightnessPlaybackRef,
  engineRef,
  paramsRef,
  isPlayingRef,
  isPlaying,
  setIsPlaying,
  setIsStarting,
  setAnalyser,
}: UseTimedSessionOptions) {
  const [sessionIntentPick, setSessionIntentPick] = useState<SessionIntent>("regulate");
  const [sessionDurationPick, setSessionDurationPick] = useState(10);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCompleteOpen, setSessionCompleteOpen] = useState(false);
  const sessionA11yTierRef = useRef({ five: false, one: false });
  const prevSessionCompleteOpen = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionBaseParamsRef = useRef<AmbientParams | null>(null);
  const sessionPlanRef = useRef<{ intent: SessionIntent; durationMin: number } | null>(null);
  const sessionActiveRef = useRef(false);
  const sessionMilestonesRef = useRef<Set<number>>(new Set());
  const [sessionProgress, setSessionProgress] = useState<number | null>(null);
  const [sessionA11yTip, setSessionA11yTip] = useState({ id: 0, msg: "" });

  sessionActiveRef.current = sessionActive;

  const computeEngineParams = useCallback((canonical: AmbientParams): AmbientParams => {
    let p = applyPlaybackIntensityMacro(canonical, intensityPlaybackRef.current);
    p = applyPlaybackBrightnessMacro(p, brightnessPlaybackRef.current);
    const plan = sessionPlanRef.current;
    const started = sessionStartedAtRef.current;
    if (sessionActiveRef.current && plan && started !== null) {
      const elapsed = Date.now() - started;
      const progress = Math.min(1, elapsed / (plan.durationMin * 60_000));
      p = applySessionArcToParams(p, plan.intent, progress);
    }
    return p;
  }, []);

  const announceSessionA11y = useCallback((msg: string) => {
    setSessionA11yTip((p) => ({ id: p.id + 1, msg }));
  }, []);

  useEffect(() => {
    if (!sessionActive || !isPlaying) return;
    const checkpoints = [0.25, 0.5, 0.75];
    const id = window.setInterval(() => {
      const plan = sessionPlanRef.current;
      const started = sessionStartedAtRef.current;
      if (!plan || started === null) return;
      const elapsed = Date.now() - started;
      const progress = elapsed / (plan.durationMin * 60_000);
      checkpoints.forEach((cp, idx) => {
        if (progress >= cp && !sessionMilestonesRef.current.has(idx)) {
          sessionMilestonesRef.current.add(idx);
          navigator.vibrate?.(14);
        }
      });
      const base = sessionBaseParamsRef.current ?? paramsRef.current;
      if (engineRef.current) {
        engineRef.current.applyParams(computeEngineParams(base));
      }
      if (progress >= 1) {
        sessionPlanRef.current = null;
        sessionStartedAtRef.current = null;
        sessionActiveRef.current = false;
        setSessionActive(false);
        setSessionCompleteOpen(true);
        const b = sessionBaseParamsRef.current ?? paramsRef.current;
        engineRef.current?.applyParams(computeEngineParams(b));
      }
    }, 1100);
    return () => clearInterval(id);
  }, [sessionActive, isPlaying, computeEngineParams, engineRef, paramsRef]);

  useEffect(() => {
    if (!sessionActive) {
      setSessionProgress(null);
      return;
    }
    const tick = () => {
      const plan = sessionPlanRef.current;
      const started = sessionStartedAtRef.current;
      if (!plan || started === null) return;
      const elapsed = Date.now() - started;
      const progress = Math.max(0, Math.min(1, elapsed / (plan.durationMin * 60_000)));
      setSessionProgress(progress);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive || typeof sessionProgress !== "number" || sessionDurationPick <= 0) return;
    const remainingSec = Math.max(0, Math.round((1 - sessionProgress) * sessionDurationPick * 60));
    if (!sessionA11yTierRef.current.five && remainingSec <= 300) {
      sessionA11yTierRef.current.five = true;
      announceSessionA11y("Five minutes remaining in your guided session.");
    } else if (!sessionA11yTierRef.current.one && remainingSec <= 60) {
      sessionA11yTierRef.current.one = true;
      announceSessionA11y("One minute remaining in your guided session.");
    }
  }, [sessionActive, sessionProgress, sessionDurationPick, announceSessionA11y]);

  useEffect(() => {
    if (sessionCompleteOpen && !prevSessionCompleteOpen.current) {
      announceSessionA11y("Guided session complete.");
    }
    prevSessionCompleteOpen.current = sessionCompleteOpen;
  }, [sessionCompleteOpen, announceSessionA11y]);

  const beginTimedSession = useCallback(async () => {
    sessionMilestonesRef.current = new Set();
    sessionA11yTierRef.current = { five: false, one: false };
    sessionPlanRef.current = { intent: sessionIntentPick, durationMin: sessionDurationPick };
    sessionStartedAtRef.current = Date.now();
    sessionBaseParamsRef.current = { ...paramsRef.current };
    setSessionCompleteOpen(false);
    sessionActiveRef.current = true;
    setSessionActive(true);

    if (!engineRef.current) return;

    if (!isPlayingRef.current) {
      setIsStarting(true);
      try {
        await Tone.start();
        await engineRef.current.start();
        setAnalyser(engineRef.current.getAnalyser());
        engineRef.current.applyParams(computeEngineParams(paramsRef.current));
        setIsPlaying(true);
      } catch (e) {
        console.error("Failed to start session audio:", e);
      } finally {
        setIsStarting(false);
      }
    } else {
      engineRef.current.applyParams(computeEngineParams(paramsRef.current));
    }
  }, [
    sessionIntentPick,
    sessionDurationPick,
    computeEngineParams,
    engineRef,
    paramsRef,
    isPlayingRef,
    setIsPlaying,
    setIsStarting,
    setAnalyser,
  ]);

  const endTimedSession = useCallback(() => {
    sessionPlanRef.current = null;
    sessionStartedAtRef.current = null;
    sessionActiveRef.current = false;
    setSessionActive(false);
    engineRef.current?.applyParams(computeEngineParams(paramsRef.current));
  }, [computeEngineParams, engineRef, paramsRef]);

  return {
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
  };
}
