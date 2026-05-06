import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";

export type SelectOption = { id: string; label: string };

type SelectFieldProps = {
  label: string;
  valueId: string | undefined;
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Only one menu open at a time — parent owns this key. */
  menuKey: string;
  openMenuKey: string | null;
  onOpenMenuKey: (key: string | null) => void;
};

const LIST_MAX_HEIGHT = 260;

export function SelectField({
  label,
  valueId,
  options,
  onSelect,
  placeholder = "Select…",
  disabled,
  menuKey,
  openMenuKey,
  onOpenMenuKey,
}: SelectFieldProps) {
  const expanded = !disabled && openMenuKey === menuKey;
  const selected = useMemo(
    () => options.find((o) => o.id === valueId),
    [options, valueId],
  );

  const toggle = () => {
    if (disabled) return;
    onOpenMenuKey(expanded ? null : menuKey);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[styles.shell, disabled && styles.shellDisabled]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded }}
          style={styles.trigger}
          onPress={toggle}
          disabled={disabled}
        >
          <Text
            style={[
              styles.triggerText,
              !selected && styles.triggerPlaceholder,
            ]}
            numberOfLines={2}
          >
            {selected?.label ?? placeholder}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.chevronMuted}
          />
        </Pressable>

        {expanded ? (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={options.length > 6}
          >
            {options.map((item) => {
              const on = item.id === valueId;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.optionRow, on && styles.optionRowOn]}
                  onPress={() => {
                    onSelect(item);
                    onOpenMenuKey(null);
                  }}
                >
                  <Text
                    style={[styles.optionText, on && styles.optionTextOn]}
                  >
                    {item.label}
                  </Text>
                  {on ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.textPrimary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  shell: {
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  shellDisabled: {
    opacity: 0.45,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  triggerPlaceholder: {
    fontWeight: "500",
    color: colors.textSecondary,
  },
  listScroll: {
    maxHeight: LIST_MAX_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionRowOn: {
    backgroundColor: colors.woltSeeAllBg,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingRight: spacing.sm,
  },
  optionTextOn: {
    fontWeight: "600",
  },
});
