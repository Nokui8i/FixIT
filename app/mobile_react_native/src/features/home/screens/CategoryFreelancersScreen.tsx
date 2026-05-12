import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ServiceCard } from "../components/ServiceCard";
import { SortChipsRow } from "../components/SortChipsRow";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import type { ServiceListing } from "../types/serviceListing";
import {
  sortCategoryFreelancers,
  type CategoryFreelancerSortKey,
} from "../utils/categoryListingSort";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { routes } from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, radii, spacing } from "@/theme/tokens";
import { listingsForCategory } from "@/data/repositories/discoveryRepository";

/**
 * Category browse: full-width home-style cards, sort chips, no category hero image.
 * Data: `listingsForCategory` until Firestore/geo queries exist.
 */
export function CategoryFreelancersScreen() {
  const { categoryId: raw } = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = typeof raw === "string" ? raw : undefined;
  const { data: discoveryData } = useDiscoveryData();
  const label = useMemo(() => {
    if (!categoryId) return null;
    return (
      discoveryData.categories.find((row) => row.id === categoryId)?.label ?? null
    );
  }, [categoryId, discoveryData.categories]);

  const [sortKey, setSortKey] =
    useState<CategoryFreelancerSortKey>("recommended");

  const listings = useMemo(
    () =>
      categoryId && label ? listingsForCategory(discoveryData, categoryId) : [],
    [categoryId, label, discoveryData],
  );

  const sorted = useMemo(
    () => sortCategoryFreelancers(listings, sortKey),
    [listings, sortKey],
  );

  const renderItem = ({ item }: { item: ServiceListing }) => (
    <ServiceCard item={item} variant="feed" />
  );

  const keyExtractor = (item: ServiceListing) => item.id;

  const listHeader = label ? (
    <View style={styles.headerBlock}>
      <ScreenPageTitle>{label}</ScreenPageTitle>
      <SortChipsRow sortKey={sortKey} onSortKeyChange={setSortKey} />
    </View>
  ) : null;

  if (!categoryId || !label) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFoundBody}>
          <EmptyState
            title="Category not found"
            description="Go back and pick a service type from the home screen."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  return (
    <CustomerAppChrome>
      <FlatList
        data={sorted}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No professionals yet"
              description="When your backend is connected, this list will load pros who match this category and your area."
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() =>
              router.push({
                pathname: routes.requestNew,
                params: { categoryId },
              })
            }
          >
            <Text style={styles.ctaText}>Post a request in this category</Text>
          </Pressable>
        }
      />
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  notFoundBody: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xs,
  },
  headerBlock: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  emptyWrap: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.xl,
  },
  cta: {
    marginHorizontal: WOLT_PAGE_PADDING,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.woltSeeAllBg,
    paddingVertical: spacing.md,
    borderRadius: radii.button,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ctaPressed: { opacity: 0.92 },
  ctaText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
