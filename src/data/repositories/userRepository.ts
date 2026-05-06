import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseFunctions, getFirebaseStorage } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

export type UserProfileDoc = {
  displayName: string;
  email: string;
  pendingEmailChangeTo: string | null;
  pendingEmailChangeRequestedAt: string | null;
  phone: string;
  phoneVerifiedAt: string | null;
  country: string;
  addressLine: string;
  addressPlaceId: string | null;
  avatarUri: string | null;
  marketingEmailsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  expoPushToken?: string | null;
  pushTokenUpdatedAt?: string | null;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  termsVersion: string;
  privacyVersion: string;
  deletionRequestedAt: string | null;
  role: "customer" | "pro" | "admin";
};

export type UserProfilePatch = Partial<UserProfileDoc>;

const DEFAULT_USER_PROFILE: UserProfileDoc = {
  displayName: "FixIT User",
  email: "",
  pendingEmailChangeTo: null,
  pendingEmailChangeRequestedAt: null,
  phone: "",
  phoneVerifiedAt: null,
  country: "United States",
  addressLine: "",
  addressPlaceId: null,
  avatarUri: null,
  marketingEmailsEnabled: false,
  pushNotificationsEnabled: true,
  expoPushToken: null,
  pushTokenUpdatedAt: null,
  termsAcceptedAt: null,
  privacyAcceptedAt: null,
  termsVersion: "v1",
  privacyVersion: "v1",
  deletionRequestedAt: null,
  role: "customer",
};

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

function toUserProfile(data: unknown, fallbackEmail: string): UserProfileDoc {
  const d = (typeof data === "object" && data !== null ? data : {}) as Partial<UserProfileDoc>;
  return {
    displayName:
      typeof d.displayName === "string" && d.displayName.trim().length > 0
        ? d.displayName.trim()
        : DEFAULT_USER_PROFILE.displayName,
    email:
      typeof d.email === "string" && d.email.trim().length > 0
        ? d.email.trim()
        : fallbackEmail,
    pendingEmailChangeTo:
      typeof d.pendingEmailChangeTo === "string" && d.pendingEmailChangeTo.trim().length > 0
        ? d.pendingEmailChangeTo.trim()
        : null,
    pendingEmailChangeRequestedAt:
      typeof d.pendingEmailChangeRequestedAt === "string"
        ? d.pendingEmailChangeRequestedAt
        : null,
    phone: typeof d.phone === "string" ? d.phone : "",
    phoneVerifiedAt:
      typeof d.phoneVerifiedAt === "string" ? d.phoneVerifiedAt : null,
    country:
      typeof d.country === "string" &&
      d.country.trim().length > 0 &&
      !looksLikeEmail(d.country.trim())
        ? d.country.trim()
        : DEFAULT_USER_PROFILE.country,
    addressLine: typeof d.addressLine === "string" ? d.addressLine : "",
    addressPlaceId:
      typeof d.addressPlaceId === "string" && d.addressPlaceId.trim().length > 0
        ? d.addressPlaceId.trim()
        : null,
    avatarUri: typeof d.avatarUri === "string" ? d.avatarUri : null,
    marketingEmailsEnabled:
      typeof d.marketingEmailsEnabled === "boolean"
        ? d.marketingEmailsEnabled
        : DEFAULT_USER_PROFILE.marketingEmailsEnabled,
    pushNotificationsEnabled:
      typeof d.pushNotificationsEnabled === "boolean"
        ? d.pushNotificationsEnabled
        : DEFAULT_USER_PROFILE.pushNotificationsEnabled,
    expoPushToken:
      typeof d.expoPushToken === "string" && d.expoPushToken.trim().length > 0
        ? d.expoPushToken.trim()
        : null,
    pushTokenUpdatedAt:
      typeof d.pushTokenUpdatedAt === "string" ? d.pushTokenUpdatedAt : null,
    termsAcceptedAt: typeof d.termsAcceptedAt === "string" ? d.termsAcceptedAt : null,
    privacyAcceptedAt: typeof d.privacyAcceptedAt === "string" ? d.privacyAcceptedAt : null,
    termsVersion:
      typeof d.termsVersion === "string" && d.termsVersion.trim().length > 0
        ? d.termsVersion.trim()
        : DEFAULT_USER_PROFILE.termsVersion,
    privacyVersion:
      typeof d.privacyVersion === "string" && d.privacyVersion.trim().length > 0
        ? d.privacyVersion.trim()
        : DEFAULT_USER_PROFILE.privacyVersion,
    deletionRequestedAt: typeof d.deletionRequestedAt === "string" ? d.deletionRequestedAt : null,
    role:
      d.role === "customer" || d.role === "pro" || d.role === "admin"
        ? d.role
        : DEFAULT_USER_PROFILE.role,
  };
}

async function ensureSignedInUser() {
  await ensureCustomerFirebaseSession();
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No Firebase user session.");
  }
  return user;
}

export async function ensureUserProfileDoc(): Promise<UserProfileDoc> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const base = {
      ...DEFAULT_USER_PROFILE,
      displayName:
        user.displayName?.trim() || user.email?.split("@")[0] || DEFAULT_USER_PROFILE.displayName,
      email: user.email ?? "",
      role: "customer" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, base);
    return toUserProfile(base, user.email ?? "");
  }

  const profile = toUserProfile(snap.data(), user.email ?? "");
  const authEmail = user.email?.trim() ?? "";

  // Keep Firestore profile email synced with Firebase Auth email after verified updates.
  const patch: Record<string, unknown> = {};
  if (authEmail && profile.email !== authEmail) {
    patch.email = authEmail;
  }
  // Clean up previously corrupted values where country was accidentally set to an email.
  if (looksLikeEmail(profile.country)) {
    patch.country = DEFAULT_USER_PROFILE.country;
  }
  // Once new auth email is active, clear pending marker.
  if (
    profile.pendingEmailChangeTo &&
    authEmail &&
    profile.pendingEmailChangeTo.toLowerCase() === authEmail.toLowerCase()
  ) {
    patch.pendingEmailChangeTo = null;
    patch.pendingEmailChangeRequestedAt = null;
  }
  if (Object.keys(patch).length > 0) {
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
    return {
      ...profile,
      email: typeof patch.email === "string" ? patch.email : profile.email,
      pendingEmailChangeTo:
        patch.pendingEmailChangeTo === null
          ? null
          : profile.pendingEmailChangeTo,
      pendingEmailChangeRequestedAt:
        patch.pendingEmailChangeRequestedAt === null
          ? null
          : profile.pendingEmailChangeRequestedAt,
      country:
        typeof patch.country === "string" ? patch.country : profile.country,
    };
  }

  return profile;
}

export async function loadMyUserProfile(): Promise<UserProfileDoc> {
  return ensureUserProfileDoc();
}

export async function updateMyUserProfile(patch: UserProfilePatch): Promise<void> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function uploadMyAvatarFromUri(imageUri: string): Promise<string> {
  const user = await ensureSignedInUser();
  const storage = getFirebaseStorage();
  const db = getFirebaseFirestore();
  const profileRef = doc(db, "users", user.uid);

  const response = await fetch(imageUri);
  const blob = await response.blob();
  const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const objectRef = ref(storage, `users/${user.uid}/avatar-${Date.now()}.${ext}`);
  await uploadBytes(objectRef, blob, { contentType: blob.type || "image/jpeg" });
  const downloadUrl = await getDownloadURL(objectRef);

  await updateDoc(profileRef, {
    avatarUri: downloadUrl,
    updatedAt: serverTimestamp(),
  });
  void cleanupOldAvatarObjects(user.uid, objectRef.fullPath);
  return downloadUrl;
}

async function cleanupOldAvatarObjects(uid: string, keepFullPath?: string): Promise<void> {
  const storage = getFirebaseStorage();
  const folderRef = ref(storage, `users/${uid}/`);
  try {
    const listed = await listAll(folderRef);
    const stale = listed.items.filter(
      (item) => item.name.startsWith("avatar-") && item.fullPath !== keepFullPath,
    );
    await Promise.all(stale.map((item) => deleteObject(item).catch(() => {})));
  } catch {
    // Best-effort cleanup only.
  }
}

export async function removeMyAvatar(): Promise<void> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const profileRef = doc(db, "users", user.uid);
  await updateDoc(profileRef, {
    avatarUri: null,
    updatedAt: serverTimestamp(),
  });
  await cleanupOldAvatarObjects(user.uid);
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.signOut();
}

export async function saveMyPushToken(token: string): Promise<void> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    expoPushToken: token.trim(),
    pushTokenUpdatedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function sendMyTestPush(): Promise<void> {
  await ensureSignedInUser();
  const fn = httpsCallable<unknown, { ok: boolean; detail?: string }>(
    getFirebaseFunctions(),
    "sendMyTestPush",
  );
  await fn({});
}

export async function requestMyAccountDeletion(): Promise<void> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    deletionRequestedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMyAccount(input: {
  password: string;
  confirmText: string;
}): Promise<"deleted" | "requires_recent_login"> {
  const auth = getFirebaseAuth();
  const user = await ensureSignedInUser();
  const email = user.email?.trim() ?? "";
  if (!email || !input.password.trim()) {
    return "requires_recent_login";
  }

  try {
    const cred = EmailAuthProvider.credential(email, input.password.trim());
    await reauthenticateWithCredential(user, cred);
  } catch {
    return "requires_recent_login";
  }

  const fn = httpsCallable<
    { confirmText: string },
    { ok: boolean }
  >(getFirebaseFunctions(), "deleteMyAccountSecure");
  await fn({ confirmText: input.confirmText });
  await auth.signOut();
  return "deleted";
}

export async function acceptMyLatestLegalDocs(
  termsVersion = "v1",
  privacyVersion = "v1",
): Promise<void> {
  const user = await ensureSignedInUser();
  const db = getFirebaseFirestore();
  const ref = doc(db, "users", user.uid);
  const acceptedAt = new Date().toISOString();
  await updateDoc(ref, {
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
    termsVersion,
    privacyVersion,
    updatedAt: serverTimestamp(),
  });
}
