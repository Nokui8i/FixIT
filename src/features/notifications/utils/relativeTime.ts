/**
 * Human-readable relative time (English). Used with `useRelativeTime` for live updates.
 */
export function formatRelativeTime(pastMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - pastMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 min ago" : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 hr ago" : `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return day === 1 ? "1 day ago" : `${day} days ago`;
  return new Date(pastMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
