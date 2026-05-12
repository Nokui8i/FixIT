import { useEffect, useState } from "react";
import { fetchProListingById } from "@/data/repositories/discoveryRepository";
import { getFirebaseAuth } from "@/shared/firebase/client";
import type { ServiceListing } from "@/features/home/types/serviceListing";
import { getListingById } from "@/features/home/data/demoFreelancers";

/**
 * Resolves a freelancer `ServiceListing`: demo ids stay on demo data; real UIDs load from Firestore.
 */
export function useFreelancerListing(proId: string | undefined) {
  const [listing, setListing] = useState<ServiceListing | undefined>();
  const [loading, setLoading] = useState(Boolean(proId));

  useEffect(() => {
    if (!proId?.trim()) {
      setListing(undefined);
      setLoading(false);
      return;
    }
    const id = proId.trim();

    const localDemoListing = getListingById(id);
    if (localDemoListing) {
      setListing(localDemoListing);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    const viewerUid = getFirebaseAuth().currentUser?.uid ?? null;
    void (async () => {
      try {
        const remote = await fetchProListingById(id, viewerUid);
        if (alive) setListing(remote ?? undefined);
      } catch {
        if (alive) setListing(undefined);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [proId]);

  return { listing, loading };
}
