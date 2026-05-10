import { useEffect, useRef, useState } from "react";

export function useFeedbackPromptWhilePlaying(isPlaying: boolean, evolutionSpeed: number) {
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const evolutionSpeedRef = useRef(evolutionSpeed);
  evolutionSpeedRef.current = evolutionSpeed;

  useEffect(() => {
    if (!isPlaying) return;

    const scheduleNext = () => {
      const speed = evolutionSpeedRef.current;
      const baseTime = 90000 - speed * 60000;
      const randTime = 60000 - speed * 30000;
      const delay = baseTime + Math.random() * randTime;
      return window.setTimeout(() => {
        setShowFeedbackPrompt(true);
        scheduleNext();
      }, delay);
    };

    const timeout = scheduleNext();
    return () => window.clearTimeout(timeout);
  }, [isPlaying]);

  return { showFeedbackPrompt, setShowFeedbackPrompt };
}
