import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  emptyTradeLicenseDraft,
  loadMyProApplicationDraft,
  saveComplianceLicenses,
  syncLicensesByCategoryIds,
  uploadTradeLicenseDocument,
  type TradeLicenseDraft,
} from "@/data/repositories/proProfileRepository";
import { useDiscoveryData } from "@/features/home/hooks/useDiscoveryData";
import { isRegulatedCategoryId } from "@/features/pro/data/regulatedCategoryIds";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { colors, radii, spacing } from "@/theme/tokens";

function patchLicense(
  map: Record<string, TradeLicenseDraft>,
  categoryId: string,
  patch: Partial<TradeLicenseDraft>,
): Record<string, TradeLicenseDraft> {
  const prev = map[categoryId] ?? emptyTradeLicenseDraft();
  return {
    ...map,
    [categoryId]: { ...prev, ...patch },
  };
}

export function ProTradeLicensesScreen() {
  const { data: discoveryData, loading: discoveryLoading } = useDiscoveryData();
  const [licenses, setLicenses] = useState<Record<string, TradeLicenseDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const regulatedRows = discoveryData.categories.filter((c) => isRegulatedCategoryId(c.id));

  const regulatedIdsKey = useMemo(
    () =>
      discoveryData.categories
        .filter((c) => isRegulatedCategoryId(c.id))
        .map((c) => c.id)
        .sort()
        .join("|"),
    [discoveryData.categories],
  );

  useEffect(() => {
    if (discoveryLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const draft = await loadMyProApplicationDraft();
        const ids = regulatedIdsKey.length > 0 ? regulatedIdsKey.split("|") : [];
        if (!cancelled) {
          setLicenses(syncLicensesByCategoryIds(ids, draft.licensesByCategoryId));
        }
      } catch {
        if (!cancelled) setLicenses({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discoveryLoading, regulatedIdsKey]);

  const runPick = async (categoryId: string, source: "camera" | "library") => {
    setUploadingId(categoryId);
    try {
      if (source === "camera") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPerm.status !== "granted") {
          Alert.alert("Permission needed", "Camera access is required.");
          return;
        }
      } else {
        const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (mediaPerm.status !== "granted") {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.85,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 0.85,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const url = await uploadTradeLicenseDocument(
        categoryId,
        asset.uri,
        asset.mimeType ?? undefined,
      );
      setLicenses((prev) => patchLicense(prev, categoryId, { licenseDocumentUrl: url }));
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const pickDocument = (categoryId: string) => {
    Alert.alert("Upload license document", "Choose a source.", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: () => void runPick(categoryId, "camera") },
      { text: "Gallery", onPress: () => void runPick(categoryId, "library") },
    ]);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveComplianceLicenses(licenses);
      Alert.alert("Saved", "Our team will review your license details.");
      router.back();
    } catch (e: unknown) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || discoveryLoading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Trade licenses" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (regulatedRows.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Trade licenses" />
        <View style={styles.centered}>
          <Text style={styles.muted}>No regulated trades in the catalog.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Trade licenses" />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Enter license numbers and upload a document for each regulated trade you offer. Our team
          reviews submissions — you do not need to redo the full application.
        </Text>

        {regulatedRows.map((cat) => {
          const row = licenses[cat.id] ?? emptyTradeLicenseDraft();
          const busy = uploadingId === cat.id;
          const hasDoc = row.licenseDocumentUrl.trim().length > 0;
          return (
            <View key={cat.id} style={styles.card}>
              <Text style={styles.cardTitle}>{cat.label}</Text>

              <Text style={styles.label}>License number</Text>
              <TextInput
                style={styles.input}
                value={row.licenseNumber}
                onChangeText={(licenseNumber) =>
                  setLicenses((prev) => patchLicense(prev, cat.id, { licenseNumber }))
                }
                placeholder="Number"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={row.licenseState}
                onChangeText={(licenseState) =>
                  setLicenses((prev) => patchLicense(prev, cat.id, { licenseState }))
                }
                placeholder="Issuing state"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Expiration</Text>
              <TextInput
                style={styles.input}
                value={row.licenseExpirationDate}
                onChangeText={(licenseExpirationDate) =>
                  setLicenses((prev) => patchLicense(prev, cat.id, { licenseExpirationDate }))
                }
                placeholder="MM/DD/YYYY"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Document</Text>
              <Pressable
                style={[styles.uploadBtn, busy && styles.uploadBtnDisabled]}
                onPress={() => pickDocument(cat.id)}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
                )}
                <Text style={styles.uploadBtnText}>
                  {hasDoc ? "Replace document" : "Upload document"}
                </Text>
                {hasDoc ? <Ionicons name="checkmark-circle" size={20} color="#16A34A" /> : null}
              </Pressable>
            </View>
          );
        })}

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={() => void onSave()}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  muted: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.lg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.textPrimary, marginBottom: spacing.xs },
  label: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSoft,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.primary },
  saveBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: colors.background },
  backBtn: { marginTop: spacing.md, padding: spacing.md },
  backBtnText: { fontWeight: "600", color: colors.primary, fontSize: 15 },
});
