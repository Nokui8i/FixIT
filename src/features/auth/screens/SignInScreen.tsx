import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  sendPasswordReset,
  signInWithEmail,
} from "@/data/repositories/authRepository";
import { AuthMovingMosaic } from "@/features/auth/components/AuthMovingMosaic";
import { routes } from "@/navigation/routes";
import { colors, radii, spacing } from "@/theme/tokens";

export function SignInScreen() {
  const { height } = useWindowDimensions();
  const halfScreen = Math.round(height * 0.5);
  const [mode, setMode] = useState<"options" | "email">("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail({ email, password });
      router.replace(routes.home);
    } catch (e: unknown) {
      Alert.alert(
        "Sign in failed",
        e instanceof Error ? e.message : "Could not sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter your email first.");
      return;
    }
    try {
      await sendPasswordReset(email);
      Alert.alert("Reset email sent", "Check your inbox/spam for password reset.");
    } catch (e: unknown) {
      Alert.alert(
        "Cannot send reset",
        e instanceof Error ? e.message : "Failed to send reset email.",
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={Keyboard.dismiss}
          onTouchStart={Keyboard.dismiss}
          bounces={false}
          alwaysBounceVertical={false}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { minHeight: halfScreen }]}>
            <AuthMovingMosaic />
          </View>
          <View style={[styles.sheet, { minHeight: halfScreen }]}>
            <Text style={styles.title}>Sign in or create account</Text>

            {mode === "options" ? (
              <View style={styles.stack}>
                <Pressable style={[styles.socialBtn, styles.googleBtn]}>
                  <Text style={[styles.socialText, styles.googleText]}>Continue with Google</Text>
                  <Ionicons name="logo-google" size={20} color="#fff" />
                </Pressable>
                <Pressable style={[styles.socialBtn, styles.grayBtn]} onPress={() => setMode("email")}>
                  <Text style={[styles.socialText, styles.grayText]}>Continue with Email</Text>
                  <Ionicons name="mail-outline" size={20} color="#0F766E" />
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  style={[styles.primary, submitting && styles.primaryDisabled]}
                  disabled={submitting}
                  onPress={() => void onSignIn()}
                >
                  <Text style={styles.primaryText}>{submitting ? "…" : "Sign in"}</Text>
                </Pressable>
                <Pressable onPress={() => void onReset()} hitSlop={10}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/auth/sign-up")} hitSlop={10}>
                  <Text style={styles.link}>Create account</Text>
                </Pressable>
                <Pressable onPress={() => setMode("options")} hitSlop={10}>
                  <Text style={styles.link}>Back</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },
  scrollBody: {
    flexGrow: 1,
  },
  hero: {},
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  primary: {
    backgroundColor: "#111827",
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.7 },
  primaryText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  stack: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  socialBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  socialText: {
    fontSize: 18,
    fontWeight: "700",
  },
  googleBtn: {
    backgroundColor: "#4285F4",
  },
  googleText: {
    color: "#fff",
  },
  grayBtn: {
    backgroundColor: "#E5E7EB",
  },
  grayText: {
    color: "#111827",
  },
  link: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
