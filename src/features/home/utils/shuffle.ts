/** Fisher–Yates shuffle (mutates array in place). */
export function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = items[i];
    items[i] = items[j]!;
    items[j] = t!;
  }
}

/** Random order copy — use for home carousels (new order each time the screen mounts). */
export function shuffleCopy<T>(items: readonly T[]): T[] {
  const next = [...items];
  shuffleInPlace(next);
  return next;
}
