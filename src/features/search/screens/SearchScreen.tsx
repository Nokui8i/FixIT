import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ServiceCard } from "@/features/home/components/ServiceCard";
import { useDiscoveryData } from "@/features/home/hooks/useDiscoveryData";
import { SearchCategoryListRow } from "@/features/search/components/SearchCategoryListRow";
import { smartSearchListings } from "@/features/search/utils/smartSearchListings";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { categoryBrowsePath } from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, radii, spacing } from "@/theme/tokens";

/**
 * Search: pill field + category list; smart results when query non-empty.
 */
export function SearchScreen() {
  const [query, setQuery] = useState("");
  const { data: discoveryData } = useDiscoveryData();

  const pool = useMemo(() => discoveryData.listings, [discoveryData.listings]);

  const hits = useMemo(
    () => smartSearchListings(query, pool),
    [query, pool],
  );

  const showResults = query.trim().length > 0;

  return (
    <CustomerAppChrome reserveHubTabBar>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchPill}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => setQuery("")}
            >
              <Ionicons name="close-circle" size={18} color={colors.chevronMuted} />
            </Pressable>
          ) : null}
        </View>

        {showResults ? (
          <View style={styles.resultsBlock}>
            <Text style={styles.resultsHeading}>
              Results{hits.length > 0 ? ` (${hits.length})` : ""}
            </Text>
            {hits.length === 0 ? (
              <EmptyState
                title="No matches"
                description="Try another name, trade, or phrase (for example car keys, leak, or electrician)."
              />
            ) : (
              <View style={styles.grid}>
                {hits.map(({ listing }) => (
                  <ServiceCard key={listing.id} item={listing} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.listCard}>
            {discoveryData.categories.map((tile, index) => (
              <SearchCategoryListRow
                key={tile.id}
                tile={tile}
                showDivider={index < discoveryData.categories.length - 1}
                onPress={() => router.push(categoryBrowsePath(tile.id))}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: WOLT_PAGE_PADDING,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    minHeight: 42,
    backgroundColor: colors.background,
    borderRadius: radii.floating,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    paddingVertical: 0,
    margin: 0,
  },
  resultsBlock: {
    marginTop: spacing.lg,
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
  resultsHeading: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  listCard: {
    marginTop: spacing.lg,
    marginHorizontal: WOLT_PAGE_PADDING,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
});
