import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { CategoryFreelancerSortKey } from "../utils/categoryListingSort";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

/** Third chip: sort by jobs completed on the platform (must stay in sync with product copy). */
const LABEL_SORT_JOBS_DONE = "Jobs Done";

export const BROWSE_SORT_OPTIONS: {
  key: CategoryFreelancerSortKey;
  label: string;
}[] = [
  { key: "recommended", label: "Best match" },
  { key: "rating", label: "Rating" },
  { key: "jobs_done", label: LABEL_SORT_JOBS_DONE },
];

type Props = {
  sortKey: CategoryFreelancerSortKey;
  onSortKeyChange: (key: CategoryFreelancerSortKey) => void;
};

/**
 * Horizontal sort/filter chips — same control on category browse and home “See all” lists.
 */
export function SortChipsRow({ sortKey, onSortKeyChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {BROWSE_SORT_OPTIONS.map((opt) => {
        const on = sortKey === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onSortKeyChange(opt.key)}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: WOLT_PAGE_PADDING,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  chipTextOn: {
    color: colors.background,
  },
});
