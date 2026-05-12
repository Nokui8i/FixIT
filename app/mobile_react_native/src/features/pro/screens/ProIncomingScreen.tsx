import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { EmptyState } from "@/shared/components/EmptyState";
import { colors, radii, spacing } from "@/theme/tokens";
import {
  loadIncomingRequestsForMyPro,
  loadMyProProfile,
  type IncomingRequestRow,
  type MyProProfile,
} from "@/data/repositories/proProfileRepository";
import { loadMyUserProfile } from "@/data/repositories/userRepository";
import { hasOwnerBypass } from "@/shared/domain/userRoles";

/**
 * List of open requests for the pro's selected categories.
 */
export function ProIncomingScreen() {
  const [rows, setRows] = useState<IncomingRequestRow[]>([]);
  const [gate, setGate] = useState<Pick<MyProProfile, "verificationStatus" | "categoryIds"> | null>(
    null,
  );
  const [ownerAccess, setOwnerAccess] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [profile, userProfile] = await Promise.all([
        loadMyProProfile(),
        loadMyUserProfile(),
      ]);
      const canBypass = hasOwnerBypass(userProfile.role);
      const next = await loadIncomingRequestsForMyPro({
        bypassVerification: canBypass,
      });
      if (!alive) return;
      setOwnerAccess(canBypass);
      setGate({
        verificationStatus: profile.verificationStatus,
        categoryIds: profile.categoryIds,
      });
      setRows(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const verified = ownerAccess || gate?.verificationStatus === "approved";
  const emptyDescription = !verified
    ? "Incoming leads unlock after FixIT approves your application."
    : gate && gate.categoryIds.length === 0
      ? "Add categories on your Pro dashboard to see matching open requests."
      : "No open requests in your categories right now.";

  return (
    <View style={styles.root}>
      <ScreenHeader title="Incoming" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.body}
        ListHeaderComponent={
          gate && !verified ? (
            <View style={styles.gateBanner}>
              <Text style={styles.gateTitle}>Verification required</Text>
              <Text style={styles.gateText}>
                {gate.verificationStatus === "rejected"
                  ? "Your application was not approved. Update documents and resubmit from Apply as provider."
                  : "Complete onboarding and wait for approval to receive incoming jobs."}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState title="No incoming requests" description={emptyDescription} />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.urgency}>{item.urgency === "urgent" ? "Urgent" : "Standard"}</Text>
            </View>
            <Text style={styles.details} numberOfLines={3}>
              {item.details}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  gateBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  gateTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  gateText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  urgency: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  details: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
