import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-fetch.js";
import {
  listOutboxOldestFirst,
  pendingJournalEntriesFromOutbox,
  readJournalListCache,
  writeJournalListCache,
} from "../lib/sync-idb.js";
import { journalRowsFromApi, mergeJournalsDescending, type JournalListItem } from "../lib/journal-merge.js";

function journalsApiPath(sessionId: string | null): string {
  if (sessionId && sessionId.length >= 8) {
    return `/api/journals?sessionId=${encodeURIComponent(sessionId)}`;
  }
  return "/api/journals";
}

export function useJournalList(showJournal: boolean, sessionId: string | null) {
  const [journals, setJournals] = useState<JournalListItem[]>([]);

  const loadJournals = useCallback(async () => {
    const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
    try {
      const pending = pendingJournalEntriesFromOutbox(await listOutboxOldestFirst());
      if (!online) {
        const cached = await readJournalListCache();
        setJournals(mergeJournalsDescending(cached, pending));
        return;
      }
      const res = await apiFetch(journalsApiPath(sessionId));
      if (!res.ok) {
        let detail: unknown;
        try {
          detail = await res.json();
        } catch {
          detail = await res.text().catch(() => "");
        }
        console.error("Failed to load journals:", detail);
        const cached = await readJournalListCache();
        setJournals(mergeJournalsDescending(cached, pending));
        return;
      }
      const data = await res.json();
      const rows = journalRowsFromApi(data);
      await writeJournalListCache(rows);
      setJournals(mergeJournalsDescending(rows, pending));
    } catch (e) {
      console.error(e);
      const cached = await readJournalListCache();
      const pending = pendingJournalEntriesFromOutbox(await listOutboxOldestFirst());
      setJournals(mergeJournalsDescending(cached, pending));
    }
  }, [sessionId]);

  useEffect(() => {
    if (showJournal) {
      void loadJournals();
    }
  }, [showJournal, loadJournals]);

  return { journals, loadJournals };
}
