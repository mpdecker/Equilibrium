export type MediaSessionHandlers = {
  getPlaying: () => boolean;
  onPlay: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
};

function mediaSession(): MediaSession | null {
  try {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return null;
    return navigator.mediaSession;
  } catch {
    return null;
  }
}

/** Sync lock-screen / OS playback indicator with engine state. */
export function syncMediaSessionPlaybackState(playing: boolean): void {
  const ms = mediaSession();
  if (!ms) return;
  try {
    ms.playbackState = playing ? "playing" : "paused";
  } catch {
    /* unsupported */
  }
}

/**
 * Bind JS Media Session metadata + play/pause (shared web path — no native FGS).
 * Returns an unbind function. No-op when Media Session API is unavailable.
 */
export function bindMediaSession(handlers: MediaSessionHandlers): () => void {
  const ms = mediaSession();
  if (!ms) return () => {};

  try {
    if (typeof MediaMetadata !== "undefined") {
      ms.metadata = new MediaMetadata({
        title: "Equilibrium",
        artist: "Ambient soundscape",
        album: "Equilibrium",
      });
    }
  } catch {
    /* ignore metadata failures */
  }

  const play = () => {
    void handlers.onPlay();
  };
  const pause = () => {
    void handlers.onPause();
  };

  try {
    ms.setActionHandler("play", play);
    ms.setActionHandler("pause", pause);
  } catch {
    /* ignore */
  }

  syncMediaSessionPlaybackState(handlers.getPlaying());

  return () => {
    try {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
    } catch {
      /* ignore */
    }
  };
}
