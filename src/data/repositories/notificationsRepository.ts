import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  deleteDoc,
  writeBatch,
  limit,
  type FirestoreError,
} from "firebase/firestore";

import type {
  InAppNotification,
  NotificationKind,
} from "@/features/notifications/types/inAppNotification";
import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

type NotificationDoc = {
  userId?: string;
  title?: string;
  body?: string;
  read?: boolean;
  kind?: NotificationKind;
  senderAvatarUrl?: string;
  senderDisplayName?: string;
  useAppLogoForAvatar?: boolean;
  bookingId?: string;
  proId?: string;
  createdAt?: { toMillis?: () => number } | number;
};

async function loadProNameById(proId: string): Promise<string | undefined> {
  const db = getFirebaseFirestore();
  const userSnap = await getDoc(doc(db, "users", proId)).catch(() => null);
  const userName = userSnap?.data()?.displayName;
  if (typeof userName === "string" && userName.trim().length > 0) {
    return userName.trim();
  }
  const proSnap = await getDoc(doc(db, "pro_profiles", proId)).catch(() => null);
  const title = proSnap?.data()?.title;
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }
  return undefined;
}

async function enrichSenderNames(rows: InAppNotification[]): Promise<InAppNotification[]> {
  const cache = new Map<string, string>();
  const ids = Array.from(
    new Set(
      rows
        .filter((r) => !r.senderDisplayName && typeof r.proId === "string" && r.proId.length > 0)
        .map((r) => r.proId as string),
    ),
  );
  await Promise.all(
    ids.map(async (id) => {
      const name = await loadProNameById(id);
      if (name) cache.set(id, name);
    }),
  );
  return rows.map((r) => ({
    ...r,
    senderDisplayName:
      r.senderDisplayName || (r.proId ? cache.get(r.proId) : undefined),
  }));
}

function toMillis(v: NotificationDoc["createdAt"]): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && typeof v.toMillis === "function") {
    return v.toMillis();
  }
  return undefined;
}

function toNotification(id: string, d: NotificationDoc): InAppNotification | null {
  if (typeof d.title !== "string" || typeof d.body !== "string") return null;
  return {
    id,
    title: d.title,
    body: d.body,
    createdAtMs: toMillis(d.createdAt),
    timeLabel: "Recently",
    read: d.read === true,
    kind:
      d.kind === "offer" ||
      d.kind === "message" ||
      d.kind === "reminder" ||
      d.kind === "payment_succeeded" ||
      d.kind === "payment_failed" ||
      d.kind === "request" ||
      d.kind === "booking" ||
      d.kind === "marketing" ||
      d.kind === "review_request" ||
      d.kind === "system"
        ? d.kind
        : "system",
    senderAvatarUrl:
      typeof d.senderAvatarUrl === "string" ? d.senderAvatarUrl : undefined,
    senderDisplayName:
      typeof d.senderDisplayName === "string" ? d.senderDisplayName : undefined,
    bookingId: typeof d.bookingId === "string" ? d.bookingId : undefined,
    proId: typeof d.proId === "string" ? d.proId : undefined,
    useAppLogoForAvatar: d.useAppLogoForAvatar === true,
  };
}

async function currentUid(): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No Firebase user session.");
  return uid;
}

export async function listenMyNotifications(
  onData: (rows: InAppNotification[]) => void,
  onError?: (e: FirestoreError) => void,
): Promise<() => void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  // Keep query index-light; sort client-side to avoid index-related flicker/emptying.
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", uid),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      void (async () => {
        const rows = snap.docs
          .map((d) => toNotification(d.id, (d.data() as NotificationDoc) ?? {}))
          .filter((v): v is InAppNotification => v !== null)
          .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        const enriched = await enrichSenderNames(rows);
        onData(enriched);
      })();
    },
    (e) => {
      onError?.(e);
    },
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, "notifications", id), { read: true, userId: uid });
}

export async function dismissNotification(id: string): Promise<void> {
  await currentUid();
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, "notifications", id));
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await currentUid();
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, "notifications", id), { read: true }));
  await batch.commit();
}
