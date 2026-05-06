import Ionicons from "@expo/vector-icons/Ionicons";
import { Video, ResizeMode } from "expo-av";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PortfolioMediaItem } from "../types/serviceListing";
import { colors, radii, spacing } from "@/theme/tokens";

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

type Props = {
  item: PortfolioMediaItem;
  cellStyle: { width: number; marginBottom: number };
  /**
   * When set, the tile uses a poster + play control and opens fullscreen video on press
   * (avoids inline `expo-av` touch issues in scroll views).
   */
  onVideoOpen?: () => void;
};

/**
 * Square thumbnail for one portfolio image or video (customer gallery / album).
 */
export function PortfolioMediaThumb({ item, cellStyle, onVideoOpen }: Props) {
  if (item.type === "image") {
    return (
      <View style={[styles.cell, cellStyle]}>
        <Image
          source={{ uri: item.url }}
          style={styles.thumb}
          contentFit="cover"
        />
      </View>
    );
  }

  const durationLabel =
    item.durationSec != null && Number.isFinite(item.durationSec)
      ? formatDuration(item.durationSec)
      : null;

  if (onVideoOpen) {
    return (
      <Pressable
        onPress={onVideoOpen}
        style={[styles.cell, cellStyle, styles.videoCell]}
        accessibilityRole="button"
        accessibilityLabel="Play video"
      >
        <Image
          source={{ uri: item.posterUrl ?? item.url }}
          style={styles.thumb}
          contentFit="cover"
        />
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons
            name="play-circle"
            size={52}
            color="rgba(255,255,255,0.95)"
          />
        </View>
        {durationLabel ? (
          <View style={styles.durationBadge} pointerEvents="none">
            <Text style={styles.durationText}>{durationLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={[styles.cell, cellStyle, styles.videoCell]}>
      <Video
        style={styles.thumb}
        source={{ uri: item.url }}
        useNativeControls
        resizeMode={ResizeMode.COVER}
        usePoster={Boolean(item.posterUrl)}
        posterSource={item.posterUrl ? { uri: item.posterUrl } : undefined}
        isLooping={false}
      />
      {durationLabel ? (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{durationLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  videoCell: {
    backgroundColor: "#000",
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    minHeight: 120,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  durationBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  durationText: {
    color: "#fff",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
