import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listenConversationWithPro,
  sendMessageToPro,
  type ConversationMessage,
} from "@/data/repositories/chatRepository";
import { listingById } from "@/data/repositories/discoveryRepository";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import { freelancerIdFromParams } from "../utils/freelancerRouteParams";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { fontFamily } from "@/theme/fonts";
import { colors, radii, spacing } from "@/theme/tokens";

/**
 * One-to-one chat surface for a customer and a freelancer (Firestore-backed).
 */
export function FreelancerChatScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = freelancerIdFromParams(params.id);
  const { data: discoveryData } = useDiscoveryData();
  const listing = id ? listingById(discoveryData, id) : undefined;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    if (!listing) return;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      unsubscribe = await listenConversationWithPro(listing.id, setMessages);
    })();
    return () => {
      unsubscribe?.();
    };
  }, [listing?.id]);

  const send = useCallback(() => {
    if (!listing) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendMessageToPro({
      proId: listing.id,
      proName: listing.title,
      proImageUrl: listing.imageUrl,
      text,
    });
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [draft, listing]);

  if (!listing) {
    return (
      <CustomerAppChrome>
        <ScreenHeader title="Chat" />
        <View style={styles.notFound}>
          <EmptyState
            title="Professional not found"
            description="Go back and open a profile."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  return (
    <CustomerAppChrome>
      <ScreenHeader title={listing.title} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={[
            styles.threadContent,
            { paddingBottom: spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.length === 0 ? (
            <Text style={styles.hint}>No messages yet.</Text>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubbleRow,
                  m.fromCustomer ? styles.bubbleRowMe : styles.bubbleRowThem,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    m.fromCustomer ? styles.bubbleMe : styles.bubbleThem,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      m.fromCustomer ? styles.bubbleTextMe : styles.bubbleTextThem,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <View style={styles.composerInner}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message…"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={send}
              style={({ pressed }) => [
                styles.send,
                !draft.trim() && styles.sendDisabled,
                pressed && draft.trim() && styles.sendPressed,
              ]}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              <Text style={styles.sendLabel}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: { flex: 1, padding: spacing.lg },
  thread: { flex: 1 },
  threadContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  bubbleRow: {
    marginBottom: spacing.sm,
    flexDirection: "row",
  },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowThem: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.card,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
  },
  bubbleThem: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextMe: { color: colors.background },
  bubbleTextThem: { color: colors.textPrimary },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  send: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
  sendPressed: { opacity: 0.9 },
  sendLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    fontWeight: "700",
    color: colors.background,
  },
});
