import { getFirebaseAuth } from "./client";

/**
 * Anonymous auth until email/phone flows exist. Enable in Console:
 * Authentication → Sign-in method → Anonymous.
 */
export async function ensureCustomerFirebaseSession(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return;
  }
  throw new Error("You must sign in first.");
}
