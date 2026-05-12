import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CategoryGridTile } from "../components/CategoryGridTile";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { categoryBrowsePath } from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

/**
 * Full-screen category discovery (Wolt-style grid). Tap a tile → freelancers in that category.
 */
export function CategoriesBrowseScreen() {
  const { data: discoveryData } = useDiscoveryData();

  return (
    <CustomerAppChrome>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ScreenPageTitle>Categories</ScreenPageTitle>
        <Text style={styles.lead}>
          Choose a service type to see pros near you and post a job.
        </Text>
        <View style={styles.grid}>
          {discoveryData.categories.map((tile) => (
            <CategoryGridTile
              key={tile.id}
              tile={tile}
              onPress={() => router.push(categoryBrowsePath(tile.id))}
            />
          ))}
        </View>
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    paddingHorizontal: WOLT_PAGE_PADDING,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
});
