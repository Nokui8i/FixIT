import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { colors, spacing } from "@/theme/tokens";
import { getFixitBrandConfig } from "@/shared/fixitBrand";

export function LegalDocumentScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === "privacy" ? "privacy" : "terms";

  const { title, url } = useMemo(() => {
    const cfg = getFixitBrandConfig();
    if (kind === "privacy") return { title: "Privacy policy", url: cfg.privacyUrl };
    return { title: "Terms of service", url: cfg.termsUrl };
  }, [kind]);

  return (
    <CustomerAppChrome>
      <View style={styles.root}>
        <Text style={styles.title}>{title}</Text>
        {url ? (
          <WebView
            source={{ uri: url }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.textSecondary} />
              </View>
            )}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Policy URL is not configured yet.</Text>
          </View>
        )}
      </View>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
