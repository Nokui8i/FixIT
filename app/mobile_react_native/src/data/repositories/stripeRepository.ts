import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/shared/firebase/client";

type ConnectOnboardingResponse = {
  accountId: string;
  url: string;
  expiresAt?: number;
};

export type VerifyStripeConnectAccountResult = {
  ok: boolean;
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
};

export async function createStripeConnectOnboardingLink(input?: {
  refreshUrl?: string;
  returnUrl?: string;
}): Promise<ConnectOnboardingResponse> {
  const fn = httpsCallable<
    { refreshUrl?: string; returnUrl?: string },
    ConnectOnboardingResponse
  >(getFirebaseFunctions(), "createStripeConnectOnboardingLink");
  const res = await fn({
    refreshUrl: input?.refreshUrl,
    returnUrl: input?.returnUrl,
  });
  return res.data;
}

export async function verifyStripeConnectAccount(stripeAccountId: string): Promise<VerifyStripeConnectAccountResult> {
  const trimmed = stripeAccountId.trim();
  const fn = httpsCallable<{ stripeAccountId: string }, VerifyStripeConnectAccountResult>(
    getFirebaseFunctions(),
    "verifyStripeConnectAccount",
  );
  const res = await fn({ stripeAccountId: trimmed });
  return res.data;
}
