/** One row in the Messages inbox (local preview until Firestore). */
export type ChatThreadRow = {
  proId: string;
  proName: string;
  proImageUrl: string;
  /** Last customer or pro line shown in the list. */
  lastPreview: string;
  updatedAt: number;
  hasUnread: boolean;
};

export type StoredChatBubble = {
  id: string;
  text: string;
  fromCustomer: boolean;
};
