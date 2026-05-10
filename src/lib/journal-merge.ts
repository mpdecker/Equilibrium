import type { CachedJournalRow } from "./sync-idb.js";

/** Row rendered in History panel */
export type JournalListItem = {
  id: number | string;
  content: string;
  createdAt: string;
  pendingSync?: boolean;
};

/** Turn `/api/journals` JSON into cache rows */
export function journalRowsFromApi(data: unknown): CachedJournalRow[] {
  if (!Array.isArray(data)) return [];
  const out: CachedJournalRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.content !== "string") continue;
    const idRaw = o.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? idRaw
          : null;
    if (id === null) continue;
    let createdAt: string;
    if (typeof o.createdAt === "string") createdAt = o.createdAt;
    else if (o.createdAt instanceof Date) createdAt = o.createdAt.toISOString();
    else createdAt = new Date().toISOString();
    out.push({
      id,
      content: o.content,
      sessionId: typeof o.sessionId === "string" ? o.sessionId : null,
      moodText: typeof o.moodText === "string" ? o.moodText : null,
      createdAt,
    });
  }
  return out;
}

/** Pending entries first visually by passing them before cached; newest first globally */
export function mergeJournalsDescending(
  cached: CachedJournalRow[],
  pending: CachedJournalRow[],
): JournalListItem[] {
  return [...pending, ...cached]
    .map(
      (r): JournalListItem => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        pendingSync: r.pendingSync === true,
      }),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
