import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatThreadRow, StoredChatBubble } from "../types";

const THREADS_KEY = "@fixit/v1/chatThreads";
const messagesStorageKey = (proId: string) =>
  `@fixit/v1/chatMessages/${encodeURIComponent(proId)}`;

function parseThreads(json: string | null): ChatThreadRow[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is ChatThreadRow =>
          typeof r === "object" &&
          r != null &&
          typeof (r as ChatThreadRow).proId === "string" &&
          typeof (r as ChatThreadRow).proName === "string",
      )
      .map((r) => ({
        proId: r.proId,
        proName: r.proName,
        proImageUrl:
          typeof r.proImageUrl === "string" ? r.proImageUrl : "",
        lastPreview:
          typeof r.lastPreview === "string" ? r.lastPreview : "",
        updatedAt:
          typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

export async function getThreads(): Promise<ChatThreadRow[]> {
  const raw = await AsyncStorage.getItem(THREADS_KEY);
  const rows = parseThreads(raw);
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function saveThreads(rows: ChatThreadRow[]): Promise<void> {
  await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(rows));
}

/** After a new message, refresh inbox row for this pro. */
export async function upsertThreadAfterMessage(
  proId: string,
  meta: { proName: string; proImageUrl: string },
  lastPreview: string,
): Promise<void> {
  const rows = await getThreads();
  const others = rows.filter((r) => r.proId !== proId);
  const next: ChatThreadRow = {
    proId,
    proName: meta.proName,
    proImageUrl: meta.proImageUrl,
    lastPreview: lastPreview.slice(0, 200),
    updatedAt: Date.now(),
  };
  await saveThreads([next, ...others]);
}

export async function getMessages(proId: string): Promise<StoredChatBubble[]> {
  const raw = await AsyncStorage.getItem(messagesStorageKey(proId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredChatBubble =>
        typeof m === "object" &&
        m != null &&
        typeof (m as StoredChatBubble).id === "string" &&
        typeof (m as StoredChatBubble).text === "string" &&
        typeof (m as StoredChatBubble).fromCustomer === "boolean",
    );
  } catch {
    return [];
  }
}

export async function saveMessages(
  proId: string,
  messages: StoredChatBubble[],
): Promise<void> {
  await AsyncStorage.setItem(
    messagesStorageKey(proId),
    JSON.stringify(messages),
  );
}
