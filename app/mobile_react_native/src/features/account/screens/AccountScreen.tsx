/**
 * Profile / account hub — layout adapted from the profile tab in
 * https://github.com/cubancodepath/wolt-react-native (ScrollView sections, separators,
 * favorites card illustration, quick links, sign-out). Copy and labels for FixIT.
 * (services marketplace). Educational reference; design rights remain with original apps.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import {
  loadMyProProfile,
  proProfileRecordExists,
} from "@/data/repositories/proProfileRepository";
import { routes } from "@/navigation/routes";
import {
  initialsFromName,
  useLocalAccountProfile,
} from "@/features/account/hooks/useLocalAccountProfile";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { loadMyOpenRequestCount } from "@/data/repositories/requestsRepository";
import { loadMyCustomerRatingSummary } from "@/data/repositories/reviewsRepository";
import { getFirebaseAuth } from "@/shared/firebase/client";
import { openFixitHelpCenter, openFixitSupportMailto } from "@/shared/fixitBrand";
import { legalDocumentPath } from "@/navigation/routes";
import {
  hasOwnerBypass,
  isFreelancerPlatformRole,
  isStaffPlatformRole,
} from "@/shared/domain/userRoles";

type ProHubState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "workspace"; verification: "pending_approval" | "approved" | "rejected" };

export function AccountScreen() {
  const { profile, hydrated, reloadProfile, signOut, uploadAvatar, clearAvatar } =
    useLocalAccountProfile();
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [ratingAverage, setRatingAverage] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [proHub, setProHub] = useState<ProHubState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const count = await loadMyOpenRequestCount();
      if (alive) setOpenRequestCount(count);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadProfile();
      let alive = true;
      void (async () => {
        const auth = getFirebaseAuth();
        if (!auth.currentUser) {
          if (alive) setProHub({ kind: "none" });
          return;
        }
        if (alive) setProHub({ kind: "loading" });
        try {
          const exists = await proProfileRecordExists();
          if (!alive) return;
          if (!exists) {
            setProHub({ kind: "none" });
            return;
          }
          const pro = await loadMyProProfile();
          if (!alive) return;
          setProHub({ kind: "workspace", verification: pro.verificationStatus });
        } catch {
          if (!alive) return;
          setProHub({ kind: "none" });
        }
      })();
      return () => {
        alive = false;
      };
    }, [reloadProfile]),
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const summary = await loadMyCustomerRatingSummary();
        if (!alive) return;
        if (!summary) {
          setRatingAverage(null);
          setRatingCount(0);
          return;
        }
        setRatingAverage(summary.average);
        setRatingCount(summary.count);
      } catch {
        if (!alive) return;
        setRatingAverage(null);
        setRatingCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const firstName = profile.displayName.trim().split(/\s+/)[0] || "there";
  const avatarInitials = initialsFromName(profile.displayName);
  const hasOwnerWorkspaceAccess = hasOwnerBypass(profile.role);
  const ownerReviewLinks = [
    { label: "Home", href: routes.home },
    { label: "Search", href: routes.search },
    { label: "Post request", href: routes.requestNew },
    { label: "My requests", href: routes.myRequests },
    { label: "Messages", href: routes.messages },
    { label: "Notifications", href: routes.notifications },
    { label: "Personal info", href: routes.accountManagement },
    { label: "Pro dashboard", href: routes.proHome },
    { label: "Edit pro profile", href: routes.proProfile },
    { label: "Incoming jobs", href: routes.proIncoming },
    { label: "Provider application", href: routes.proApply },
    { label: "Pro requirements", href: routes.proRequirements },
    { label: "Trade licenses", href: routes.proTradeLicenses },
  ];

  const pickAvatarFromLibrary = useCallback(() => {
    if (avatarBusy) return;
    void (async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Allow photo access to update your profile picture.");
          return;
        }
        const pick = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.75,
        });
        if (pick.canceled || !pick.assets[0]?.uri) return;
        setAvatarBusy(true);
        await uploadAvatar(pick.assets[0].uri);
      } catch (e: unknown) {
        Alert.alert("Upload failed", e instanceof Error ? e.message : "Could not upload image.");
      } finally {
        setAvatarBusy(false);
      }
    })();
  }, [avatarBusy, uploadAvatar]);

  const takeAvatarWithCamera = useCallback(() => {
    if (avatarBusy) return;
    void (async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Allow camera access to take a profile photo.");
          return;
        }
        const shot = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.75,
        });
        if (shot.canceled || !shot.assets[0]?.uri) return;
        setAvatarBusy(true);
        await uploadAvatar(shot.assets[0].uri);
      } catch (e: unknown) {
        Alert.alert("Upload failed", e instanceof Error ? e.message : "Could not upload image.");
      } finally {
        setAvatarBusy(false);
      }
    })();
  }, [avatarBusy, uploadAvatar]);

  const onRemoveAvatar = useCallback(() => {
    if (avatarBusy || !profile.avatarUri) return;
    Alert.alert("Remove photo", "Remove your profile picture?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setAvatarBusy(true);
              await clearAvatar();
            } catch (e: unknown) {
              Alert.alert("Remove failed", e instanceof Error ? e.message : "Could not remove image.");
            } finally {
              setAvatarBusy(false);
            }
          })();
        },
      },
    ]);
  }, [avatarBusy, clearAvatar, profile.avatarUri]);

  const onPressAvatar = useCallback(() => {
    const options = [
      { text: "Take photo", onPress: takeAvatarWithCamera },
      { text: "Choose from library", onPress: pickAvatarFromLibrary },
      ...(profile.avatarUri
        ? [{ text: "Remove photo", style: "destructive" as const, onPress: onRemoveAvatar }]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];
    Alert.alert("Profile photo", "Choose what you want to do.", options);
  }, [onRemoveAvatar, pickAvatarFromLibrary, profile.avatarUri, takeAvatarWithCamera]);

  return (
    <CustomerAppChrome reserveHubTabBar>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#FFF1F2", "#FFFFFF"]}
          locations={[0, 1]}
          style={styles.headerBand}
        >
          <View style={styles.profileHeader}>
            <Pressable style={styles.avatarWrap} onPress={onPressAvatar}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name={avatarBusy ? "cloud-upload-outline" : "camera-outline"} size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <View style={styles.profileHeaderText}>
              <Text style={styles.greeting}>
                Hey,{" "}
                <Text style={styles.greetingName}>{firstName}</Text>
              </Text>
              <Text style={styles.profileEmail}>
                {profile.email || "No email linked yet"}
              </Text>
              <View style={styles.ratingChip}>
                <Text style={styles.ratingText}>
                  {ratingAverage === null
                    ? "Customer rating: No ratings yet"
                    : `Customer rating: ${ratingAverage.toFixed(1)} ★ (${ratingCount})`}
                </Text>
              </View>
              {isStaffPlatformRole(profile.role) ? (
                <View style={styles.teamChip}>
                  <Text style={styles.teamChipText}>Team · {profile.role}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Activity</Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            onPress={() => router.push(routes.myRequests)}
          >
            <Text style={styles.menuItemTitle}>My requests</Text>
            <Text style={styles.menuItemMeta}>{openRequestCount > 0 ? `${openRequestCount}` : "0"}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            onPress={() => router.push(routes.messages)}
          >
            <Text style={styles.menuItemTitle}>Messages</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
          </Pressable>
        </View>

        {hasOwnerWorkspaceAccess ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Owner review</Text>
              </View>
            </View>

            <View style={styles.groupCard}>
              {ownerReviewLinks.map((item, index) => (
                <React.Fragment key={item.href}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <Pressable
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                    onPress={() => router.push(item.href)}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.menuItemTitle}>{item.label}</Text>
                      <Text style={styles.menuItemMetaSubtitle}>
                        Open directly as owner
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            onPress={() => router.push(routes.accountManagement)}
          >
            <Text style={styles.menuItemTitle}>Personal info</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            onPress={() => router.push(routes.accountManagement)}
          >
            <Text style={styles.menuItemTitle}>Payment methods</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
          </Pressable>
          <View style={styles.separator} />
          {proHub.kind === "workspace" || hasOwnerWorkspaceAccess ? (
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => router.push(routes.proHome)}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.menuItemTitle}>
                  {profile.role === "owner"
                    ? "Freelancer workspace"
                    : proHub.kind === "workspace" && proHub.verification === "approved"
                    ? "Freelancer workspace"
                    : "Provider workspace"}
                </Text>
                <Text style={styles.menuItemMetaSubtitle}>
                  {profile.role === "owner"
                    ? "Owner development access"
                    : proHub.kind === "workspace" && proHub.verification === "approved"
                    ? "Public page, leads, visibility"
                    : proHub.kind === "workspace" && proHub.verification === "pending_approval"
                      ? "Application under review"
                      : "Update your application"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
          ) : !hydrated || proHub.kind === "loading" ? (
            <View style={[styles.menuItem, { opacity: 0.6 }]}>
              <Text style={styles.menuItemTitle}>Professional account…</Text>
            </View>
          ) : isFreelancerPlatformRole(profile.role) ? (
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => router.push(routes.proApply)}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.menuItemTitle}>Complete provider profile</Text>
                <Text style={styles.menuItemMetaSubtitle}>
                  Your account is set to freelancer — finish setup to receive leads.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => router.push(routes.proApply)}
            >
              <Text style={styles.menuItemTitle}>Apply as service provider</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
          )}
          {proHub.kind === "workspace" && proHub.verification !== "approved" && profile.role !== "owner" ? (
            <>
              <View style={styles.separator} />
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                onPress={() => router.push(routes.proApply)}
              >
                <Text style={styles.menuItemTitle}>Continue application</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>

          <View style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => void openFixitHelpCenter()}
            >
              <Text style={styles.menuItemTitle}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => {
                const auth = getFirebaseAuth();
                void openFixitSupportMailto({
                  userEmail: profile.email,
                  userUid: auth.currentUser?.uid,
                });
              }}
            >
              <Text style={styles.menuItemTitle}>Contact support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          <View style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => router.push(legalDocumentPath("terms"))}
            >
              <Text style={styles.menuItemTitle}>Terms of service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => router.push(legalDocumentPath("privacy"))}
            >
              <Text style={styles.menuItemTitle}>Privacy policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.chevronMuted} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            void signOut();
            router.replace(routes.home);
          }}
        >
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </Pressable>

      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  headerBand: {
    paddingBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    backgroundColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.woltIconWell,
  },
  avatarFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileHeaderText: {
    flex: 1,
    justifyContent: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingName: {
    color: colors.primary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ratingChip: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  teamChip: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#EEF2FF",
  },
  teamChipText: {
    fontSize: 12,
    color: "#4338CA",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  pressed: {
    opacity: 0.75,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
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
    ...shadows.card,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionAccentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingVertical: 0,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  menuItemMeta: {
    fontSize: 13,
    color: colors.chevronMuted,
    marginLeft: spacing.sm,
  },
  menuItemMetaSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  logoutButton: {
    backgroundColor: "#FFF1F2",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
