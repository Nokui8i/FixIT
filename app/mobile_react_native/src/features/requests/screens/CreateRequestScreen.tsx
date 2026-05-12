import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDiscoveryData } from "@/features/home/hooks/useDiscoveryData";
import { SelectField } from "@/features/requests/components/SelectField";
import {
  createServiceRequest,
  type RequestUrgency,
} from "@/features/requests/api/createServiceRequest";
import { specialtiesForCategory } from "@/features/requests/data/categorySpecialties";
import { requestOffersPath } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { fontFamily } from "@/theme/fonts";
import { colors, radii, spacing } from "@/theme/tokens";
import { listingById } from "@/data/repositories/discoveryRepository";

const MIN_DESCRIPTION_LENGTH = 40;
/** Hard cap for request description (and directed message) — aligns with typical Firestore / UI limits. */
const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Open marketplace: category + job type dropdowns + long description (Fiverr/Upwork-style).
 * Directed (`proId`): single message to that pro.
 * Persistence: `createServiceRequest` in `src/features/requests/api/createServiceRequest.ts`.
 */
function stringRouteParam(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].length > 0)
    return v[0];
  return undefined;
}

function titleFromMessage(body: string): string {
  const line = body.trim().split(/\n/)[0] ?? "";
  const t = line.slice(0, 120).trim();
  return t.length > 0 ? t : "Message";
}

function buildOpenRequestTitle(categoryLabel: string, description: string): string {
  const label = categoryLabel || "Service";
  const firstLine =
    description
      .trim()
      .split(/\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  if (firstLine.length === 0) return `${label} — help needed`;
  const max = 90;
  const clipped =
    firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine;
  return `${label}: ${clipped}`;
}

function formatRequestDetails(
  specialtyLabel: string | undefined,
  body: string,
): string {
  const trimmed = body.trim();
  if (specialtyLabel && specialtyLabel.length > 0) {
    return `Job type: ${specialtyLabel}\n\n${trimmed}`;
  }
  return trimmed;
}

export function CreateRequestScreen() {
  const { data: discoveryData } = useDiscoveryData();
  const params = useLocalSearchParams<{
    categoryId?: string | string[];
    proId?: string | string[];
  }>();
  const paramCategory = stringRouteParam(params.categoryId);
  const paramProId = stringRouteParam(params.proId);
  const initialCategory = paramCategory;
  const directedPro = paramProId ? listingById(discoveryData, paramProId) : undefined;
  const isDirectedRequest = Boolean(paramProId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(initialCategory);
  const [specialtyId, setSpecialtyId] = useState<string | undefined>(
    undefined,
  );
  const [urgency, setUrgency] = useState<RequestUrgency>("standard");
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  useEffect(() => {
    const isKnown = discoveryData.categories.some((c) => c.id === paramCategory);
    if (paramCategory && isKnown) {
      setSelectedCategoryId(paramCategory);
    }
  }, [paramCategory, discoveryData.categories]);

  /** Close inline dropdown when category changes — avoids layout jumps and stale lists. */
  useEffect(() => {
    setOpenMenuKey(null);
  }, [selectedCategoryId]);

  // Important with tab navigation: close menus when leaving this screen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setOpenMenuKey(null);
      };
    }, []),
  );

  /** Directed flow still sends `categoryId` to the API; keep a value if the route omitted it. */
  useEffect(() => {
    if (!isDirectedRequest || selectedCategoryId) return;
    const first = discoveryData.categories[0]?.id;
    if (first) setSelectedCategoryId(first);
  }, [isDirectedRequest, selectedCategoryId, discoveryData.categories]);

  const categoryOptions = useMemo(
    () => discoveryData.categories.map((c) => ({ id: c.id, label: c.label })),
    [discoveryData.categories],
  );

  const specialtyOptions = useMemo(() => {
    if (!selectedCategoryId) return [];
    const options = specialtiesForCategory(selectedCategoryId);
    if (options.length > 0) return options;
    return [{ id: "general", label: "General" }];
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId || specialtyOptions.length === 0) {
      setSpecialtyId(undefined);
      return;
    }
    setSpecialtyId((prev) => {
      const stillValid =
        prev !== undefined && specialtyOptions.some((o) => o.id === prev);
      if (stillValid) return prev;
      return specialtyOptions[0]?.id;
    });
  }, [selectedCategoryId, specialtyOptions]);

  const specialtyLabel = useMemo(() => {
    if (!specialtyId) return undefined;
    return specialtyOptions.find((o) => o.id === specialtyId)?.label;
  }, [specialtyId, specialtyOptions]);
  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategoryId) return "Service";
    return (
      discoveryData.categories.find((row) => row.id === selectedCategoryId)?.label ??
      "Service"
    );
  }, [selectedCategoryId, discoveryData.categories]);

  const submitDirected = async () => {
    const body = message.trim();
    if (!body) {
      Alert.alert("Required", "Write a message.");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert("Required", "Missing category.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createServiceRequest({
        title: titleFromMessage(body),
        details: body,
        categoryId: selectedCategoryId,
        urgency: "standard",
        targetProId: paramProId,
      });
      if (result.status === "ok") {
        router.replace(requestOffersPath(result.requestId));
        return;
      }
      Alert.alert("Cannot send yet", result.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitOpen = async () => {
    if (!selectedCategoryId) {
      Alert.alert("Required", "Choose the type of service you need.");
      return;
    }
    if (!specialtyId) {
      Alert.alert("Required", "Choose what kind of job it is.");
      return;
    }
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < MIN_DESCRIPTION_LENGTH) {
      Alert.alert(
        "Add a bit more detail",
        `Describe the situation in at least ${MIN_DESCRIPTION_LENGTH} characters so pros can quote accurately.`,
      );
      return;
    }
    if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
      Alert.alert(
        "Too long",
        `Please keep your description at or under ${MAX_DESCRIPTION_LENGTH} characters.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await createServiceRequest({
        title: buildOpenRequestTitle(selectedCategoryLabel, trimmedDesc),
        details: formatRequestDetails(specialtyLabel, trimmedDesc),
        categoryId: selectedCategoryId,
        specialtyId,
        specialtyLabel,
        urgency,
      });
      if (result.status === "ok") {
        router.replace(requestOffersPath(result.requestId));
        return;
      }
      Alert.alert("Cannot submit yet", result.message);
    } finally {
      setSubmitting(false);
    }
  };

  const recipientName = directedPro?.title ?? "Professional";

  return (
    <CustomerAppChrome reserveHubTabBar>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
          {isDirectedRequest ? (
            <>
              <ScreenPageTitle padded={false}>Message</ScreenPageTitle>
              <Text style={styles.recipientLine}>
                <Text style={styles.recipientMuted}>To </Text>
                <Text style={styles.recipientName}>{recipientName}</Text>
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message…"
                placeholderTextColor={colors.textSecondary}
                style={styles.messageInput}
                multiline
                textAlignVertical="top"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <Text style={styles.charCount}>
                {message.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
              <Pressable
                style={[
                  styles.sendButton,
                  submitting && styles.sendButtonDisabled,
                ]}
                onPress={submitDirected}
                disabled={submitting}
              >
                <Text style={styles.sendButtonText}>
                  {submitting ? "…" : "Send"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <ScreenPageTitle padded={false} style={styles.titleLight}>
                Post a request
              </ScreenPageTitle>

              <SelectField
                label="What service do you need?"
                menuKey="category"
                openMenuKey={openMenuKey}
                onOpenMenuKey={setOpenMenuKey}
                valueId={selectedCategoryId}
                options={categoryOptions}
                onSelect={(o) => setSelectedCategoryId(o.id)}
                placeholder="Select a category"
              />

              <SelectField
                label="What kind of job is it?"
                menuKey="specialty"
                openMenuKey={openMenuKey}
                onOpenMenuKey={setOpenMenuKey}
                valueId={specialtyId}
                options={specialtyOptions}
                onSelect={(o) => setSpecialtyId(o.id)}
                placeholder={
                  selectedCategoryId
                    ? "Select job type"
                    : "Pick a category first"
                }
                disabled={!selectedCategoryId || specialtyOptions.length === 0}
              />

              <Text style={styles.label}>Describe your situation</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={colors.textSecondary}
                style={styles.descriptionInput}
                multiline
                textAlignVertical="top"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <Text style={styles.charCount}>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>

              <Text style={styles.sectionLabel}>When</Text>
              <View style={styles.urgencyRow}>
                {(
                  [
                    { key: "standard" as const, label: "Flexible" },
                    { key: "urgent" as const, label: "Urgent" },
                  ] satisfies { key: RequestUrgency; label: string }[]
                ).map(({ key, label }) => {
                  const on = urgency === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.urgencyPill, on && styles.urgencyPillOn]}
                      onPress={() => setUrgency(key)}
                    >
                      <Text
                        style={[styles.urgencyText, on && styles.urgencyTextOn]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.primary, submitting && styles.primaryDisabled]}
                onPress={submitOpen}
                disabled={submitting}
              >
                <Text style={styles.primaryText}>
                  {submitting ? "…" : "Post request"}
                </Text>
              </Pressable>
            </>
          )}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 28,
  },
  recipientLine: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  titleLight: {
    fontFamily: fontFamily.regular,
    fontWeight: "400",
    letterSpacing: 0,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  recipientMuted: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  recipientName: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  messageInput: {
    minHeight: 170,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  sendButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingVertical: 11,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  urgencyRow: {
    flexDirection: "row",
    gap: 6,
  },
  urgencyPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  urgencyPillOn: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.woltSeeAllBg,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  urgencyTextOn: {
    color: colors.textPrimary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  descriptionInput: {
    minHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  charCount: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    color: colors.textSecondary,
    textAlign: "right",
  },
  primary: {
    marginTop: spacing.xl,
    backgroundColor: colors.woltSeeAllBg,
    borderRadius: radii.button,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
