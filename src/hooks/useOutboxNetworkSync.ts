import { useCallback, useEffect, useState } from "react";
import { flushOutbox, getOutboxCount } from "../lib/sync-idb";

export function useOutboxNetworkSync() {
  const [netOnline, setNetOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );
  const [outboxPending, setOutboxPending] = useState(0);
  const [outboxSyncing, setOutboxSyncing] = useState(false);

  const refreshOutboxCount = useCallback(async () => {
    setOutboxPending(await getOutboxCount());
  }, []);

  const flushOutboxAndRefresh = useCallback(async () => {
    const likelyOnline = typeof navigator === "undefined" ? true : navigator.onLine !== false;
    if (!likelyOnline) return;
    setOutboxSyncing(true);
    try {
      await flushOutbox();
    } finally {
      setOutboxSyncing(false);
      await refreshOutboxCount();
    }
  }, [refreshOutboxCount]);

  useEffect(() => {
    void refreshOutboxCount();
    const onOffline = () => setNetOnline(false);
    const onOnline = () => {
      setNetOnline(true);
      void flushOutboxAndRefresh();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    void flushOutboxAndRefresh();
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [flushOutboxAndRefresh, refreshOutboxCount]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> | void } | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        handle = await App.addListener("resume", () => {
          void flushOutboxAndRefresh();
        });
      } catch {
        /* web desktop */
      }
    })();
    return () => {
      cancelled = true;
      void handle?.remove?.();
    };
  }, [flushOutboxAndRefresh]);

  return { netOnline, outboxPending, outboxSyncing, refreshOutboxCount, flushOutboxAndRefresh };
}
