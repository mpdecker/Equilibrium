/**
 * Equilibrium visual system.
 *
 * Two coexisting layers:
 *  - `VS.*` (legacy): the original "ritual instrument" tokens used across the
 *    whole codebase. NOT renamed or removed during the instrument-mode rollout
 *    so the form-mode UI stays visually intact and snapshot tests keep passing.
 *  - `SURFACE`, `TYPE`, `DENSITY`, `INSTRUMENT_TOKEN`: new tiered tokens
 *    introduced for instrument mode. Components opt-in by referencing them
 *    explicitly. Migration of legacy components is incremental.
 *
 * Use these in component class strings via `cx()` rather than inlining
 * `bg-white/[0.0X]` literals — that's the central audit goal of Phase 3.
 */

export const VS = {
  /** Eyebrow / section label */
  label: "text-[10px] font-medium uppercase tracking-[0.28em] text-white/50",
  /** Sticky subheads inside scroll regions */
  labelSticky:
    "text-xs font-medium uppercase tracking-[0.24em] text-white/55 mb-4 sticky top-0 z-10 pb-2 backdrop-blur-md bg-eq-depth/90 border-b border-white/[0.06]",
  /** Primary glass panel (no padding — add `p-*` at call site) */
  panel:
    "rounded-[1.25rem] border border-white/[0.09] bg-white/[0.035] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl",
  /** Emphasized panel (control stack) */
  panelInset:
    "rounded-2xl border border-eq-glow/15 bg-eq-field/80 shadow-[inset_0_0_0_1px_rgba(199,160,58,0.08)]",
  /** Default text block */
  bodyMuted: "text-sm font-light leading-relaxed text-white/55",
  /** Ghost / secondary control */
  pillGhost:
    "rounded-full border border-white/12 bg-white/[0.04] text-sm font-light text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.07]",
  /** Accent outline pill */
  pillAccent:
    "rounded-full border border-eq-glow/35 bg-eq-glow/[0.08] text-sm font-light text-eq-glow/95 shadow-[0_0_24px_-8px_rgba(199,160,58,0.55)] hover:bg-eq-glow/[0.12]",
} as const;

/**
 * Three named surface tiers replacing the ad-hoc `bg-white/[0.0X]` chaos.
 *
 *   base    — flush against the stage (subtlest; e.g. read-only chips, status pills)
 *   raised  — interactive / hoverable (default for buttons, panels in flow)
 *   float   — modal / drawer / sheet floating above the stage (most opaque)
 *
 * Each tier provides bg + border + (optional) shadow. Combine with `rounded-*`
 * and `p-*` at the call site.
 */
export const SURFACE = {
  base: {
    bg: "bg-white/[0.025]",
    border: "border border-white/[0.06]",
    interactive: "hover:bg-white/[0.045] hover:border-white/[0.10] transition-colors",
  },
  raised: {
    bg: "bg-white/[0.05]",
    border: "border border-white/[0.10]",
    interactive: "hover:bg-white/[0.08] hover:border-white/[0.16] transition-colors",
  },
  float: {
    bg: "bg-eq-void/82 backdrop-blur-2xl",
    border: "border border-white/[0.08]",
    shadow: "shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92)]",
  },
  /** Active / segmented-control selected state — eq-glow cast + lift */
  selected: {
    bg: "bg-eq-glow/[0.12]",
    border: "border border-eq-glow/35",
    glow: "shadow-[0_0_24px_-10px_rgba(199,160,58,0.55)]",
  },
  scrim: {
    soft: { bg: "bg-eq-void/55 backdrop-blur-md" },
    default: { bg: "bg-eq-void/76 backdrop-blur-2xl" },
    dense: { bg: "bg-eq-void/94 backdrop-blur-2xl" },
  },
  /** Progress / meter rail behind fills (session clock, now playing). */
  meter: {
    track: "bg-white/[0.06]",
  },
} as const;

/**
 * Density: `comfortable` for instrument-mode surfaces (more breathing room),
 * `compact` for form-mode and dense control stacks (audio lab, palette modal).
 */
export const DENSITY = {
  comfortable: {
    panelPad: "p-6",
    rowGap: "gap-4",
    inlineGap: "gap-3",
  },
  compact: {
    panelPad: "p-4",
    rowGap: "gap-2",
    inlineGap: "gap-2",
  },
} as const;

/**
 * Type scale (4 steps). Replaces ad-hoc `text-[2.75rem]` / `text-[1.65rem]`.
 *
 * Use serif for `display` / `heading`; sans for `subheading`; mono uppercase for `eyebrow`.
 */
export const TYPE = {
  display: "font-serif text-[clamp(2rem,5vw,2.75rem)] font-light tracking-wide leading-[1.15] text-eq-ink/95",
  heading: "font-serif text-[clamp(1.4rem,3vw,1.85rem)] font-light text-eq-ink/95",
  subheading: "text-base font-light text-white/82 leading-snug",
  eyebrow: "text-[10px] font-medium uppercase tracking-[0.28em] text-white/55",
  /** Mono numeric readout for HUD / instrument numerals (tabular). */
  numeric: "font-mono text-[11px] tabular-nums tracking-[0.14em] text-white/85",
  /** Muted explanatory copy alongside controls (below subheading saturation). */
  subheadingMuted: "text-sm font-light text-white/45 leading-relaxed",
} as const;

/**
 * Instrument-only tokens. These are colors/strokes specifically for the
 * gestural surface; outside instrument mode they should be unused.
 */
export const INSTRUMENT_TOKEN = {
  cursorAura: "rgba(199, 160, 58, 0.18)",
  cursorTrail: "rgba(199, 160, 58, 0.32)",
  focusAura: "0 0 0 2px rgba(199, 160, 58, 0.45)",
  wheelStroke: "rgba(255, 255, 255, 0.30)",
  wheelStrokeActive: "rgba(199, 160, 58, 0.85)",
  /** Divider between stacked control sections in sheets/lab */
  dividerClass: "border-t border-white/[0.07]",
} as const;

export type SurfacePanelTier =
  | typeof SURFACE.base
  | typeof SURFACE.raised
  | typeof SURFACE.float;

/**
 * Helper: combine a surface tier with a `rounded-*` token quickly.
 *
 *   surfaceClass(SURFACE.raised, "rounded-2xl p-4")
 */
export function surfaceClass(tier: SurfacePanelTier, extra = ""): string {
  const parts: string[] = [];
  if ("bg" in tier) parts.push(tier.bg);
  if ("border" in tier) parts.push(tier.border);
  if ("interactive" in tier) parts.push(tier.interactive);
  if ("shadow" in tier) parts.push(tier.shadow);
  if (extra) parts.push(extra);
  return parts.join(" ");
}

/** Selected /-accent surface (tier `SURFACE.selected`). */
export function selectedSurfaceClass(extra = ""): string {
  const { bg, border, glow } = SURFACE.selected;
  return [bg, border, glow, extra].filter(Boolean).join(" ");
}

export type ScrimLayer = keyof typeof SURFACE.scrim;

/** Full-screen or sheet overlay scrim by density. */
export function scrimClass(layer: ScrimLayer, extra = ""): string {
  const tier = SURFACE.scrim[layer];
  return [tier.bg, extra].filter(Boolean).join(" ");
}
