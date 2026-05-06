import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { routes } from "@/navigation/routes";
import { colors, radii, spacing } from "@/theme/tokens";
import { categoryCatalog } from "@/features/home/data/categoryCatalog";
import {
  loadMyProProfile,
  saveMyProProfile,
  type MyProProfile,
} from "@/data/repositories/proProfileRepository";

/**
 * Professional home: availability and entry to incoming work.
 */
export function ProHomeScreen() {
  const [profile, setProfile] = useState<MyProProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const p = await loadMyProProfile();
      if (alive) setProfile(p);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Pro workspace" />
        <View style={styles.body}>
          <Text style={styles.lead}>Loading your pro profile…</Text>
        </View>
      </View>
    );
  }

  const toggleCategory = (id: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const has = prev.categoryIds.includes(id);
      const categoryIds = has
        ? prev.categoryIds.filter((v) => v !== id)
        : [...prev.categoryIds, id];
      return { ...prev, categoryIds };
    });
  };

  const save = async () => {
    if (!profile.title.trim()) return;
    setSaving(true);
    try {
      await saveMyProProfile(profile);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Pro workspace" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>This saves your professional card in Firestore.</Text>
        <TextInput
          style={styles.input}
          placeholder="Business / profile title"
          value={profile.title}
          onChangeText={(title) => setProfile({ ...profile, title })}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Subtitle (what you do)"
          value={profile.subtitle}
          onChangeText={(subtitle) => setProfile({ ...profile, subtitle })}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="ETA label (e.g. 15 min)"
          value={profile.eta}
          onChangeText={(eta) => setProfile({ ...profile, eta })}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Starting fee (e.g. $55)"
          value={profile.fee}
          onChangeText={(fee) => setProfile({ ...profile, fee })}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Avatar / logo URL"
          value={profile.imageUrl}
          onChangeText={(imageUrl) => setProfile({ ...profile, imageUrl })}
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Available now</Text>
          <Switch
            value={profile.isActive}
            onValueChange={(isActive) => setProfile({ ...profile, isActive })}
            trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
          />
        </View>
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.chipsWrap}>
          {categoryCatalog.map((cat) => {
            const selected = profile.categoryIds.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={styles.primary}
          onPress={() => void save()}
        >
          <Text style={styles.primaryText}>{saving ? "Saving…" : "Save profile"}</Text>
        </Pressable>
        <Pressable
          style={styles.primary}
          onPress={() => router.push(routes.proIncoming)}
        >
          <Text style={styles.primaryText}>Open incoming</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.replace(routes.home)}>
          <Text style={styles.secondaryText}>Back to customer home</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: colors.background,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  primary: {
    backgroundColor: colors.woltSeeAllBg,
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  primaryText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  secondary: { paddingVertical: 8, alignItems: "center" },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
});
