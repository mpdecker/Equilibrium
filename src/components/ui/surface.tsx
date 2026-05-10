import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { VS } from "../../constants/visual-system";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

/** Glass morphism panel — default padding `p-4`. */
export function Panel({ children, className }: PanelProps) {
  return <div className={cx(VS.panel, "p-4", className)}>{children}</div>;
}

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
};

export function SectionTitle({ children, className, sticky }: SectionTitleProps) {
  return (
    <h3
      className={cx(
        sticky ? VS.labelSticky : VS.label,
        !sticky && "mb-3",
        className,
      )}
    >
      {children}
    </h3>
  );
}
