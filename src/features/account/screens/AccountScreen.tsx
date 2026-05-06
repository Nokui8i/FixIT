/**
 * Profile / account hub — layout adapted from the profile tab in
 * https://github.com/cubancodepath/wolt-react-native (ScrollView sections, separators,
 * favorites card illustration, quick links, sign-out). Copy and labels for FixIT.
 * (services marketplace). Educational reference; design rights remain with original apps.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

export function AccountScreen() {
  const { profile, signOut, uploadAvatar, clearAvatar } = useLocalAccountProfile();
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [ratingAverage, setRatingAverage] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);

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
