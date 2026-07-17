import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bindMediaSession, syncMediaSessionPlaybackState } from "./media-session.js";

describe("media-session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("bindMediaSession is a no-op without navigator.mediaSession", () => {
    vi.stubGlobal("navigator", {});
    const unbind = bindMediaSession({
      getPlaying: () => false,
      onPlay: () => {},
      onPause: () => {},
    });
    expect(() => unbind()).not.toThrow();
  });

  it("sets metadata, handlers, and playbackState", () => {
    const setActionHandler = vi.fn();
    const ms = {
      metadata: null as MediaMetadata | null,
      playbackState: "none" as MediaSessionPlaybackState,
      setActionHandler,
    };
    vi.stubGlobal("navigator", { mediaSession: ms });
    vi.stubGlobal(
      "MediaMetadata",
      class {
        title: string;
        artist: string;
        album: string;
        constructor(init: { title?: string; artist?: string; album?: string }) {
          this.title = init.title ?? "";
          this.artist = init.artist ?? "";
          this.album = init.album ?? "";
        }
      },
    );

    const onPlay = vi.fn();
    const onPause = vi.fn();
    const unbind = bindMediaSession({
      getPlaying: () => true,
      onPlay,
      onPause,
    });

    expect(ms.metadata).toBeTruthy();
    expect((ms.metadata as { title: string }).title).toBe("Equilibrium");
    expect(ms.playbackState).toBe("playing");
    expect(setActionHandler).toHaveBeenCalledWith("play", expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith("pause", expect.any(Function));

    const playHandler = setActionHandler.mock.calls.find((c) => c[0] === "play")?.[1] as () => void;
    playHandler();
    expect(onPlay).toHaveBeenCalled();

    unbind();
    expect(setActionHandler).toHaveBeenCalledWith("play", null);
    expect(setActionHandler).toHaveBeenCalledWith("pause", null);
  });

  it("syncMediaSessionPlaybackState updates playbackState", () => {
    const ms = {
      metadata: null,
      playbackState: "none" as MediaSessionPlaybackState,
      setActionHandler: vi.fn(),
    };
    vi.stubGlobal("navigator", { mediaSession: ms });
    syncMediaSessionPlaybackState(true);
    expect(ms.playbackState).toBe("playing");
    syncMediaSessionPlaybackState(false);
    expect(ms.playbackState).toBe("paused");
  });
});
