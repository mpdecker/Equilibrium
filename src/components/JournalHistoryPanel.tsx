import React from "react";
import { motion } from "motion/react";
import type { JournalListItem } from "../lib/journal-merge";
import { SURFACE, TYPE, surfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";

type JournalHistoryPanelProps = {
  journals: JournalListItem[];
};

export function JournalHistoryPanel({ journals }: JournalHistoryPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className={cx(
        surfaceClass(SURFACE.float, "rounded-l-3xl rounded-r-none"),
        "pointer-events-auto max-h-[min(72vh,520px)] w-full max-w-[min(100vw-1rem,20rem)] overflow-y-auto border-r-0 py-4 pl-4 pr-3 no-scrollbar shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]",
      )}
    >
      <h3
        className={cx(
          TYPE.eyebrow,
          "sticky top-0 z-10 -mx-1 mb-3 border-b border-white/[0.07] bg-eq-void/88 px-1 pb-3 backdrop-blur-md text-eq-glow/80 tracking-[0.28em]",
        )}
      >
        Recent Entries
      </h3>
      {journals.length === 0 ? (
        <p className={cx(TYPE.subheadingMuted, "text-white/42 italic")}>No entries yet.</p>
      ) : (
        <div className="space-y-4">
          {journals.map((j) => (
            <div key={j.id} className="border-b border-white/[0.07] pb-3 last:border-0">
              <p className={cx(TYPE.subheading)}>{j.content}</p>
              <p className={cx(TYPE.subheadingMuted, "text-white/38 text-xs mt-2 flex flex-wrap items-center gap-2")}>
                <span>{new Date(j.createdAt).toLocaleString()}</span>
                {j.pendingSync ? (
                  <span className="text-amber-200/75 uppercase tracking-wider text-[10px] font-medium">Pending sync</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
