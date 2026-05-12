import Constants from "expo-constants";
import { Alert, Linking } from "react-native";

export type FixitBrandConfig = {
  termsUrl: string;
  privacyUrl: string;
  refundsUrl: string;
  helpCenterUrl: string;
  supportEmail: string;
};

/** Public policy + support links from `app.config.js` / `EXPO_PUBLIC_*` env. */
export function getFixitBrandConfig(): FixitBrandConfig {
  const raw = Constants.expoConfig?.extra?.fixitBrand as Partial<FixitBrandConfig> | undefined;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    termsUrl: s(raw?.termsUrl),
    privacyUrl: s(raw?.privacyUrl),
    refundsUrl: s(raw?.refundsUrl),
    helpCenterUrl: s(raw?.helpCenterUrl),
    supportEmail: s(raw?.supportEmail),
  };
}

function isProbablyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function openFixitPolicy(
  kind: "terms" | "privacy" | "refund",
  options?: { missingTitle?: string; missingMessage?: string },
): Promise<void> {
  const cfg = getFixitBrandConfig();
  const url =
    kind === "terms"
      ? cfg.termsUrl
      : kind === "privacy"
        ? cfg.privacyUrl
        : cfg.refundsUrl;
  if (!url || !isProbablyUrl(url)) {
    Alert.alert(
      options?.missingTitle ?? "Policy link not set",
      options?.missingMessage ??
        "Add EXPO_PUBLIC_FIXIT_TERMS_URL, EXPO_PUBLIC_FIXIT_PRIVACY_URL, and EXPO_PUBLIC_FIXIT_REFUNDS_URL to your .env (see .env.example), then restart Expo.",
    );
    return;
  }
  const can = await Linking.canOpenURL(url);
  if (!can) {
    Alert.alert("Cannot open link", url);
    return;
  }
  await Linking.openURL(url);
}

export async function openFixitHelpCenter(): Promise<void> {
  const { helpCenterUrl } = getFixitBrandConfig();
  if (!helpCenterUrl || !isProbablyUrl(helpCenterUrl)) {
    Alert.alert(
      "Help Center link not set",
      "Add EXPO_PUBLIC_FIXIT_HELP_CENTER_URL to your .env (see .env.example), then restart Expo.",
    );
    return;
  }
  const can = await Linking.canOpenURL(helpCenterUrl);
  if (!can) {
    Alert.alert("Cannot open link", helpCenterUrl);
    return;
  }
  await Linking.openURL(helpCenterUrl);
}

export function buildSupportMailto(params: {
  userEmail?: string;
  userUid?: string;
}): string | null {
  const { supportEmail } = getFixitBrandConfig();
  if (!supportEmail || !supportEmail.includes("@")) {
    return null;
  }
  const subject = encodeURIComponent("FixIT — Customer support");
  const lines = [
    "Hello FixIT support,",
    "",
    "Please describe your issue below:",
    "",
    "---",
    params.userEmail ? `Account email: ${params.userEmail}` : null,
    params.userUid ? `User ID: ${params.userUid}` : null,
  ].filter(Boolean);
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

export async function openFixitSupportMailto(params: {
  userEmail?: string;
  userUid?: string;
}): Promise<void> {
  const href = buildSupportMailto(params);
  if (!href) {
    Alert.alert(
      "Support email not set",
      "Add EXPO_PUBLIC_FIXIT_SUPPORT_EMAIL to your .env (see .env.example), then restart Expo.",
    );
    return;
  }
  try {
    await Linking.openURL(href);
  } catch {
    Alert.alert(
      "Cannot open mail",
      `Copy this address in your mail app:\n${getFixitBrandConfig().supportEmail}`,
    );
  }
}
