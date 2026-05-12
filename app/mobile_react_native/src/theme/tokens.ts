import { woltCloneRaw } from "./woltClonePalette";

/**
 * Semantic colors — neutral chrome (gray borders, soft shadows), black typography.
 * Brand red (`primary`) reserved for small accents (dots, key CTAs when needed).
 */
export const colors = {
  primary: woltCloneRaw.primary,
  primaryDark: woltCloneRaw.secondary,
  background: woltCloneRaw.background,
  surface: woltCloneRaw.background,
  surfaceSoft: "#F9FAFB",
  textPrimary: "#1C1917",
  textSecondary: woltCloneRaw.muted,
  /** Neutral hairlines — not rose/red */
  light: "#E5E5E5",
  border: "#E5E5E5",
  /** Wolt-style listing card outline (soft gray, ~1px) */
  cardStroke: "#E8E8E8",
  floatingDark: "#171717",
  woltFab: "#171717",
  /** Very light secondary buttons (“See all”, chips idle) */
  woltSeeAllBg: "#F4F4F5",
  woltSeeAllText: "#1C1917",
  woltIconWell: "#F0F0F0",
  highlight: woltCloneRaw.highlight,
  destructive: "#B91C1C",
  destructiveDark: "#7F1D1D",
  chevronMuted: "#A8A29E",
  divider: "#E5E5E5",
  rowWash: "#FAFAFA",
  switchTrackOn: "#F87171",
  /** List separators — thin black ink */
  listDivider: "#1C1917",
  /** Floating search / dark pills — soft charcoal (not pure black) */
  pillCharcoal: "#3F3F46",
  pillCharcoalText: "#FAFAFA",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  chip: 16,
  button: 12,
  card: 12,
  modal: 24,
  floating: 28,
  image: 8,
} as const;

/** Neutral soft shadows (3D lift, no colored outlines). */
export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  /** Home nearby carousel — lift + soft red cast (matches brand primary) */
  nearbyBubble: {
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 13,
  },
  /** Subtle lift for small controls */
  button: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
