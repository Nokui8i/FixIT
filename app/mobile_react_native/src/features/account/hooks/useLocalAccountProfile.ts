import { useCallback, useEffect, useState } from "react";
import type { UserPlatformRole } from "@/shared/domain/userRoles";
import {
  acceptMyLatestLegalDocs,
  deleteMyAccount,
  loadMyUserProfile,
  requestMyAccountDeletion,
  removeMyAvatar,
  sendMyTestPush,
  signOutCurrentUser,
  uploadMyAvatarFromUri,
  updateMyUserProfile,
} from "@/data/repositories/userRepository";

export type LocalAccountProfile = {
  avatarUri: string | null;
  displayName: string;
  email: string;
  pendingEmailChangeTo: string | null;
  pendingEmailChangeRequestedAt: string | null;
  phone: string;
  phoneVerifiedAt: string | null;
  country: string;
  addressLine: string;
  addressPlaceId: string | null;
  marketingEmailsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  termsVersion: string;
  privacyVersion: string;
  deletionRequestedAt: string | null;
  /** Mirrors Firestore `users.role` (normalized). */
  role: UserPlatformRole;
};

const DEFAULT_PROFILE: LocalAccountProfile = {
  avatarUri: null,
  displayName: "FixIT User",
  email: "",
  pendingEmailChangeTo: null,
  pendingEmailChangeRequestedAt: null,
  phone: "",
  phoneVerifiedAt: null,
  country: "United States",
  addressLine: "",
  addressPlaceId: null,
  marketingEmailsEnabled: false,
  pushNotificationsEnabled: true,
  termsAcceptedAt: null,
  privacyAcceptedAt: null,
  termsVersion: "v1",
  privacyVersion: "v1",
  deletionRequestedAt: null,
  role: "customer",
};

export function useLocalAccountProfile() {
  const [profile, setProfile] = useState<LocalAccountProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const remote = await loadMyUserProfile();
        if (!alive) return;
        setProfile({
          avatarUri: remote.avatarUri,
          displayName: remote.displayName,
          email: remote.email,
          pendingEmailChangeTo: remote.pendingEmailChangeTo,
          pendingEmailChangeRequestedAt: remote.pendingEmailChangeRequestedAt,
          phone: remote.phone,
          phoneVerifiedAt: remote.phoneVerifiedAt,
          country: remote.country,
          addressLine: remote.addressLine,
          addressPlaceId: remote.addressPlaceId,
          marketingEmailsEnabled: remote.marketingEmailsEnabled,
          pushNotificationsEnabled: remote.pushNotificationsEnabled,
          termsAcceptedAt: remote.termsAcceptedAt,
          privacyAcceptedAt: remote.privacyAcceptedAt,
          termsVersion: remote.termsVersion,
          privacyVersion: remote.privacyVersion,
          deletionRequestedAt: remote.deletionRequestedAt,
          role: remote.role,
        });
      } catch {
        // Keep neutral local defaults when auth provider setup is incomplete.
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const reloadProfile = useCallback(() => {
    void (async () => {
      try {
        const remote = await loadMyUserProfile();
        setProfile({
          avatarUri: remote.avatarUri,
          displayName: remote.displayName,
          email: remote.email,
          pendingEmailChangeTo: remote.pendingEmailChangeTo,
          pendingEmailChangeRequestedAt: remote.pendingEmailChangeRequestedAt,
          phone: remote.phone,
          phoneVerifiedAt: remote.phoneVerifiedAt,
          country: remote.country,
          addressLine: remote.addressLine,
          addressPlaceId: remote.addressPlaceId,
          marketingEmailsEnabled: remote.marketingEmailsEnabled,
          pushNotificationsEnabled: remote.pushNotificationsEnabled,
          termsAcceptedAt: remote.termsAcceptedAt,
          privacyAcceptedAt: remote.privacyAcceptedAt,
          termsVersion: remote.termsVersion,
          privacyVersion: remote.privacyVersion,
          deletionRequestedAt: remote.deletionRequestedAt,
          role: remote.role,
        });
      } catch {
        // Ignore incomplete auth.
      }
    })();
  }, []);

  /** Merges into current profile and persists to Firestore. */
  const update = useCallback((patch: Partial<LocalAccountProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void (async () => {
        try {
          await updateMyUserProfile({
            avatarUri: next.avatarUri,
            displayName: next.displayName,
            email: next.email,
            pendingEmailChangeTo: next.pendingEmailChangeTo,
            pendingEmailChangeRequestedAt: next.pendingEmailChangeRequestedAt,
            phone: next.phone,
            phoneVerifiedAt: next.phoneVerifiedAt,
            country: next.country,
            addressLine: next.addressLine,
            addressPlaceId: next.addressPlaceId,
            marketingEmailsEnabled: next.marketingEmailsEnabled,
            pushNotificationsEnabled: next.pushNotificationsEnabled,
          });
        } catch {
          // Ignore while auth/provider setup is incomplete.
        }
      })();
      return next;
    });
  }, []);

  const acceptLegal = useCallback(async () => {
    await acceptMyLatestLegalDocs();
    setProfile((prev) => {
      const acceptedAt = new Date().toISOString();
      return {
        ...prev,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        termsVersion: "v1",
        privacyVersion: "v1",
      };
    });
  }, []);

  const requestDeletion = useCallback(async () => {
    await requestMyAccountDeletion();
    setProfile((prev) => ({ ...prev, deletionRequestedAt: new Date().toISOString() }));
  }, []);

  const deleteAccount = useCallback(async (input: { password: string; confirmText: string }) => {
    const result = await deleteMyAccount(input);
    return result;
  }, []);

  const sendTestPush = useCallback(async () => {
    await sendMyTestPush();
  }, []);

  const uploadAvatar = useCallback(async (imageUri: string) => {
    const avatarUri = await uploadMyAvatarFromUri(imageUri);
    setProfile((prev) => ({ ...prev, avatarUri }));
    return avatarUri;
  }, []);

  const clearAvatar = useCallback(async () => {
    await removeMyAvatar();
    setProfile((prev) => ({ ...prev, avatarUri: null }));
  }, []);

  return {
    profile,
    hydrated,
    reloadProfile,
    update,
    signOut: signOutCurrentUser,
    acceptLegal,
    requestDeletion,
    deleteAccount,
    sendTestPush,
    uploadAvatar,
    clearAvatar,
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  if (parts[0]?.length) {
    return parts[0].length >= 2
      ? parts[0].slice(0, 2).toUpperCase()
      : parts[0].charAt(0).toUpperCase();
  }
  return "?";
}
