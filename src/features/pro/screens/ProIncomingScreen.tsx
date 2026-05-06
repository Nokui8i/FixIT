import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { EmptyState } from "@/shared/components/EmptyState";
import { colors, spacing } from "@/theme/tokens";
import { loadIncomingRequestsForMyPro, type IncomingRequestRow } from "@/data/repositories/proProfileRepository";

/**
 * List of open requests for the pro's selected categories.
 */
export function ProIncomingScreen() {
  const [rows, setRows] = useState<IncomingRequestRow[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await loadIncomingRequestsForMyPro();
      if (alive) setRows(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Incoming" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.body}
        ListEmptyComponent={
          <EmptyState
            title="No incoming requests"
            description="Save your categories in Pro workspace first, then open requests in those categories will show here."
          />
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
