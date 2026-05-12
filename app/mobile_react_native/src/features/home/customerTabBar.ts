/**
 * Metrics for the main hub tab bar (`CustomerTabsBar` in `app/(tabs)/_layout.tsx`).
 * Deep stack screens omit the bar; tab hub screens pass `reserveHubTabBar` on chrome.
 */
export const TAB_BAR_PILL_HEIGHT = 54;

/** Space to reserve above the home indicator (matches tab bar shell padding). */
export function tabBarShellBottomPad(safeBottom: number): number {
  return Math.max(safeBottom, 6) + 2;
}

/** Bottom padding for `CustomerAppChrome` main column so lists clear the floating pill. */
export function customerTabBarMainInset(safeBottom: number): number {
  return tabBarShellBottomPad(safeBottom) + TAB_BAR_PILL_HEIGHT;
}
