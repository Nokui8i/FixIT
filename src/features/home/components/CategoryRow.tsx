import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../../theme/tokens";

export function CategoryRow({ categories }: { categories: string[] }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((item) => (
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    paddingLeft: spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.chip,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
