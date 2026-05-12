import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import type { ChatThreadRow } from "@/features/messages/types";
import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase/client";
import { isFirebaseConfigured } from "@/shared/firebase/config";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

type ThreadDoc = {
  participantIds?: string[];
  customerId?: string;
  proId?: string;
  proName?: string;
  proImageUrl?: string;
  lastPreview?: string;
  updatedAt?: { toMillis?: () => number } | number;
  customerLastReadAt?: { toMillis?: () => number } | number;
};

function toMillis(v: ThreadDoc["updatedAt"]): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && typeof v.toMillis === "function") {
    return v.toMillis();
  }
  return Date.now();
}

export async function loadInboxThreads(): Promise<ChatThreadRow[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    await ensureCustomerFirebaseSession();
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return [];

    const db = getFirebaseFirestore();
    const snap = await getDocs(
      query(
        collection(db, "chat_threads"),
        where("participantIds", "array-contains", uid),
        limit(100),
      ),
    );

    return snap.docs
      .map((d) => {
        const data = (d.data() as ThreadDoc) ?? {};
        const proId = typeof data.proId === "string" ? data.proId : "";
        const proName =
          typeof data.proName === "string" && data.proName.trim().length > 0
            ? data.proName.trim()
            : "Professional";
        if (proId.length === 0) return null;
        return {
          proId,
          proName,
          proImageUrl:
            typeof data.proImageUrl === "string" ? data.proImageUrl : "",
          lastPreview:
            typeof data.lastPreview === "string" ? data.lastPreview : "",
          updatedAt: toMillis(data.updatedAt),
          hasUnread:
            toMillis(data.updatedAt) >
            (data.customerLastReadAt ? toMillis(data.customerLastReadAt) : 0),
        } satisfies ChatThreadRow;
      })
      .filter((v): v is ChatThreadRow => v !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function listenInboxThreads(
  onData: (rows: ChatThreadRow[]) => void,
): Promise<() => void> {
  if (!isFirebaseConfigured()) {
    onData([]);
    return () => {};
  }

  try {
    await ensureCustomerFirebaseSession();
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      onData([]);
      return () => {};
    }

    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "chat_threads"),
      where("participantIds", "array-contains", uid),
      limit(100),
    );

    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = (d.data() as ThreadDoc) ?? {};
            const proId = typeof data.proId === "string" ? data.proId : "";
            const proName =
              typeof data.proName === "string" && data.proName.trim().length > 0
                ? data.proName.trim()
                : "Professional";
            if (proId.length === 0) return null;
            return {
              proId,
              proName,
              proImageUrl:
                typeof data.proImageUrl === "string" ? data.proImageUrl : "",
              lastPreview:
                typeof data.lastPreview === "string" ? data.lastPreview : "",
              updatedAt: toMillis(data.updatedAt),
              hasUnread:
                toMillis(data.updatedAt) >
                (data.customerLastReadAt ? toMillis(data.customerLastReadAt) : 0),
            } satisfies ChatThreadRow;
          })
          .filter((v): v is ChatThreadRow => v !== null)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        onData(rows);
      },
      () => {
        onData([]);
      },
    );
  } catch {
    onData([]);
    return () => {};
  }
}
