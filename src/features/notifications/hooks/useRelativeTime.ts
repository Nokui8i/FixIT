import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/features/notifications/utils/relativeTime";

const TICK_MS = 30_000;

/**
 * Recomputes relative text on an interval when `createdAtMs` is set.
 * Falls back to `staticLabel` when no timestamp (e.g. legacy payload).
 */
export function useRelativeTime(
  createdAtMs: number | undefined,
  staticLabel: string,
): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (createdAtMs == null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [createdAtMs]);

  if (createdAtMs == null) return staticLabel;
  return formatRelativeTime(createdAtMs, now);
}
