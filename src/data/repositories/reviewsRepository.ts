import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";
import { getFirebaseAuth } from "@/shared/firebase/client";

export type MyRatingSummary = {
  average: number;
  count: number;
};

type ReviewDoc = {
  customerId?: string;
  rating?: number | string;
  customerRating?: number | string;
  score?: number | string;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickCustomerRating(d: ReviewDoc): number | null {
  const candidates = [d.customerRating, d.rating, d.score];
  for (const candidate of candidates) {
    const n = toNumber(candidate);
    if (n !== null && n >= 0 && n <= 5) return n;
  }
  return null;
}

export async function loadMyCustomerRatingSummary(): Promise<MyRatingSummary | null> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return null;

  const db = getFirebaseFirestore();
  const snap = await getDocs(
    query(collection(db, "reviews"), where("customerId", "==", uid), limit(300)),
  );

  let total = 0;
  let count = 0;
  snap.forEach((doc) => {
    const rating = pickCustomerRating((doc.data() as ReviewDoc) ?? {});
    if (rating !== null) {
      total += rating;
      count += 1;
    }
  });

  if (count === 0) return null;
  return { average: total / count, count };
}

export async function submitMyReview(input: {
  bookingId: string;
  proId: string;
  rating: number;
  comment: string;
}): Promise<void> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No Firebase user session.");
  if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be between 1 and 5.");

  const db = getFirebaseFirestore();
  const reviewId = `${input.bookingId}_${uid}`;
  const reviewRef = doc(db, "reviews", reviewId);
  await setDoc(
    reviewRef,
    {
      bookingId: input.bookingId,
      customerId: uid,
      proId: input.proId,
      customerRating: input.rating,
      rating: input.rating,
      comment: input.comment.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function hasMyReviewForBooking(bookingId: string): Promise<boolean> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return false;
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, "reviews", `${bookingId}_${uid}`));
  return snap.exists();
}

