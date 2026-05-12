import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { freelancerProfileHref, routes } from "@/navigation/routes";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import {
  loadMyProApplicationDraft,
  loadMyProProfile,
  saveMyProProfile,
  type MyProProfile,
  type TradeLicenseDraft,
} from "@/data/repositories/proProfileRepository";
import { loadMyUserProfile } from "@/data/repositories/userRepository";
import { categoryLabelFromId } from "@/features/home/data/categoryCatalog";
import { useDiscoveryData } from "@/features/home/hooks/useDiscoveryData";
import { getFirebaseAuth } from "@/shared/firebase/client";
import { hasOwnerBypass } from "@/shared/domain/userRoles";
import { PRO_CATEGORY_ICONS } from "@/features/pro/data/proCategoryIcons";
import { isRegulatedCategoryId } from "@/features/pro/data/regulatedCategoryIds";
import { canOfferRegulatedCategory } from "@/features/pro/utils/proTradeLicenseGate";

function DashCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.dashCard}>{children}</View>;
}

export function ProHomeScreen() {
  const { data: discoveryData, loading: categoriesLoading } = useDiscoveryData();
  const [profile, setProfile] = useState<MyProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [professionsOpen, setProfessionsOpen] = useState(false);
  const [licenseMap, setLicenseMap] = useState<Record<string, TradeLicenseDraft>>({});
  const [ownerAccess, setOwnerAccess] = useState(false);

  const uid = getFirebaseAuth().currentUser?.uid ?? "";

  const refreshLicenses = useCallback(async () => {
    try {
      const draft = await loadMyProApplicationDraft();
      setLicenseMap(draft.licensesByCategoryId);
    } catch {
      /* compliance read failed — gate stays closed for regulated trades */
    }
  }, []);

  const reload = useCallback(() => {
    void (async () => {
      setLoading(true);
      try {
        setLoadError(false);
        const [p, userProfile] = await Promise.all([
          loadMyProProfile(),
          loadMyUserProfile(),
        ]);
        setProfile(p);
        setOwnerAccess(hasOwnerBypass(userProfile.role));
        await refreshLicenses();
      } catch {
        setLoadError(true);
        setProfile(null);
        setOwnerAccess(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshLicenses]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      void refreshLicenses();
    }, [refreshLicenses]),
  );

  const persist = async (next: MyProProfile) => {
    setSaving(true);
    try {
      await saveMyProProfile(next);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Try again.";
      Alert.alert("Could not save", msg);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (id: string) => {
    if (!profile) return;
    const has = profile.categoryIds.includes(id);
    if (has) {
      const categoryIds = profile.categoryIds.filter((v) => v !== id);
      const next = { ...profile, categoryIds };
      setProfile(next);
      await persist(next);
      return;
    }
    if (!canOfferRegulatedCategory(id, licenseMap, { bypass: ownerAccess })) {
      const label =
        discoveryData.categories.find((c) => c.id === id)?.label ??
        categoryLabelFromId(id) ??
        id;
      Alert.alert(
        "Trade license required",
        `${label} needs a license number, state, expiration date, and uploaded document. Add them under Trade licenses — our team will review.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Trade licenses",
            onPress: () => router.push(routes.proTradeLicenses),
          },
        ],
      );
      return;
    }
    const categoryIds = [...profile.categoryIds, id];
    const next = { ...profile, categoryIds };
    setProfile(next);
    await persist(next);
  };

  const onToggleAvailability = async (value: boolean) => {
    if (!profile) return;
    const next = { ...profile, isActive: value };
    setProfile(next);
    await persist(next);
  };

  const professionSummary = useMemo(() => {
    if (!profile) return "";
    const labels = profile.categoryIds
      .map((id) => discoveryData.categories.find((c) => c.id === id)?.label)
      .filter(Boolean) as string[];
    if (labels.length === 0) return "Add professions";
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [profile, discoveryData.categories]);

  const previewAsCustomer = () => {
    if (!uid) return;
    router.push(freelancerProfileHref(uid));
  };

  const openProfessions = () => {
    setSettingsOpen(false);
    setProfessionsOpen(true);
  };

  const openSettingsRoute = (href: typeof routes.proTradeLicenses | typeof routes.proRequirements) => {
    setSettingsOpen(false);
    router.push(href);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Dashboard" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (loadError || !profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Dashboard" />
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Could not load your dashboard.</Text>
          <Pressable style={styles.retryBtn} onPress={() => void reload()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const approved = ownerAccess || profile.verificationStatus === "approved";
  const businessTitle =
    profile.title.trim().length > 0 ? profile.title.trim() : "Your business";
  const nProf = profile.categoryIds.length;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Dashboard" />
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {profile.verificationStatus === "pending_approval" ? (
          <DashCard>
            <View style={styles.bannerInner}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle}>
                  {ownerAccess ? "Owner review mode" : "Pending verification"}
                </Text>
                <Text style={styles.bannerMeta}>
                  {ownerAccess
                    ? "Approval gates are bypassed for this owner account."
                    : "We’ll notify you when you’re approved."}
                </Text>
                <Pressable style={styles.bannerLink} onPress={() => router.push(routes.proRequirements)}>
                  <Text style={styles.bannerLinkText}>Requirements</Text>
                </Pressable>
              </View>
            </View>
          </DashCard>
        ) : null}
        {profile.verificationStatus === "rejected" && !ownerAccess ? (
          <DashCard>
            <View style={styles.bannerInner}>
              <Ionicons name="alert-circle-outline" size={24} color="#B45309" />
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle}>Not approved</Text>
                <Text style={styles.bannerMeta}>
                  {profile.adminNotes.trim().length > 0
                    ? profile.adminNotes
                    : "You can update and apply again."}
                </Text>
                <Pressable style={styles.bannerLink} onPress={() => router.push(routes.proApply)}>
                  <Text style={styles.bannerLinkText}>Application</Text>
                </Pressable>
              </View>
            </View>
          </DashCard>
        ) : null}

        {approved ? (
          <>
            <DashCard>
              <View style={styles.overviewTop}>
                <View style={styles.overviewIcon}>
                  <Ionicons name="storefront-outline" size={26} color={colors.primary} />
                </View>
                <View style={styles.overviewText}>
                  <Text style={styles.overviewTitle} numberOfLines={2}>
                    {businessTitle}
                  </Text>
                  <View style={styles.pillRow}>
                    <View
                      style={[
                        styles.pill,
                        profile.isActive ? styles.pillOn : styles.pillOff,
                      ]}
                    >
                      <View style={[styles.dot, profile.isActive && styles.dotOn]} />
                      <Text style={styles.pillLabel}>
                        {profile.isActive ? "Live on marketplace" : "Hidden"}
                      </Text>
                    </View>
                    <Text style={styles.pillMeta}>
                      {nProf} {nProf === 1 ? "trade" : "trades"}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
                  <Ionicons name="settings-outline" size={16} color={colors.primary} />
                  <Text style={styles.settingsBtnText}>Settings</Text>
                </Pressable>
              </View>
            </DashCard>

            <View style={styles.actionStack}>
              <Pressable
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => router.push(routes.proIncoming)}
              >
                <View style={styles.actionButtonIconPrimary}>
                  <Ionicons name="notifications-outline" size={21} color={colors.background} />
                </View>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitlePrimary}>Incoming jobs</Text>
                  <Text style={styles.actionButtonMetaPrimary}>See customer requests and send offers</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.background} />
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => router.push(routes.proProfile)}
              >
                <View style={styles.actionButtonIcon}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Edit customer profile</Text>
                  <Text style={styles.actionButtonMeta}>Hero, bio, photos, videos, portfolio</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>

              {uid ? (
                <Pressable style={styles.actionButton} onPress={previewAsCustomer}>
                  <View style={styles.actionButtonIcon}>
                    <Ionicons name="eye-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionButtonText}>
                    <Text style={styles.actionButtonTitle}>Preview public page</Text>
                    <Text style={styles.actionButtonMeta}>Open exactly what customers see</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <Modal
              visible={settingsOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setSettingsOpen(false)}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setSettingsOpen(false)}>
                <Pressable style={styles.settingsSheet} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalHeaderTitle}>Freelancer settings</Text>
                    <Pressable onPress={() => setSettingsOpen(false)} hitSlop={12}>
                      <Text style={styles.modalDone}>Done</Text>
                    </Pressable>
                  </View>

                  <View style={styles.settingsBody}>
                    <View style={styles.settingsStatusRow}>
                      <View style={styles.settingsStatusText}>
                        <Text style={styles.settingsRowTitle}>Marketplace listing</Text>
                        <Text style={styles.settingsRowMeta}>
                          {profile.isActive
                            ? "Customers can find and contact you."
                            : "Your public profile is hidden from discovery."}
                        </Text>
                      </View>
                      <View style={styles.switchCompact}>
                        <Switch
                          value={profile.isActive}
                          onValueChange={(v) => void onToggleAvailability(v)}
                          trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
                          disabled={saving}
                        />
                      </View>
                    </View>

                    <Pressable
                      style={styles.settingsRow}
                      onPress={openProfessions}
                      disabled={categoriesLoading || discoveryData.categories.length === 0}
                    >
                      <View style={styles.settingsRowIcon}>
                        <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.settingsRowText}>
                        <Text style={styles.settingsRowTitle}>Professions</Text>
                        <Text style={styles.settingsRowMeta} numberOfLines={2}>
                          {categoriesLoading ? "Loading…" : professionSummary}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>
                    {!categoriesLoading && discoveryData.categories.length === 0 ? (
                      <Text style={styles.emptyHint}>No categories in catalog.</Text>
                    ) : null}

                    <Pressable
                      style={styles.settingsRow}
                      onPress={() => openSettingsRoute(routes.proTradeLicenses)}
                    >
                      <View style={styles.settingsRowIcon}>
                        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.settingsRowText}>
                        <Text style={styles.settingsRowTitle}>Trade licenses & documents</Text>
                        <Text style={styles.settingsRowMeta}>Required for regulated services</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>

                    <Pressable
                      style={styles.settingsRow}
                      onPress={() => openSettingsRoute(routes.proRequirements)}
                    >
                      <View style={styles.settingsRowIcon}>
                        <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.settingsRowText}>
                        <Text style={styles.settingsRowTitle}>Help & requirements</Text>
                        <Text style={styles.settingsRowMeta}>Rules, approvals, and documents</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            <Modal
              visible={professionsOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setProfessionsOpen(false)}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setProfessionsOpen(false)}>
                <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalHeaderTitle}>Professions</Text>
                    <Pressable onPress={() => setProfessionsOpen(false)} hitSlop={12}>
                      <Text style={styles.modalDone}>Done</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    style={styles.modalScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {discoveryData.categories.map((cat) => {
                      const selected = profile.categoryIds.includes(cat.id);
                      const iconName = PRO_CATEGORY_ICONS[cat.id] ?? PRO_CATEGORY_ICONS.default;
                      const licenseBlocked =
                        !selected &&
                        isRegulatedCategoryId(cat.id) &&
                        !canOfferRegulatedCategory(cat.id, licenseMap);
                      return (
                        <Pressable
                          key={cat.id}
                          style={[styles.modalRow, licenseBlocked && styles.modalRowNeedsLicense]}
                          onPress={() => void toggleCategory(cat.id)}
                        >
                          <Ionicons
                            name={iconName}
                            size={18}
                            color={selected ? colors.primary : colors.textSecondary}
                          />
                          <View style={styles.modalRowLabelCol}>
                            <Text style={[styles.modalRowText, selected && styles.modalRowTextOn]}>
                              {cat.label}
                            </Text>
                            {licenseBlocked ? (
                              <Text style={styles.modalRowHint}>Add license under Trade licenses</Text>
                            ) : null}
                          </View>
                          <Ionicons
                            name={
                              licenseBlocked
                                ? "lock-closed-outline"
                                : selected
                                  ? "checkbox-outline"
                                  : "square-outline"
                            }
                            size={22}
                            color={
                              licenseBlocked
                                ? colors.textSecondary
                                : selected
                                  ? colors.primary
                                  : colors.textSecondary
                            }
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        ) : null}

        {!approved ? (
          <DashCard>
            <Pressable style={styles.helpRow} onPress={() => router.push(routes.proRequirements)}>
              <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.helpRowText}>Help & requirements</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </DashCard>
        ) : null}

        <Pressable style={styles.backCustomer} onPress={() => router.replace(routes.home)}>
          <Text style={styles.backCustomerText}>Customer home</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSoft },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  loadingText: { color: colors.textSecondary },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.button,
  },
  retryBtnText: { color: colors.background, fontWeight: "600", fontSize: 15 },
  scrollBody: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  dashCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginLeft: spacing.xs,
    marginBottom: -spacing.sm,
  },
  overviewTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  overviewIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  overviewText: { flex: 1, minWidth: 0 },
  overviewTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.button,
    backgroundColor: "#FFF1F2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FFE4E6",
  },
  settingsBtnText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillOn: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  pillOff: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  dotOn: { backgroundColor: "#16A34A" },
  pillLabel: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
  pillMeta: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  actionStack: {
    gap: 9,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  actionButtonIconPrimary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  actionButtonText: { flex: 1, minWidth: 0 },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionButtonMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  actionButtonTitlePrimary: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.background,
    letterSpacing: -0.2,
  },
  actionButtonMetaPrimary: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.82)",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  controlLabel: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  switchCompact: {
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm },
  tradeLicensesLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  tradeLicensesLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "flex-start",
    minHeight: 118,
    ...shadows.card,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  actionTileTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionTileMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.button,
  },
  previewBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  bannerInner: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  bannerTextCol: { flex: 1, gap: spacing.xs },
  bannerTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  bannerMeta: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  bannerLink: { marginTop: spacing.xs },
  bannerLinkText: { fontWeight: "600", color: colors.primary, fontSize: 14 },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  helpRowText: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  modalSheet: {
    width: "100%",
    maxHeight: "72%",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  settingsSheet: {
    width: "100%",
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  modalDone: { fontSize: 15, fontWeight: "600", color: colors.primary },
  settingsBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  settingsStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  settingsStatusText: { flex: 1, minWidth: 0 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  settingsRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },
  settingsRowText: { flex: 1, minWidth: 0 },
  settingsRowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  settingsRowMeta: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  modalScroll: { maxHeight: 400 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalRowLabelCol: { flex: 1, gap: 2 },
  modalRowText: { fontSize: 16, fontWeight: "400", color: colors.textPrimary },
  modalRowTextOn: { fontWeight: "600" },
  modalRowHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  modalRowNeedsLicense: { opacity: 0.85 },
  backCustomer: { paddingVertical: spacing.lg, alignItems: "center" },
  backCustomerText: { fontWeight: "500", fontSize: 15, color: colors.textSecondary },
});
