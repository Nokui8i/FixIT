import { useEffect, useState } from "react";

import {
  bootstrapDiscoveryIfMissing,
  loadDiscoveryData,
  type DiscoveryData,
} from "@/data/repositories/discoveryRepository";

const initialData: DiscoveryData = {
  source: "firebase",
  categories: [],
  listings: [],
};

export function useDiscoveryData() {
  const [data, setData] = useState<DiscoveryData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await bootstrapDiscoveryIfMissing();
        const next = await loadDiscoveryData();
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) setData(initialData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
