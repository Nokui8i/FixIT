import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing } from "@/theme/tokens";

type Props = {
  compact?: boolean;
};

export function BrandLogoMark({ compact = false }: Props) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <LinearGradient
        colors={["#F87171", "#DC2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, compact && styles.markCompact]}
      >
        <Ionicons
          name="construct"
          size={compact ? 13 : 16}
          color={colors.background}
        />
      </LinearGradient>
      <Text style={[styles.label, compact && styles.labelCompact]}>FixIT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowCompact: {
    gap: 5,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  markCompact: {
    width: 22,
    height: 22,
    borderRadius: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  labelCompact: {
    fontSize: 14,
  },
});
