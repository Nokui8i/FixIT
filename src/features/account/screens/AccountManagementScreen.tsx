import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { useLocalAccountProfile } from "@/features/account/hooks/useLocalAccountProfile";
import { getFirebaseAuth } from "@/shared/firebase/client";
import { openFixitHelpCenter, openFixitSupportMailto } from "@/shared/fixitBrand";
import { colors, radii, spacing } from "@/theme/tokens";
import { changeMyEmailWithPassword } from "@/data/repositories/authRepository";
import { legalDocumentPath } from "@/navigation/routes";

function Chevron() {
  return <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />;
}

function SectionHeader({
  title,
  subtitle,
  first,
  expanded,
  onPress,
}: {
  title: string;
  subtitle: string;
  first?: boolean;
  expanded?: boolean;
  onPress?: () => void;
}) {
  const isCollapsible = typeof expanded === "boolean" && Boolean(onPress);
  return (
    <Pressable
      style={[styles.sectionHeader, first && styles.sectionHeaderFirst]}
      onPress={onPress}
      disabled={!isCollapsible}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {isCollapsible ? (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.chevronMuted}
          />
        ) : null}
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

/**
 * Wolt-style **account management**: personal data, receipts toggle, legal rows,
 * device-related shortcuts. Data is persisted in Firestore `users/{uid}`.
 * No decorative or profile images on this screen (text-only section headers).
 */
export function AccountManagementScreen() {
  const { profile, update, signOut, deleteAccount, sendTestPush } = useLocalAccountProfile();
  const [editMode, setEditMode] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(profile.displayName);
  const [emailDraft, setEmailDraft] = useState(profile.email);
  const [phoneDraft, setPhoneDraft] = useState(profile.phone);
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    profile: false,
    maintenance: false,
    policies: false,
    notifications: false,
    preferences: false,
  });

  useEffect(() => {
    if (!editMode) {
      setDisplayNameDraft(profile.displayName);
      setEmailDraft(profile.email);
      setPhoneDraft(profile.phone);
      setEmailChangePassword("");
    }
  }, [
    editMode,
    profile.displayName,
    profile.email,
    profile.phone,
  ]);

  const submitDeleteAccount = useCallback(() => {
    if (deleteConfirmText.trim() !== "DELETE") {
      Alert.alert("Confirmation mismatch", "Type DELETE exactly to confirm.");
      return;
    }
    if (!deletePassword.trim()) {
      Alert.alert("Password required", "Enter your current password to delete your account.");
      return;
    }
    setDeleteBusy(true);
    void (async () => {
      try {
        const result = await deleteAccount({
          password: deletePassword,
          confirmText: deleteConfirmText.trim(),
        });
        if (result === "deleted") {
          setDeleteModalOpen(false);
          setDeleteConfirmText("");
          setDeletePassword("");
          Alert.alert("Account deleted", "Your account and related data were removed.");
          router.replace("/auth/sign-in");
          return;
        }
        Alert.alert(
          "Cannot delete account",
          "Password is wrong or your login session is old. Sign in again and retry.",
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Delete account failed.";
        Alert.alert("Delete failed", message);
      } finally {
        setDeleteBusy(false);
      }
    })();
  }, [deleteAccount, deleteConfirmText, deletePassword, router]);

  const saveProfile = useCallback(() => {
    void (async () => {
      const displayName = displayNameDraft.trim();
      const email = emailDraft.trim();
      const phone = phoneDraft.trim();
      if (!displayName || !email) {
        Alert.alert("Missing info", "Name and email are required.");
        return;
      }
      const country = "United States";

      const emailChanged = email !== profile.email;
      if (emailChanged && !emailChangePassword) {
        Alert.alert("Password required", "Enter your current password to change email.");
        return;
      }

      try {
        if (emailChanged) {
          await changeMyEmailWithPassword({
            newEmail: email,
            password: emailChangePassword,
          });
          update({
            displayName,
            phone,
            country,
          });
          setEditMode(false);
          setEmailChangePassword("");
          Alert.alert(
            "Verify new email",
            "We sent a verification link to your new email. You will now be signed out. After verifying the link, sign in with your new email.",
            [
              {
                text: "OK",
                onPress: () => {
                  void (async () => {
                    await signOut();
                    router.replace("/auth/sign-in");
                  })();
                },
              },
            ],
          );
          return;
        }

        update({
          displayName,
          email,
          phone,
          country,
        });
        setEditMode(false);
        setEmailChangePassword("");
        Alert.alert("Saved", "Your account details were updated.");
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "Try again.";
        const friendly = raw.includes("auth/operation-not-allowed")
          ? "Email change is disabled in your Firebase Authentication settings. Enable email changes/verification in Firebase Console and try again."
          : raw;
        Alert.alert("Cannot save changes", friendly);
      }
    })();
  }, [
    displayNameDraft,
    emailChangePassword,
    emailDraft,
    phoneDraft,
    profile.email,
    update,
  ]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    setEmailChangePassword("");
    setDisplayNameDraft(profile.displayName);
    setEmailDraft(profile.email);
    setPhoneDraft(profile.phone);
  }, [profile.displayName, profile.email, profile.phone]);

  const openLegal = useCallback((kind: "terms" | "privacy") => {
    router.push(legalDocumentPath(kind));
  }, []);

  const openHelpCenter = useCallback(() => {
    void openFixitHelpCenter();
  }, []);

  const contactSupport = useCallback(() => {
    const auth = getFirebaseAuth();
    void openFixitSupportMailto({
      userEmail: profile.email,
      userUid: auth.currentUser?.uid,
    });
  }, [profile.email]);

  const onSendTestPush = useCallback(() => {
    void (async () => {
      try {
        await sendTestPush();
        Alert.alert("Push sent", "Test push notification was sent to this device.");
      } catch (e: unknown) {
        Alert.alert("Push failed", e instanceof Error ? e.message : "Could not send test push.");
      }
    })();
  }, [sendTestPush]);

  const toggleSection = useCallback(
    (key: keyof typeof sectionsExpanded) => {
      setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  return (
    <CustomerAppChrome>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader
          first
          title="Your profile details"
          subtitle="Edit your account identity information."
          expanded={sectionsExpanded.profile}
          onPress={() => toggleSection("profile")}
        />
        {sectionsExpanded.profile && !editMode ? (
          <View style={styles.formCard}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Name</Text>
                <Text style={styles.summaryValue}>{profile.displayName}</Text>
              </View>
              <Pressable
                style={styles.editButton}
                onPress={() => setEditMode(true)}
                hitSlop={8}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.summaryDivider} />

            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{profile.email || "—"}</Text>
            {profile.pendingEmailChangeTo ? (
              <Text style={styles.pendingEmailNote}>
                Pending verification: {profile.pendingEmailChangeTo}
              </Text>
            ) : null}

            <View style={styles.summaryDivider} />

            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{profile.phone || "Add phone"}</Text>
            <Text style={styles.pendingEmailNote}>
              {profile.phoneVerifiedAt ? "Verified" : "Not verified"}
            </Text>

            <View style={styles.summaryDivider} />

            <Text style={styles.summaryLabel}>Country / region</Text>
            <Text style={styles.summaryValue}>United States</Text>
          </View>
        ) : null}
        {sectionsExpanded.profile && editMode ? (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              value={displayNameDraft}
              onChangeText={setDisplayNameDraft}
              style={styles.input}
              placeholder="Your full name"
            />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={emailDraft}
              onChangeText={setEmailDraft}
              style={styles.input}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              style={styles.input}
              placeholder="+1 000 000 0000"
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>Country / region</Text>
            <View style={styles.inputPicker}>
              <Text style={styles.inputPickerText}>United States</Text>
            </View>

            <Text style={styles.fieldLabel}>
              Password {emailDraft.trim() !== profile.email ? "(required)" : "(optional)"}
            </Text>
            <TextInput
              value={emailChangePassword}
              onChangeText={setEmailChangePassword}
              style={styles.input}
              placeholder="Your current password"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryAction} onPress={cancelEdit}>
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryAction, styles.primaryActionCompact]} onPress={saveProfile}>
                <Text style={styles.primaryActionText}>Save changes</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <SectionHeader
          title="Account maintenance"
          subtitle="Deletion and receipt controls."
          expanded={sectionsExpanded.maintenance}
          onPress={() => toggleSection("maintenance")}
        />

        {sectionsExpanded.maintenance ? (
          <View style={styles.groupCard}>
            <Pressable style={styles.row} onPress={() => setDeleteModalOpen(true)}>
              <Text style={styles.rowLabelDanger}>Request account deletion</Text>
              <Chevron />
            </Pressable>
          </View>
        ) : null}

        <SectionHeader
          title="Policies & communication"
          subtitle="Legal information and how we contact you."
          expanded={sectionsExpanded.policies}
          onPress={() => toggleSection("policies")}
        />
        {sectionsExpanded.policies ? (
          <View style={styles.groupCard}>
            <Pressable style={styles.row} onPress={() => openLegal("terms")}>
              <Text style={styles.rowLabel}>Terms of service</Text>
              <Chevron />
            </Pressable>
            <View style={styles.groupDivider} />
            <Pressable style={styles.row} onPress={() => openLegal("privacy")}>
              <Text style={styles.rowLabel}>Privacy policy</Text>
              <Chevron />
            </Pressable>
            <View style={styles.groupDivider} />
            <Pressable style={styles.row} onPress={openHelpCenter}>
              <Text style={styles.rowLabel}>Help Center</Text>
              <Chevron />
            </Pressable>
            <View style={styles.groupDivider} />
            <Pressable style={styles.row} onPress={contactSupport}>
              <Text style={styles.rowLabel}>Contact support</Text>
              <Chevron />
            </Pressable>
          </View>
        ) : null}

        <SectionHeader
          title="Notification settings"
          subtitle="Control what type of notifications you receive."
          expanded={sectionsExpanded.notifications}
          onPress={() => toggleSection("notifications")}
        />
        {sectionsExpanded.notifications ? (
          <View style={styles.groupCard}>
            <View style={styles.toggleBlock}>
              <Text style={styles.toggleLabel}>Push notifications (messages, offers, request updates)</Text>
              <Switch
                value={profile.pushNotificationsEnabled}
                onValueChange={(v) => update({ pushNotificationsEnabled: v })}
                trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
                thumbColor="#FFFFFF"
                style={styles.smallSwitch}
              />
            </View>
            <View style={styles.groupDivider} />
            <View style={styles.toggleBlock}>
              <Text style={styles.toggleLabel}>Marketing & offers</Text>
              <Switch
                value={profile.marketingEmailsEnabled}
                onValueChange={(v) => update({ marketingEmailsEnabled: v })}
                trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
                thumbColor="#FFFFFF"
                style={styles.smallSwitch}
              />
            </View>
            <View style={styles.groupDivider} />
            <Pressable style={styles.row} onPress={onSendTestPush}>
              <Text style={styles.rowLabel}>Send test push to this phone</Text>
              <Chevron />
            </Pressable>
          </View>
        ) : null}

        <SectionHeader
          title="Preferences"
          subtitle="Display options for this launch market."
          expanded={sectionsExpanded.preferences}
          onPress={() => toggleSection("preferences")}
        />
        {sectionsExpanded.preferences ? (
          <View style={styles.groupCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Distance unit</Text>
              <Text style={styles.rowValue}>Miles (mi)</Text>
            </View>
          </View>
        ) : null}

          <View style={styles.bottomScrollSpace} />
        </ScrollView>

      </View>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account permanently</Text>
            <Text style={styles.modalBody}>
              This action is permanent. Type DELETE and enter your password to continue.
            </Text>

            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              placeholder='Type "DELETE"'
              style={styles.input}
            />
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Current password"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.actionRow}>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                  setDeletePassword("");
                }}
                disabled={deleteBusy}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryAction, styles.primaryActionCompact]}
                onPress={submitDeleteAccount}
                disabled={deleteBusy}
              >
                <Text style={styles.primaryActionText}>{deleteBusy ? "Deleting..." : "Delete account"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: { flex: 1 },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
  },
  sectionAccentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 0,
  },
  formCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  groupCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: 0,
    backgroundColor: "#FAFAFA",
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  pendingEmailNote: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  editButton: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.background,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputPickerText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  primaryAction: {
    marginTop: spacing.md,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: "flex-end",
  },
  secondaryAction: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minWidth: 116,
  },
  secondaryActionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryActionCompact: {
    marginTop: 0,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minWidth: 132,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  rowLabelDanger: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.destructive,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "55%",
  },
  rowValue: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    flexShrink: 1,
  },
  rowPlaceholder: {
    color: colors.chevronMuted,
    fontStyle: "italic",
  },
  toggleBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    paddingRight: spacing.lg,
  },
  smallSwitch: {
    transform: [{ scaleX: 0.86 }, { scaleY: 0.86 }],
  },
  rowMulti: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowMultiText: {
    flex: 1,
  },
  rowHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  linkAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  bottomScrollSpace: {
    height: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: "100%",
    borderRadius: radii.modal,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalBody: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
