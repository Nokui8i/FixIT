import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFunctions, type Functions } from "firebase/functions";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import { getFirebaseWebConfig } from "./config";

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let storageInstance: FirebaseStorage | null = null;

function initFirebaseApp(): FirebaseApp {
  const cfg = getFirebaseWebConfig();
  if (!cfg) {
    throw new Error(
      "Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* in .env (see .env.example).",
    );
  }
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(cfg);
}

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = initFirebaseApp();
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }
  const app = getFirebaseApp();
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code?: unknown }).code)
        : "";
    if (code === "auth/already-initialized") {
      authInstance = getAuth(app);
    } else {
      throw e;
    }
  }
  return authInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}

export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp(), "us-central1");
  }
  return functionsInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}
