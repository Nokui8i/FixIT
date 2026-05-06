import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect } from "react";
import {
  Image as RNImage,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
};

const CLOSE_INSET = 8;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Full-screen photo with pinch-zoom + pan when zoomed (✕ or Android back to dismiss).
 */
export function PortfolioImageLightbox({
  visible,
  imageUri,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const scale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panOriginX = useSharedValue(0);
  const panOriginY = useSharedValue(0);

  useEffect(() => {
    if (!visible || !imageUri) return;
    scale.value = 1;
    pinchStartScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [visible, imageUri]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = pinchStartScale.value * e.scale;
      scale.value = clamp(next, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE + 0.02) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      panOriginX.value = translateX.value;
      panOriginY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE + 0.01) {
        return;
      }
      translateX.value = panOriginX.value + e.translationX;
      translateY.value = panOriginY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE + 0.02) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!imageUri) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.root}>
          <GestureDetector gesture={composed}>
            <Animated.View
              style={[styles.gestureSurface, animatedWrapperStyle]}
              accessibilityLabel="Portfolio photo, pinch to zoom"
            >
              <RNImage
                source={{ uri: imageUri }}
                style={{
                  width: screenW,
                  height: screenH,
                }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          </GestureDetector>
          <Pressable
            style={[styles.closeFab, { top: insets.top + CLOSE_INSET }]}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  gestureSurface: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFab: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
