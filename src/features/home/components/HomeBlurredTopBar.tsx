import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import { colors, spacing } from "@/theme/tokens";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/** Inner height of `HomeTopBar` row (icons + padding). Safe-area top is applied by parent. */
export const HOME_TOP_BAR_INNER_HEIGHT = 48;

type Props = {
  scrollY: SharedValue<number>;
  children: React.ReactNode;
};

/**
 * Wolt-style glass header: blur strengthens as the home feed scrolls, with a soft divider fade-in.
 */
export function HomeBlurredTopBar({ scrollY, children }: Props) {
  const animatedBlurProps = useAnimatedProps(() => {
    const intensity = interpolate(
      scrollY.value,
      [0, 40, 120],
      [22, 48, 92],
      Extrapolation.CLAMP,
    );
    return { intensity };
  });

  const webFillStyle = useAnimatedStyle(() => {
    const o = interpolate(
      scrollY.value,
      [0, 80],
      [0.72, 0.94],
      Extrapolation.CLAMP,
    );
    return {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `rgba(255,248,248,${o})`,
    };
  });

  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [8, 48],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.wrap}>
      {Platform.OS === "web" ? (
        <Animated.View style={webFillStyle} />
      ) : (
        <AnimatedBlurView
          animatedProps={animatedBlurProps}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.inner}>{children}</View>
      <Animated.View style={[styles.hairline, hairlineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    minHeight: HOME_TOP_BAR_INNER_HEIGHT,
    paddingBottom: spacing.sm,
  },
  inner: {
    minHeight: HOME_TOP_BAR_INNER_HEIGHT,
    justifyContent: "center",
  },
  hairline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
