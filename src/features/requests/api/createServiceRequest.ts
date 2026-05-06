import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { isFirebaseConfigured } from "@/shared/firebase/config";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";
import { loadMyUserProfile } from "@/data/repositories/userRepository";

export type RequestUrgency = "standard" | "urgent";

export type CreateServiceRequestInput = {
  title: string;
  details: string;
  categoryId?: string;
  urgency: RequestUrgency;
  addressLine?: string;
  specialtyId?: string;
  specialtyLabel?: string;
  targetProId?: string;
};

export type CreateServiceRequestResult =
  | { status: "ok"; requestId: string }
  | { status: "error"; message: string };

/**
 * Writes `service_requests` in Firestore. Requires env config, deployed rules,
 * and Anonymous sign-in enabled until real auth ships.
 */
export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<CreateServiceRequestResult> {
  if (!isFirebaseConfigured()) {
    return {
      status: "error",
      message:
        "Firebase is not configured. Copy .env.example to .env, set EXPO_PUBLIC_FIREBASE_* from Firebase Console (FixIT project → FixIT Mobile web app), restart Expo.",
    };
  }

  try {
    await ensureCustomerFirebaseSession();
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return {
        status: "error",
        message:
          "Not signed in. In Firebase Console → Authentication → Sign-in method, enable Anonymous.",
      };
    }
    const profile = await loadMyUserProfile();
    if (!profile.phone.trim() || !profile.phoneVerifiedAt) {
      return {
        status: "error",
        message: "Add and verify your phone number in Profile before posting requests.",
      };
    }

    const db = getFirebaseFirestore();
    const docRef = await addDoc(collection(db, "service_requests"), {
      customerId: uid,
      title: input.title,
      details: input.details,
      categoryId: input.categoryId ?? null,
      urgency: input.urgency,
      addressLine: input.addressLine ?? null,
      specialtyId: input.specialtyId ?? null,
      specialtyLabel: input.specialtyLabel ?? null,
      targetProId: input.targetProId ?? null,
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { status: "ok", requestId: docRef.id };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create service request.";
    return { status: "error", message };
  }
}
