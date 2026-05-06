import {
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  collection,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

export type MyProProfile = {
  title: string;
  subtitle: string;
  categoryIds: string[];
  eta: string;
  fee: string;
  imageUrl: string;
  isActive: boolean;
};

export type IncomingRequestRow = {
  id: string;
  title: string;
  details: string;
  categoryId: string | null;
  urgency: "standard" | "urgent";
  createdAt: number;
};

const DEFAULT_PRO_PROFILE: MyProProfile = {
  title: "",
  subtitle: "",
  categoryIds: [],
  eta: "15 min",
  fee: "$55",
  imageUrl: "",
  isActive: true,
};

async function currentUid(): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No Firebase user session.");
  return uid;
}

export async function loadMyProProfile(): Promise<MyProProfile> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_PRO_PROFILE;
  const d = snap.data() as Partial<MyProProfile>;
  return {
    title: typeof d.title === "string" ? d.title : DEFAULT_PRO_PROFILE.title,
    subtitle:
      typeof d.subtitle === "string" ? d.subtitle : DEFAULT_PRO_PROFILE.subtitle,
    categoryIds: Array.isArray(d.categoryIds)
      ? d.categoryIds.filter((v): v is string => typeof v === "string")
      : [],
    eta: typeof d.eta === "string" ? d.eta : DEFAULT_PRO_PROFILE.eta,
    fee: typeof d.fee === "string" ? d.fee : DEFAULT_PRO_PROFILE.fee,
    imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : "",
    isActive: d.isActive !== false,
  };
}

export async function saveMyProProfile(input: MyProProfile): Promise<void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  await setDoc(
    ref,
    {
      ...input,
      ownerId: uid,
      rating: "5.0",
      jobsDone: 0,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadIncomingRequestsForMyPro(): Promise<IncomingRequestRow[]> {
  const profile = await loadMyProProfile();
  if (profile.categoryIds.length === 0) return [];

  const db = getFirebaseFirestore();
  const snap = await getDocs(
    query(
      collection(db, "service_requests"),
      where("status", "==", "open"),
      where("categoryId", "in", profile.categoryIds.slice(0, 10)),
      limit(40),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as {
      title?: string;
      details?: string;
      categoryId?: string | null;
      urgency?: "standard" | "urgent";
      createdAt?: { toMillis?: () => number } | number;
    };
    const createdAt =
      typeof data.createdAt === "number"
        ? data.createdAt
        : typeof data.createdAt === "object" &&
            data.createdAt !== null &&
            typeof data.createdAt.toMillis === "function"
          ? data.createdAt.toMillis()
          : Date.now();
    return {
      id: d.id,
      title: typeof data.title === "string" ? data.title : "Request",
      details: typeof data.details === "string" ? data.details : "",
      categoryId:
        typeof data.categoryId === "string" ? data.categoryId : (data.categoryId ?? null),
      urgency: data.urgency === "urgent" ? "urgent" : "standard",
      createdAt,
    };
  });
}
