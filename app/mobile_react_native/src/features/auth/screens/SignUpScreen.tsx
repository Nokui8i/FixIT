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

import { signUpWithEmail } from "@/data/repositories/authRepository";
import { AuthMovingMosaic } from "@/features/auth/components/AuthMovingMosaic";
import { routes } from "@/navigation/routes";
import { colors, radii, spacing } from "@/theme/tokens";

export function SignUpScreen() {
  const { height } = useWindowDimensions();
  const halfScreen = Math.round(height * 0.5);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function formatUsLocalPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function toUsE164(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    const normalized =
      digits.length === 11 && digits.startsWith("1")
        ? digits.slice(1)
        : digits;
    if (normalized.length !== 10) return "";
    return `+1${normalized}`;
  }

  const onSignUp = async () => {
    const normalizedPhone = toUsE164(phone);
    if (!displayName.trim() || !email.trim() || !normalizedPhone || !password) {
      Alert.alert("Missing fields", "Fill name, email, phone, and password.");
      return;
    }
    if (!normalizedPhone) {
      Alert.alert("Invalid phone", "Enter a valid phone number.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await signUpWithEmail({
        displayName,
        email,
        phone: normalizedPhone,
        password,
        country: "United States",
      });
      router.replace(routes.home);
    } catch (e: unknown) {
      Alert.alert(
        "Sign up failed",
        e instanceof Error ? e.message : "Could not create account.",
      );
    } finally {
      setSubmitting(false);
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
            <Text style={styles.title}>Create your account</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={displayName}
              onChangeText={setDisplayName}
            />
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
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+1</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(v) => setPhone(formatUsLocalPhone(v))}
                onBlur={() => setPhone((prev) => formatUsLocalPhone(prev))}
              />
            </View>
            <Text style={styles.phoneHint}>US number format is applied automatically.</Text>
            <View style={styles.input} accessibilityRole="text">
              <Text style={styles.countryValue}>United States</Text>
              <Text style={styles.countryHint}>Region (fixed for current launch)</Text>
            </View>
            <Pressable
              style={[styles.primary, submitting && styles.primaryDisabled]}
              disabled={submitting}
              onPress={() => void onSignUp()}
            >
              <Text style={styles.primaryText}>{submitting ? "…" : "Create account"}</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/auth/sign-in")} hitSlop={10}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
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
  phoneRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  prefixBox: {
    minHeight: 52,
    minWidth: 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  prefixText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  phoneHint: {
    marginTop: -6,
    fontSize: 12,
    color: colors.textSecondary,
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
  link: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  countryValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  countryHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
