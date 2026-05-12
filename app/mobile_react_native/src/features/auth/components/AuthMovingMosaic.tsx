import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { radii, spacing } from "@/theme/tokens";

type Tile = {
  id: string;
  emoji: string;
  tint: string;
  size: number;
  iconScale?: number;
  useLogo?: boolean;
};

const COLUMN_GAP = 12;
const CARD_RADIUS = 16;
const LOOP_MS = 7000;
const HERO_SCALE = 0.82;
const FIXIT_LOGO = require("../../../../assets/branding/fixit-logo-upscaled-2048-tight-white-matte.png");

function tile(
  id: string,
  emoji: string,
  tint: string,
  size: number,
  iconScale = 1,
): Tile {
  return { id, emoji, tint, size, iconScale };
}

const LEFT_COL: Tile[] = [
  tile("l1", "🚗", "#E5E7EB", Math.round(144 * HERO_SCALE), 1.04),
  tile("l2", "🔑", "#FDE68A", Math.round(158 * HERO_SCALE), 1.07),
  tile("l3", "🚿", "#E0F2FE", Math.round(146 * HERO_SCALE), 1.04),
  tile("l4", "🪛", "#F3F4F6", Math.round(144 * HERO_SCALE), 1.02),
];

const MID_COL: Tile[] = [
  tile("m1", "🚧", "#FDE68A", Math.round(162 * HERO_SCALE), 1.08),
  { ...tile("m2", "", "#FECACA", Math.round(152 * HERO_SCALE), 1.08), useLogo: true },
  tile("m3", "🚙", "#DDD6FE", Math.round(164 * HERO_SCALE), 1.1),
  tile("m4", "⚡", "#BFDBFE", Math.round(144 * HERO_SCALE), 1.03),
];

const RIGHT_COL: Tile[] = [
  tile("r1", "🔌", "#DBEAFE", Math.round(142 * HERO_SCALE), 1.06),
  tile("r2", "🪠", "#FBCFE8", Math.round(150 * HERO_SCALE), 1.04),
  tile("r3", "🔧", "#D1FAE5", Math.round(142 * HERO_SCALE), 1.06),
  tile("r4", "🏗️", "#FDE68A", Math.round(138 * HERO_SCALE), 1.02),
];

function Column({
  items,
  width,
  direction,
  offset,
}: {
  items: Tile[];
  width: number;
  direction: 1 | -1;
  offset: Animated.AnimatedInterpolation<string | number>;
}) {
  return (
    <Animated.View
      style={[
        styles.column,
        {
          width,
          transform: [{ translateY: offset }],
        },
      ]}
    >
      {items.map((it) => (
        <View
          key={it.id}
          style={[
            styles.tile,
            it.useLogo && styles.logoTile,
            {
              height: it.size,
              backgroundColor: it.tint,
              borderRadius: CARD_RADIUS,
              transform: [{ translateY: direction === 1 ? 0 : 0 }],
            },
          ]}
        >
          {it.useLogo ? (
            <View style={styles.logoWrap}>
              <Image source={FIXIT_LOGO} style={styles.logoIcon} resizeMode="cover" />
            </View>
          ) : (
            <Text style={[styles.emoji, { transform: [{ scale: it.iconScale ?? 1 }] }]}>
              {it.emoji}
            </Text>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

export function AuthMovingMosaic() {
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: LOOP_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: LOOP_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const colW = useMemo(() => (width - spacing.lg * 2 - COLUMN_GAP * 2) / 3, [width]);

  const sideShift = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });
  const middleShift = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.columnsRow}>
        <Column items={LEFT_COL} width={colW} direction={1} offset={sideShift} />
        <Column items={MID_COL} width={colW} direction={-1} offset={middleShift} />
        <Column items={RIGHT_COL} width={colW} direction={1} offset={sideShift} />
      </View>
      <LinearGradient
        colors={["rgba(246,247,248,0)", "rgba(246,247,248,0.8)", "#FFFFFF"]}
        locations={[0, 0.62, 1]}
        style={styles.fadeBottom}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: "hidden",
    marginBottom: 0,
    backgroundColor: "#F6F7F8",
  },
  columnsRow: {
    flexDirection: "row",
    gap: COLUMN_GAP,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  column: {
    gap: COLUMN_GAP,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  logoTile: {
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(229,231,235,0.9)",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  emoji: {
    fontSize: 48,
    textShadowColor: "rgba(17,24,39,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  logoIcon: {
    width: "100%",
    height: "100%",
  },
  logoWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 136,
    borderBottomLeftRadius: radii.modal,
    borderBottomRightRadius: radii.modal,
  },
});
