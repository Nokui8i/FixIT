/**
 * Product palette: **red platform** surfaces + red CTAs (not the original Wolt cyan).
 * Body text still uses neutral `muted`; borders/wells/soft fills are rose/red.
 */
export const woltCloneRaw = {
  background: "#ffffff",
  /** Small highlights (badges, tips) */
  highlight: "#FFE81F",
  /** Primary actions, links on light bg */
  primary: "#DC2626",
  /** Darker red — pressed states, secondary emphasis */
  secondary: "#9F1239",
  /** High-contrast chrome (FAB, floating pill) — deep red-brown */
  dark: "#450A0A",
  /** Hairlines, card borders — rose (visible “red platform”) */
  light: "#F5C2C7",
  /** Soft panels, chips idle, see-all pill bg */
  primaryLight: "#FFF1F2",
  muted: "#57534E",
} as const;

export const woltCloneFontNames = {
  brand: "Nunito",
  brandBold: "Nunito_700Bold",
  brandBlack: "Nunito_900Black",
} as const;
