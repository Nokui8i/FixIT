import Constants from "expo-constants";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type GoogleOAuthConfig = {
  webClientId: string;
  iosClientId?: string;
  androidClientId?: string;
};

function isNonEmpty(s: string | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const raw = Constants.expoConfig?.extra?.firebaseWeb as
    | Partial<FirebaseWebConfig>
    | undefined;
  if (!raw) return null;
  if (
    !isNonEmpty(raw.apiKey) ||
    !isNonEmpty(raw.authDomain) ||
    !isNonEmpty(raw.projectId) ||
    !isNonEmpty(raw.storageBucket) ||
    !isNonEmpty(raw.messagingSenderId) ||
    !isNonEmpty(raw.appId)
  ) {
    return null;
  }
  return {
    apiKey: raw.apiKey.trim(),
    authDomain: raw.authDomain.trim(),
    projectId: raw.projectId.trim(),
    storageBucket: raw.storageBucket.trim(),
    messagingSenderId: raw.messagingSenderId.trim(),
    appId: raw.appId.trim(),
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseWebConfig() !== null;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const raw = Constants.expoConfig?.extra?.googleOAuth as
    | Partial<GoogleOAuthConfig>
    | undefined;
  if (!raw) return null;
  const webClientId = raw.webClientId?.trim() ?? "";
  const iosClientId = raw.iosClientId?.trim() ?? "";
  const androidClientId = raw.androidClientId?.trim() ?? "";
  if (!webClientId && !iosClientId && !androidClientId) return null;
  return {
    webClientId,
    ...(iosClientId ? { iosClientId } : {}),
    ...(androidClientId ? { androidClientId } : {}),
  };
}
