import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ServiceCard } from "../components/ServiceCard";
import { SortChipsRow } from "../components/SortChipsRow";
import { type HomeBrowseSection } from "../data/demoFreelancers";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import type { ServiceListing } from "../types/serviceListing";
import {
  sortCategoryFreelancers,
  type CategoryFreelancerSortKey,
} from "../utils/categoryListingSort";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { spacing } from "@/theme/tokens";
import { listingsForBrowse } from "@/data/repositories/discoveryRepository";

const TITLES: Record<HomeBrowseSection, string> = {
  nearby: "All nearby professionals",
  "top-rated": "Top rated near you",
  "around-you": "Nearby Professionals",
};

function isBrowseSection(v: string | undefined): v is HomeBrowseSection {
  return v === "nearby" || v === "top-rated" || v === "around-you";
}

/** Full vertical list for a home “See more” / “See all” section (Firestore data). */
export function BrowseSectionScreen() {
  const { section: raw } = useLocalSearchParams<{ section?: string }>();
  const section = typeof raw === "string" ? raw : undefined;
  const { data: discoveryData } = useDiscoveryData();

  const valid = section && isBrowseSection(section);
  const title = valid ? TITLES[section] : "Browse";
  const listings = useMemo(
    () => (valid ? listingsForBrowse(discoveryData, section) : []),
    [valid, section, discoveryData],
  );

  const [sortKey, setSortKey] =
    useState<CategoryFreelancerSortKey>("recommended");
  const sortedListings = useMemo(
    () => sortCategoryFreelancers(listings, sortKey),
    [listings, sortKey],
  );

  if (!valid) {
    return (
      <CustomerAppChrome>
        <View style={styles.pad}>
          <EmptyState
            title="Section not found"
            description="Use See all or See more from the home screen."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <ScreenPageTitle>{title}</ScreenPageTitle>
      <SortChipsRow sortKey={sortKey} onSortKeyChange={setSortKey} />
    </View>
  );

  const renderItem = ({ item }: { item: ServiceListing }) => (
    <ServiceCard item={item} variant="feed" />
  );

  const keyExtractor = (item: ServiceListing) => item.id;

  return (
    <CustomerAppChrome>
      <FlatList
        data={sortedListings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState title="No professionals" description="Try again later." />
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  headerBlock: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xs,
  },
  emptyWrap: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.xl,
  },
});

