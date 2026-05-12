import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "@/theme/fonts";
import { colors, spacing } from "@/theme/tokens";

const COLLAPSED_LINES = 5;
/** ~chars visible in 5 lines on a typical phone column — toggles “More” when content likely overflows */
const MIN_CHARS_FOR_TOGGLE = 180;

type Props = {
  body: string;
};

/**
 * Long freelancer-written bio: collapsed to ~5 lines with “More” / “Less” (Fiverr-style).
 */
export function CollapsibleBio({ body }: Props) {
  const [expanded, setExpanded] = useState(false);

  const needsToggle = useMemo(
    () => body.trim().length >= MIN_CHARS_FOR_TOGGLE,
    [body],
  );

  return (
    <View style={styles.wrap}>
      <Text
        style={styles.bioText}
        numberOfLines={expanded || !needsToggle ? undefined : COLLAPSED_LINES}
      >
        {body}
      </Text>
      {needsToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Show less bio" : "Show full bio"}
          hitSlop={8}
          onPress={() => setExpanded((v) => !v)}
          style={styles.moreHit}
        >
          <Text style={styles.more}>{expanded ? "Less" : "More"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  bioText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  moreHit: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
  more: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
