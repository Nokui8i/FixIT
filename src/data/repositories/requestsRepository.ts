import { collection, getDocs, query, where } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

export type MyServiceRequestRow = {
  id: string;
  title: string;
  details: string;
  status: string;
  urgency: string;
  addressLine: string | null;
  createdAt: string | null;
};

export async function loadMyOpenRequestCount(): Promise<number> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return 0;

  const db = getFirebaseFirestore();
  const snap = await getDocs(
    query(
      collection(db, "service_requests"),
      where("customerId", "==", uid),
      where("status", "in", ["open", "quoted", "booked"]),
    ),
  );
  return snap.size;
}

export async function loadMyServiceRequests(): Promise<MyServiceRequestRow[]> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];

  const db = getFirebaseFirestore();
  const snap = await getDocs(
    query(collection(db, "service_requests"), where("customerId", "==", uid)),
  );

  const rows = snap.docs.map((d) => {
    const v = d.data() as {
      title?: string;
      details?: string;
      status?: string;
      urgency?: string;
      addressLine?: string | null;
      createdAt?: { toDate?: () => Date } | null;
    };
    const dateObj =
      v.createdAt && typeof v.createdAt.toDate === "function" ? v.createdAt.toDate() : null;
    return {
      id: d.id,
      title: typeof v.title === "string" && v.title.trim() ? v.title.trim() : "Untitled request",
      details: typeof v.details === "string" ? v.details : "",
      status: typeof v.status === "string" ? v.status : "open",
      urgency: typeof v.urgency === "string" ? v.urgency : "standard",
      addressLine: typeof v.addressLine === "string" ? v.addressLine : null,
      createdAt: dateObj ? dateObj.toISOString() : null,
    } satisfies MyServiceRequestRow;
  });

  rows.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });
  return rows;
}
