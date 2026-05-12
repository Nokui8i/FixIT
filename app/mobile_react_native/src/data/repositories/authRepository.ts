import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithCredential,
  updateProfile,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { NativeModules } from "react-native";

import { getFirebaseAuth } from "@/shared/firebase/client";
import { getGoogleOAuthConfig } from "@/shared/firebase/config";
import { ensureUserProfileDoc, updateMyUserProfile } from "@/data/repositories/userRepository";

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<void> {
  const auth = getFirebaseAuth();
  await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
  await ensureUserProfileDoc();
}

export async function signInWithGoogleToken(input: {
  idToken?: string;
  accessToken?: string;
}): Promise<void> {
  if (!input.idToken && !input.accessToken) {
    throw new Error("Google did not return a usable sign-in token.");
  }
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(
    input.idToken,
    input.accessToken,
  );
  await signInWithCredential(auth, credential);
  await ensureUserProfileDoc();
}

async function loadNativeGoogleSignIn() {
  if (!NativeModules.RNGoogleSignin) {
    throw new Error(
      "Google sign-in needs a fresh development build installed on this phone. The current app was built before the Google native module was added.",
    );
  }
  try {
    const mod = require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
    return mod.GoogleSignin;
  } catch {
    throw new Error(
      "Google sign-in was added to the app, but this installed development build does not include the native module yet. Rebuild and reinstall the development app, then try again.",
    );
  }
}

export async function signInWithGoogle(): Promise<void> {
  const googleOAuth = getGoogleOAuthConfig();
  if (!googleOAuth?.webClientId) {
    throw new Error("Google sign-in is missing the web client ID.");
  }

  const GoogleSignin = await loadNativeGoogleSignIn();
  GoogleSignin.configure({
    webClientId: googleOAuth.webClientId,
    iosClientId: googleOAuth.iosClientId,
    scopes: ["profile", "email"],
    offlineAccess: false,
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== "success") return;

  const idToken = result.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
  await signInWithGoogleToken({ idToken });
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  country: string;
}): Promise<void> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );
  const name = input.displayName.trim();
  if (name.length > 0) {
    await updateProfile(cred.user, { displayName: name });
  }
  await ensureUserProfileDoc();
  await updateMyUserProfile({
    phone: input.phone.trim(),
    // MVP: treat required signup phone as verified. Replace with real OTP verification next.
    phoneVerifiedAt: new Date().toISOString(),
    country: input.country.trim() || "United States",
  });
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeMyEmailWithPassword(input: {
  newEmail: string;
  password: string;
}): Promise<"verification_sent"> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  if (!user.email) throw new Error("Current user has no email to re-authenticate.");
  if (!input.newEmail.trim()) throw new Error("New email is required.");
  if (!input.password) throw new Error("Password is required to change email.");

  const cred = EmailAuthProvider.credential(user.email, input.password);
  await reauthenticateWithCredential(user, cred);

  // Firebase may require verified-email change flow; this sends a verification link
  // to the new address and applies the change only after the link is confirmed.
  await verifyBeforeUpdateEmail(user, input.newEmail.trim());
  await updateMyUserProfile({
    pendingEmailChangeTo: input.newEmail.trim(),
    pendingEmailChangeRequestedAt: new Date().toISOString(),
  });
  return "verification_sent";
}

