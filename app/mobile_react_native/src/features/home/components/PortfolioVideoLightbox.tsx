import Ionicons from "@expo/vector-icons/Ionicons";
import type { AVPlaybackStatus } from "expo-av";
import { Audio, ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  videoUri: string | null;
  posterUri?: string | null;
  onClose: () => void;
};

const CLOSE_INSET = 8;

/**
 * Full-screen video with native controls.
 * Uses poster + explicit play after load so Expo Go / Android Modal + Surface behave reliably.
 */
export function PortfolioVideoLightbox({
  visible,
  videoUri,
  posterUri,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  /** Spinner until first frame / ready — avoids “black hole” while buffering. */
  const [working, setWorking] = useState(true);

  useEffect(() => {
    if (!visible) return;
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
  }, [visible]);

  useEffect(() => {
    if (visible && videoUri) {
      setPlaybackError(null);
      setWorking(true);
    }
  }, [visible, videoUri]);

  const handleLoad = useCallback((_status: AVPlaybackStatus) => {
    setPlaybackError(null);
    const v = videoRef.current;
    if (!v) return;
    void v
      .playAsync()
      .then(() => setWorking(false))
      .catch(() => setWorking(false));
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setPlaybackError(status.error);
        setWorking(false);
      }
      return;
    }
    if (status.isPlaying || status.positionMillis > 0) {
      setWorking(false);
    }
  }, []);

  const onReadyForDisplay = useCallback(() => {
    setWorking(false);
  }, []);

  const onError = useCallback((msg: string) => {
    setPlaybackError(msg);
    setWorking(false);
  }, []);

  useEffect(() => {
    if (visible) return;
    const v = videoRef.current;
    if (!v) return;
    void (async () => {
      try {
        await v.pauseAsync();
        await v.setPositionAsync(0);
      } catch {
        /* ignore */
      }
    })();
  }, [visible]);

  if (!videoUri) {
    return null;
  }

  const titleBar = insets.top + 52;
  const bottomPad = insets.bottom + 16;
  const maxVideoH = Math.max(220, screenH - titleBar - bottomPad);

  const videoWrapStyle = [
    styles.videoSurfaceWrap,
    { width: screenW, height: maxVideoH },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      {...(Platform.OS === "ios"
        ? { presentationStyle: "fullScreen" as const }
        : {})}
      transparent={Platform.OS === "web"}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.root}>
          <View
            style={[
              styles.videoColumn,
              {
                paddingTop: titleBar,
                paddingBottom: bottomPad,
                width: screenW,
                minHeight: maxVideoH,
              },
            ]}
          >
            {playbackError ? (
              <View style={[videoWrapStyle, styles.errorBox]}>
                <Text style={styles.errorText}>{playbackError}</Text>
                <Text style={styles.errorHint}>
                  Check network access in Expo Go, or try another clip.
                </Text>
              </View>
            ) : (
              <View
                collapsable={false}
                {...(Platform.OS === "android"
                  ? { renderToHardwareTextureAndroid: true }
                  : {})}
                style={videoWrapStyle}
              >
                <Video
                  key={videoUri}
                  ref={videoRef}
                  style={{
                    width: screenW,
                    height: maxVideoH,
                    backgroundColor: "#000",
                  }}
                  source={{ uri: videoUri }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={visible && !playbackError}
                  isLooping={false}
                  isMuted={false}
                  volume={1}
                  usePoster={Boolean(posterUri)}
                  posterSource={
                    posterUri ? { uri: posterUri } : undefined
                  }
                  posterStyle={styles.posterFill}
                  onLoad={handleLoad}
                  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                  onReadyForDisplay={onReadyForDisplay}
                  onError={onError}
                />
                {working ? (
                  <View
                    style={styles.spinnerOverlay}
                    pointerEvents="none"
                  >
                    <ActivityIndicator size="large" color="#ffffff" />
                  </View>
                ) : null}
              </View>
            )}
          </View>
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
    backgroundColor: "#000",
  },
  videoColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoSurfaceWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  posterFill: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  errorBox: {
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  errorHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    textAlign: "center",
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
    zIndex: 10,
  },
});
