import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ResizeMode, Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listenConversationWithPro,
  markConversationRead,
  sendMediaMessageToPro,
  sendMessageToPro,
  type ConversationMessage,
} from "@/data/repositories/chatRepository";
import { listingById } from "@/data/repositories/discoveryRepository";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import { freelancerIdFromParams } from "../utils/freelancerRouteParams";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { freelancerProfileHref } from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { colors, radii, spacing } from "@/theme/tokens";

function formatMessageTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayChip(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ChatRow =
  | { type: "day"; id: string; label: string }
  | { type: "msg"; id: string; m: ConversationMessage; groupBreak: boolean };

/**
 * One-to-one chat surface for a customer and a freelancer (Firestore-backed).
 */
export function FreelancerChatScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    proName?: string | string[];
    proImageUrl?: string | string[];
  }>();
  const id = freelancerIdFromParams(params.id);
  const { data: discoveryData } = useDiscoveryData();
  const listing = id ? listingById(discoveryData, id) : undefined;
  const paramProName = Array.isArray(params.proName)
    ? params.proName[0]
    : params.proName;
  const paramProImageUrl = Array.isArray(params.proImageUrl)
    ? params.proImageUrl[0]
    : params.proImageUrl;
  const chatProId = listing?.id ?? id ?? "";
  const chatProName = listing?.title ?? (paramProName || "Professional");
  const chatProImageUrl = listing?.imageUrl ?? (paramProImageUrl || "");
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatRow>>(null);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    uri: string;
    kind: "image" | "video";
  } | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [viewer, setViewer] = useState<{
    uri: string;
    kind: "image" | "video";
  } | null>(null);

  useEffect(() => {
    if (!chatProId) return;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      unsubscribe = await listenConversationWithPro(chatProId, setMessages);
    })();
    return () => {
      unsubscribe?.();
    };
  }, [chatProId]);

  useEffect(() => {
    if (!chatProId) return;
    void markConversationRead(chatProId);
  }, [chatProId, messages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => {
      showSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setAttachMenuOpen(false);
      };
    }, []),
  );

  const send = useCallback(() => {
    if (!chatProId) return;
    const text = draft.trim();
    if (!pendingMedia && !text) return;

    if (pendingMedia) {
      setSendingMedia(true);
      void (async () => {
        try {
          await sendMediaMessageToPro({
            proId: chatProId,
            proName: chatProName,
            proImageUrl: chatProImageUrl,
            localUri: pendingMedia.uri,
            mediaKind: pendingMedia.kind,
            text,
          });
          setDraft("");
          setPendingMedia(null);
          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: true });
          });
        } catch {
          Alert.alert("Could not send media", "Please try again.");
        } finally {
          setSendingMedia(false);
        }
      })();
      return;
    }

    setDraft("");
    void sendMessageToPro({
      proId: chatProId,
      proName: chatProName,
      proImageUrl: chatProImageUrl,
      text,
    });
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [chatProId, chatProImageUrl, chatProName, draft, pendingMedia]);

  const pickMediaForPreview = useCallback(
    async (kind: "image") => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsMultipleSelection: false,
        });
        if (result.canceled || result.assets.length === 0) return;
        const picked = result.assets[0];
        setPendingMedia({ uri: picked.uri, kind });
      } catch {
        Alert.alert("Could not open library", "Please try again.");
      }
    },
    [],
  );

  const openAttachMenu = useCallback(() => {
    setAttachMenuOpen((v) => !v);
  }, []);

  const openProProfile = useCallback(() => {
    if (!chatProId) return;
    router.push(freelancerProfileHref(chatProId));
  }, [chatProId]);

  const rows: ChatRow[] = (() => {
    const out: ChatRow[] = [];
    let lastDayKey = "";
    for (const m of messages) {
      const prev = out.length > 0 ? out[out.length - 1] : null;
      const d = new Date(m.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        out.push({
          type: "day",
          id: `day-${dayKey}`,
          label: formatDayChip(m.createdAt),
        });
      }
      const prevMsg = prev && prev.type === "msg" ? prev.m : null;
      out.push({
        type: "msg",
        id: m.id,
        m,
        groupBreak: !!prevMsg && prevMsg.fromCustomer !== m.fromCustomer,
      });
    }
    return out;
  })();

  if (!chatProId) {
    return (
      <CustomerAppChrome>
        <ScreenHeader
          omitSafeAreaTop
          title="Chat"
          subtitle="Tap here for contact info"
        />
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
      <ScreenHeader
        omitSafeAreaTop
        title={chatProName}
        subtitle="Tap here for contact info"
        onSubtitlePress={openProProfile}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 2 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyThread}>
            <Text style={styles.hint}>No messages yet.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.id}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            onTouchStart={() => Keyboard.dismiss()}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if (item.type === "day") {
                return (
                  <View style={styles.dayChipWrap}>
                    <View style={styles.dayChip}>
                      <Text style={styles.dayChipText}>{item.label}</Text>
                    </View>
                  </View>
                );
              }

              const m = item.m;
              const isMe = m.fromCustomer;
              const label = isMe ? "Me" : chatProName;
              const time = formatMessageTime(m.createdAt);
              const showAvatar = !isMe;
              return (
                <View style={[styles.row, item.groupBreak && styles.rowGroupBreak]}>
                  <View style={styles.rowTop}>
                    <View
                      style={[
                        styles.senderStripe,
                        isMe ? styles.senderStripeMe : styles.senderStripeThem,
                      ]}
                    />
                    {showAvatar ? (
                      <Pressable
                        onPress={openProProfile}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${chatProName} profile`}
                      >
                        {chatProImageUrl ? (
                          <Image
                            source={{ uri: chatProImageUrl }}
                            style={styles.avatar}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                              {chatProName.trim().slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    ) : null}
                    <View style={styles.meta}>
                      <View style={styles.metaTop}>
                        {isMe ? (
                          <Text style={styles.senderName}>{label}</Text>
                        ) : (
                          <Pressable
                            onPress={openProProfile}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${chatProName} profile`}
                          >
                            <Text style={styles.senderName}>{label}</Text>
                          </Pressable>
                        )}
                        <Text style={styles.senderTime}>{time}</Text>
                      </View>
                      <View
                        style={[
                          styles.bubble,
                          isMe ? styles.bubbleMe : styles.bubbleThem,
                        ]}
                      >
                        {m.kind === "image" && m.mediaUrl ? (
                          <Pressable onPress={() => setViewer({ uri: m.mediaUrl!, kind: "image" })}>
                            <Image
                              source={{ uri: m.mediaUrl }}
                              style={styles.mediaImage}
                              contentFit="cover"
                            />
                          </Pressable>
                        ) : null}
                        {m.kind === "video" && m.mediaUrl ? (
                          <Pressable onPress={() => setViewer({ uri: m.mediaUrl!, kind: "video" })}>
                            <Video
                              source={{ uri: m.mediaUrl }}
                              style={styles.mediaVideo}
                              useNativeControls={false}
                              resizeMode={ResizeMode.COVER}
                              isLooping={false}
                            />
                            <View style={styles.videoPlayBadge}>
                              <Ionicons name="play" size={16} color="#fff" />
                            </View>
                          </Pressable>
                        ) : null}
                        {m.text.trim().length > 0 ? (
                          <Text style={styles.bubbleText}>{m.text}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <View style={styles.composerInner}>
            <View style={styles.attachWrap}>
              {attachMenuOpen ? (
                <View style={styles.attachMenu}>
                  <Pressable
                    style={({ pressed }) => [styles.attachMenuItem, pressed && styles.attachMenuItemPressed]}
                    onPress={() => {
                      setAttachMenuOpen(false);
                      void pickMediaForPreview("image");
                    }}
                  >
                    <View style={styles.attachMenuIconWrap}>
                      <Ionicons name="image-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.attachMenuLabel}>Upload image</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                onPress={openAttachMenu}
                style={({ pressed }) => [
                  styles.attachBtn,
                  pressed && styles.attachBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add attachment"
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            {pendingMedia ? (
              <View style={styles.pendingPreview}>
                {pendingMedia.kind === "image" ? (
                  <Image source={{ uri: pendingMedia.uri }} style={styles.pendingMedia} contentFit="cover" />
                ) : (
                  <Video
                    source={{ uri: pendingMedia.uri }}
                    style={styles.pendingMedia}
                    useNativeControls={false}
                    resizeMode={ResizeMode.COVER}
                    isLooping={false}
                  />
                )}
                <Pressable
                  style={styles.pendingClose}
                  onPress={() => setPendingMedia(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attachment"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : null}
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
                !draft.trim() && !pendingMedia && styles.sendDisabled,
                pressed && (draft.trim() || pendingMedia) && styles.sendPressed,
              ]}
              disabled={(!draft.trim() && !pendingMedia) || sendingMedia}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              {sendingMedia ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.sendLabel}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={viewer !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewer(null)}
      >
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerClose} onPress={() => setViewer(null)}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {viewer?.kind === "image" ? (
            <Image source={{ uri: viewer.uri }} style={styles.viewerMedia} contentFit="contain" />
          ) : viewer?.kind === "video" ? (
            <Video
              source={{ uri: viewer.uri }}
              style={styles.viewerMedia}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : null}
        </View>
      </Modal>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: { flex: 1, padding: spacing.lg },
  thread: { flex: 1 },
  emptyThread: { flex: 1 },
  threadContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  dayChipWrap: { alignItems: "center", marginVertical: spacing.sm },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dayChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  row: { marginBottom: spacing.sm },
  rowGroupBreak: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowTop: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  senderStripe: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 2,
    marginTop: 1,
  },
  senderStripeMe: { backgroundColor: "#9CA3AF" },
  senderStripeThem: { backgroundColor: "#D1D5DB" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarInitial: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  meta: { minWidth: 0, maxWidth: "86%", alignItems: "flex-start", flex: 1 },
  metaTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  senderTime: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  bubble: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.card,
    backgroundColor: "transparent",
  },
  bubbleMe: {
    borderWidth: 0,
  },
  bubbleThem: {
    borderWidth: 0,
  },
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.surfaceSoft,
  },
  mediaVideo: {
    width: 220,
    height: 160,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.surfaceSoft,
  },
  videoPlayBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  attachWrap: {
    position: "relative",
    justifyContent: "flex-end",
  },
  attachMenu: {
    position: "absolute",
    left: 0,
    bottom: 46,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minWidth: 190,
    overflow: "hidden",
    zIndex: 50,
    elevation: 8,
  },
  attachMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  attachMenuItemPressed: { backgroundColor: colors.surfaceSoft },
  attachMenuIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(220, 38, 38, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachMenuLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnPressed: { opacity: 0.85 },
  pendingPreview: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  pendingMedia: {
    width: "100%",
    height: "100%",
  },
  pendingClose: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  send: {
    minWidth: 56,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
  sendPressed: { opacity: 0.9 },
  sendLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontWeight: "700",
    color: colors.background,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  viewerClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerMedia: {
    width: "100%",
    height: "78%",
  },
});
