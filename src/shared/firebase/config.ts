import Constants from "expo-constants";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
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
