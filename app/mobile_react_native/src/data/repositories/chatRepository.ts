import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
} from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

export type ConversationMessage = {
  id: string;
  text: string;
  fromCustomer: boolean;
  createdAt: number;
  kind: "text" | "image" | "video";
  mediaUrl: string | null;
};

type RawMessageDoc = {
  text?: string;
  senderId?: string;
  createdAt?: { toMillis?: () => number } | number;
  kind?: "text" | "image" | "video";
  mediaUrl?: string;
};

export type ChatThreadReceipts = {
  /** Latest time the pro opened this thread (for customer read receipts). */
  proLastReadAtMs: number;
};

type ThreadReceiptFields = {
  proLastReadAt?: RawMessageDoc["createdAt"];
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
    kind: "text",
    createdAt: serverTimestamp(),
  });
}

export async function sendMediaMessageToPro(input: {
  proId: string;
  proName: string;
  proImageUrl: string;
  localUri: string;
  mediaKind: "image" | "video";
  text?: string;
}): Promise<void> {
  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const threadId = threadIdFor(customerId, input.proId);
  const ext = input.mediaKind === "video" ? "mp4" : "jpg";
  const filePath = `users/${customerId}/chat-media/${threadId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${ext}`;

  const res = await fetch(input.localUri);
  const blob = await res.blob();
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, blob, {
    contentType: input.mediaKind === "video" ? "video/mp4" : "image/jpeg",
  });
  const mediaUrl = await getDownloadURL(storageRef);

  const caption = (input.text ?? "").trim();
  const preview =
    caption.length > 0
      ? caption.slice(0, 200)
      : input.mediaKind === "video"
        ? "Sent a video"
        : "Sent an image";

  const threadRef = doc(db, "chat_threads", threadId);
  await setDoc(
    threadRef,
    {
      participantIds: [customerId, input.proId],
      customerId,
      proId: input.proId,
      proName: input.proName,
      proImageUrl: input.proImageUrl,
      lastPreview: preview,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(db, "chat_messages", threadId, "items"), {
    text: caption,
    senderId: customerId,
    kind: input.mediaKind,
    mediaUrl,
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
          kind: data.kind === "image" || data.kind === "video" ? data.kind : "text",
          mediaUrl: typeof data.mediaUrl === "string" ? data.mediaUrl : null,
        } satisfies ConversationMessage;
      });
      onData(out);
    },
    () => {
      onData([]);
    },
  );
}

export async function listenThreadReceipts(
  proId: string,
  onData: (r: ChatThreadReceipts) => void,
): Promise<() => void> {
  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const threadId = threadIdFor(customerId, proId);
  const threadRef = doc(db, "chat_threads", threadId);
  return onSnapshot(
    threadRef,
    (snap) => {
      if (!snap.exists()) {
        onData({ proLastReadAtMs: 0 });
        return;
      }
      const data = (snap.data() as ThreadReceiptFields) ?? {};
      const raw = data.proLastReadAt;
      const proMs = raw !== undefined ? toMillis(raw as RawMessageDoc["createdAt"]) : 0;
      onData({ proLastReadAtMs: proMs });
    },
    () => {
      onData({ proLastReadAtMs: 0 });
    },
  );
}

/**
 * Call when the professional opens this thread (pro account uid must equal `proId` on thread).
 * Updates `proLastReadAt` so the customer sees Delivered vs Seen on their outbound messages.
 */
export async function markProConversationRead(input: {
  customerId: string;
}): Promise<void> {
  const proId = getFirebaseAuth().currentUser?.uid;
  if (!proId) throw new Error("No authenticated session.");

  const db = getFirebaseFirestore();
  const threadId = threadIdFor(input.customerId, proId);
  const threadRef = doc(db, "chat_threads", threadId);
  await setDoc(
    threadRef,
    {
      proLastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markConversationRead(proId: string): Promise<void> {
  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const threadId = threadIdFor(customerId, proId);
  const threadRef = doc(db, "chat_threads", threadId);
  await setDoc(
    threadRef,
    {
      participantIds: [customerId, proId],
      customerId,
      proId,
      customerLastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Removes the demo conversation and all uploaded media for the current customer.
 * Safe to call repeatedly.
 */
export async function cleanupMyDemoConversation(): Promise<void> {
  const customerId = await getCurrentCustomerId();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const demoProId = "demo-pro-fixit";
  const threadId = threadIdFor(customerId, demoProId);

  try {
    const msgSnap = await getDocs(collection(db, "chat_messages", threadId, "items"));
    await Promise.all(msgSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore cleanup failures, continue with best effort
  }

  try {
    await deleteDoc(doc(db, "chat_threads", threadId));
  } catch {
    // ignore cleanup failures, continue with best effort
  }

  try {
    const mediaRoot = ref(storage, `users/${customerId}/chat-media/${threadId}`);
    const listed = await listAll(mediaRoot);
    await Promise.all(listed.items.map((item) => deleteObject(item)));
  } catch {
    // ignore missing folder or permission edge-cases
  }
}
