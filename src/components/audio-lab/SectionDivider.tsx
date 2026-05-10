import React from "react";
import { INSTRUMENT_TOKEN } from "../../constants/visual-system";
import { cx } from "../../lib/cx";

export function AudioLabSectionDivider({ className }: { className?: string }) {
  return <div className={cx(INSTRUMENT_TOKEN.dividerClass, "my-4", className)} aria-hidden />;
}
