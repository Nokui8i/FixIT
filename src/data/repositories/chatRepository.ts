import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

export type ConversationMessage = {
  id: string;
  text: string;
  fromCustomer: boolean;
  createdAt: number;
};

type RawMessageDoc = {
  text?: string;
  senderId?: string;
  createdAt?: { toMillis?: () => number } | number;
};

function threadIdFor(customerId: string, proId: string): string {
  return `${customerId}__${proId}`;
}

function toMillis(v: RawMessageDoc["createdAt"]): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && typeof v.toMillis === "function") {
    return v.toMillis();
  }
  return Date.now();
}

async function getCurrentCustomerId(): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No authenticated customer session.");
  return uid;
}

export async function sendMessageToPro(input: {
  proId: string;
  proName: string;
  proImageUrl: string;
  text: string;
}): Promise<void> {
  const text = input.text.trim();
  if (!text) return;

  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const threadId = threadIdFor(customerId, input.proId);

  const threadRef = doc(db, "chat_threads", threadId);
  await setDoc(
    threadRef,
    {
      participantIds: [customerId, input.proId],
      customerId,
      proId: input.proId,
      proName: input.proName,
      proImageUrl: input.proImageUrl,
      lastPreview: text.slice(0, 200),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(db, "chat_messages", threadId, "items"), {
    text,
    senderId: customerId,
    createdAt: serverTimestamp(),
  });
}

export async function listenConversationWithPro(
  proId: string,
  onData: (rows: ConversationMessage[]) => void,
): Promise<() => void> {
  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const threadId = threadIdFor(customerId, proId);
  const q = query(
    collection(db, "chat_messages", threadId, "items"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const out = snap.docs.map((d) => {
        const data = (d.data() as RawMessageDoc) ?? {};
        return {
          id: d.id,
          text: typeof data.text === "string" ? data.text : "",
          fromCustomer: data.senderId === customerId,
          createdAt: toMillis(data.createdAt),
        } satisfies ConversationMessage;
      });
      onData(out);
    },
    () => {
      onData([]);
    },
  );
}
