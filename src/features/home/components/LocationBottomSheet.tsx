import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "@/theme/tokens";

type Props = {
  open: boolean;
  country?: string;
  currentAddress?: string;
  /** Called after the sheet has animated out so parent can set `open` to false. */
  onClose: () => void;
  /** Shown in the home top bar (address line or short GPS summary). */
  onApplyLocation: (label: string) => void;
};

type PlacesPrediction = {
  placeId: string;
  description: string;
  secondaryText: string;
  fullText: string;
};

const win = Dimensions.get("window");

function countryToMapsConfig(country: string | undefined): { languageCode: string; regionCode: string } {
  const normalized = (country ?? "").trim().toLowerCase();
  if (!normalized) return { languageCode: "en", regionCode: "US" };
  if (normalized.includes("israel")) return { languageCode: "he", regionCode: "IL" };
  if (normalized.includes("united kingdom")) return { languageCode: "en", regionCode: "GB" };
  if (normalized.includes("united states")) return { languageCode: "en", regionCode: "US" };
  if (normalized.includes("canada")) return { languageCode: "en", regionCode: "CA" };
  if (normalized.includes("germany")) return { languageCode: "de", regionCode: "DE" };
  return { languageCode: "en", regionCode: "US" };
}

export function LocationBottomSheet({
  open,
  country,
  currentAddress,
  onClose,
  onApplyLocation,
}: Props) {
  const insets = useSafeAreaInsets();
  const [searchAddress, setSearchAddress] = useState("");
  const [manualAddressOpen, setManualAddressOpen] = useState(false);
  const [resolvedGpsAddress, setResolvedGpsAddress] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PlacesPrediction[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [applyBusyPlaceId, setApplyBusyPlaceId] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const translateY = useRef(new Animated.Value(win.height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeight = useMemo(
    () => Math.min(Math.round(win.height * 0.72), 560) + insets.bottom,
    [insets.bottom],
  );
  const googleMapsApiKey = useMemo(() => {
    const raw = (Constants.expoConfig?.extra?.fixitBrand as { googleMapsApiKey?: string } | undefined)
      ?.googleMapsApiKey;
    return typeof raw === "string" ? raw.trim() : "";
  }, []);
  const mapsConfig = useMemo(() => countryToMapsConfig(country), [country]);
  const dismiss = useCallback(() => {
    setManualAddressOpen(false);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetHeight + 40,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [backdropOpacity, onClose, sheetHeight, translateY]);

  useLayoutEffect(() => {
    translateY.setValue(sheetHeight + 40);
    backdropOpacity.setValue(0);
  }, [open, sheetHeight, translateY, backdropOpacity]);

  useEffect(() => {
    if (open) {
      setSearchAddress(currentAddress?.trim() ?? "");
      setManualAddressOpen(false);
      setResolvedGpsAddress(currentAddress?.trim() || null);
      setPredictions([]);
    }
  }, [currentAddress, open]);

  useEffect(() => {
    if (!manualAddressOpen) return;
    const q = searchAddress.trim();
    if (q.length < 2 || !googleMapsApiKey) {
      setPredictions([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        try {
          const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleMapsApiKey,
              "X-Goog-FieldMask":
                "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
            },
            body: JSON.stringify({
              input: q,
              languageCode: mapsConfig.languageCode,
              regionCode: mapsConfig.regionCode,
            }),
          });
          const json = (await res.json()) as {
            error?: { message?: string };
            suggestions?: Array<{
              placePrediction?: {
                placeId?: string;
                text?: { text?: string };
                structuredFormat?: {
                  mainText?: { text?: string };
                  secondaryText?: { text?: string };
                };
              };
            }>;
          };
          if (!alive) return;
          if (json.error) {
            setPredictions([]);
            return;
          }
          const rows = (json.suggestions ?? [])
            .map((p) => ({
              placeId: p.placePrediction?.placeId ?? "",
              description:
                p.placePrediction?.structuredFormat?.mainText?.text ??
                p.placePrediction?.text?.text ??
                "",
              secondaryText: p.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
              fullText: p.placePrediction?.text?.text ?? "",
            }))
            .filter((r) => r.placeId && r.description);
          setPredictions(rows);
        } catch {
          if (alive) setPredictions([]);
        } finally {
          if (alive) setSearchBusy(false);
        }
      })();
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [
    searchAddress,
    googleMapsApiKey,
    mapsConfig.languageCode,
    mapsConfig.regionCode,
    manualAddressOpen,
  ]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 28,
          stiffness: 280,
          mass: 0.85,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.45,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(id);
  }, [open, translateY, backdropOpacity]);

  const dismissManualAddress = useCallback(() => {
    setManualAddressOpen(false);
  }, []);

  const useGps = useCallback(async () => {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location off",
          "Allow location access in settings to use GPS for your area.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      let label = "";

      // Prefer Google Geocoding result for a precise street + number label.
      if (googleMapsApiKey) {
        try {
          const geocodeUrl =
            "https://maps.googleapis.com/maps/api/geocode/json" +
            `?latlng=${latitude},${longitude}` +
            `&language=${encodeURIComponent(mapsConfig.languageCode)}&key=${encodeURIComponent(googleMapsApiKey)}`;
          const geocodeRes = await fetch(geocodeUrl);
          const geocodeJson = (await geocodeRes.json()) as {
            status?: string;
            results?: Array<{
              formatted_address?: string;
              address_components?: Array<{
                long_name?: string;
                types?: string[];
              }>;
            }>;
          };
          const top = geocodeJson.results?.[0];
          if (top) {
            const comps = top.address_components ?? [];
            const getComp = (type: string) =>
              comps.find((c) => c.types?.includes(type))?.long_name ?? "";
            const streetName = getComp("route");
            const streetNo = getComp("street_number");
            const cityName =
              getComp("locality") ||
              getComp("postal_town") ||
              getComp("administrative_area_level_2") ||
              getComp("administrative_area_level_1");
            if (streetName || streetNo || cityName) {
              label = [streetName, streetNo, cityName].filter(Boolean).join(" ");
            } else if (top.formatted_address) {
              label = top.formatted_address;
            }
          }
        } catch {
          // Fall through to expo reverse-geocode fallback.
        }
      }

      if (!label) {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        const first = reverse[0];
        label =
          first && (first.street || first.city || first.region)
            ? [first.street, first.streetNumber, first.city ?? first.region]
                .filter(Boolean)
                .join(" ")
            : `GPS · ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      setResolvedGpsAddress(label);
      onApplyLocation(label);
      dismiss();
    } catch {
      Alert.alert("Location error", "Could not read GPS. Try again or enter an address.");
    } finally {
      setGpsBusy(false);
    }
  }, [dismiss, googleMapsApiKey, mapsConfig.languageCode, onApplyLocation]);

  const applyPrediction = useCallback(
    async (row: PlacesPrediction) => {
      const fallbackLabel =
        [row.description, row.secondaryText].filter(Boolean).join(", ") ||
        row.fullText;

      if (!googleMapsApiKey) {
        const label = fallbackLabel;
        setResolvedGpsAddress(label);
        setSearchAddress(label);
        onApplyLocation(label);
        setManualAddressOpen(false);
        dismiss();
        return;
      }

      setApplyBusyPlaceId(row.placeId);
      try {
        const detailsUrl =
          `https://places.googleapis.com/v1/places/${encodeURIComponent(
            row.placeId,
          )}` + `?languageCode=${encodeURIComponent(mapsConfig.languageCode)}`;

        const detailsRes = await fetch(detailsUrl, {
          headers: {
            "X-Goog-Api-Key": googleMapsApiKey,
            "X-Goog-FieldMask":
              "addressComponents,formattedAddress,location",
          },
        });

        const details = (await detailsRes.json()) as {
          formattedAddress?: string;
          addressComponents?: Array<{
            longText?: string;
            shortText?: string;
            types?: string[];
          }>;
        };

        const comps = details.addressComponents ?? [];
        const getComp = (type: string) =>
          comps.find((c) => c.types?.includes(type))?.longText ??
          comps.find((c) => c.types?.includes(type))?.shortText ??
          "";

        const cityName =
          getComp("locality") ||
          getComp("postal_town") ||
          getComp("administrative_area_level_2") ||
          getComp("administrative_area_level_1");
        const streetName = getComp("route");
        const streetNo = getComp("street_number");

        const preciseLabel =
          [streetName, streetNo, cityName].filter(Boolean).join(" ") ||
          fallbackLabel;
        const label = details.formattedAddress || preciseLabel;

        setResolvedGpsAddress(label);
        setSearchAddress(label);
        onApplyLocation(label);
        setManualAddressOpen(false);
        dismiss();
      } catch {
        setResolvedGpsAddress(fallbackLabel);
        setSearchAddress(fallbackLabel);
        onApplyLocation(fallbackLabel);
        setManualAddressOpen(false);
        dismiss();
      } finally {
        setApplyBusyPlaceId(null);
      }
    },
    [dismiss, googleMapsApiKey, mapsConfig.languageCode, onApplyLocation],
  );

  const applyManualAddress = useCallback(() => {
    const label = searchAddress.trim();
    if (!label) {
      Alert.alert("Missing address", "Type your address to search.");
      return;
    }

    void (async () => {
      if (!googleMapsApiKey) {
        Alert.alert(
          "Address validation unavailable",
          "Google Maps key is missing, so we cannot verify this address.",
        );
        return;
      }
      setSearchBusy(true);
      try {
        const geocodeUrl =
          "https://maps.googleapis.com/maps/api/geocode/json" +
          `?address=${encodeURIComponent(label)}` +
          `&language=${encodeURIComponent(mapsConfig.languageCode)}` +
          `&region=${encodeURIComponent(mapsConfig.regionCode)}` +
          `&key=${encodeURIComponent(googleMapsApiKey)}`;
        const res = await fetch(geocodeUrl);
        const json = (await res.json()) as {
          status?: string;
          results?: Array<{ formatted_address?: string }>;
        };
        const best = json.results?.[0]?.formatted_address?.trim();
        if (!best) {
          Alert.alert(
            "Address not found",
            "We couldn't find this address. Please pick one from suggestions.",
          );
          return;
        }
        setResolvedGpsAddress(best);
        setSearchAddress(best);
        onApplyLocation(best);
        setManualAddressOpen(false);
        dismiss();
      } catch {
        Alert.alert("Network error", "Could not verify address. Try again.");
      } finally {
        setSearchBusy(false);
      }
    })();
  }, [dismiss, googleMapsApiKey, mapsConfig.languageCode, mapsConfig.regionCode, onApplyLocation, searchAddress]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              transform: [{ translateY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top + 12}
          >
            <View style={styles.grabberWrap}>
              <View style={styles.grabber} />
            </View>

            <View style={styles.headerRow}>
              <Text style={styles.title}>Choose location</Text>
              <Pressable
                onPress={dismiss}
                style={styles.closeBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              <Pressable style={styles.row} onPress={useGps} disabled={gpsBusy}>
                <View style={[styles.rowIcon, styles.rowIconMuted]}>
                  {gpsBusy ? (
                    <ActivityIndicator color={colors.textSecondary} />
                  ) : (
                    <Ionicons name="navigate" size={20} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Find my location</Text>
                  <Text style={styles.rowSub}>
                    {resolvedGpsAddress ? resolvedGpsAddress : "Use my current location"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable style={styles.row} onPress={() => setManualAddressOpen(true)}>
                <View style={[styles.rowIcon, styles.rowIconAccent]}>
                  <Ionicons name="add" size={20} color={colors.brandPrimary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Add new address</Text>
                  <Text style={styles.rowSub}>City, street, house number</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

            </ScrollView>

          </KeyboardAvoidingView>
        </Animated.View>

        {manualAddressOpen ? (
          <View style={styles.popupRoot} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissManualAddress}>
              <View style={styles.popupBackdrop} />
            </Pressable>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "position"}
              keyboardVerticalOffset={24}
              style={styles.popupKeyboard}
            >
              <View style={styles.popupCard}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.popupScrollBody}
                  >
                    <View style={styles.popupHeaderRow}>
                      <Text style={styles.popupTitle}>Add address</Text>
                      <Pressable onPress={dismissManualAddress} style={styles.closeBtn} hitSlop={10}>
                        <Ionicons name="close" size={22} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  <Text style={styles.fieldLabel}>Enter address</Text>
                  <TextInput
                    style={styles.inputCompact}
                    value={searchAddress}
                    onChangeText={setSearchAddress}
                    placeholder="Start typing street + house number..."
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={applyManualAddress}
                  />
                  <View style={styles.suggestionsCardTop}>
                    <ScrollView
                      style={styles.suggestionsList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {googleMapsApiKey ? (
                        <>
                          {searchBusy ? (
                            <Text style={styles.metaText}>Searching places…</Text>
                          ) : predictions.length === 0 ? (
                            <Text style={styles.metaText}>Type in the search field to see autofill suggestions.</Text>
                          ) : (
                            predictions.slice(0, 8).map((row) => (
                              <Pressable
                                key={row.placeId}
                                style={({ pressed }) => [styles.suggestionRow, pressed && styles.rowPressed]}
                                onPress={() => void applyPrediction(row)}
                                disabled={applyBusyPlaceId === row.placeId}
                              >
                                {applyBusyPlaceId === row.placeId ? (
                                  <ActivityIndicator size="small" color={colors.textSecondary} />
                                ) : (
                                  <Ionicons name="arrow-down-outline" size={16} color={colors.textSecondary} />
                                )}
                                <View style={styles.suggestionTextWrap}>
                                  <Text style={styles.suggestionText}>{row.description}</Text>
                                  {row.secondaryText ? (
                                    <Text style={styles.suggestionSubText}>{row.secondaryText}</Text>
                                  ) : null}
                                </View>
                                <View style={styles.suggestionIconCircle}>
                                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                                </View>
                              </Pressable>
                            ))
                          )}
                        </>
                      ) : (
                        <Text style={styles.metaText}>
                          Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env to enable suggestions.
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.manualApplyBtn, pressed && styles.rowPressed]}
                    onPress={applyManualAddress}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.manualApplyBtnText}>Use this address</Text>
                  </Pressable>
                  </ScrollView>
                </TouchableWithoutFeedback>
              </View>
            </KeyboardAvoidingView>
          </View>
        ) : null}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    zIndex: 20,
  },
  keyboard: {
    flex: 1,
  },
  grabberWrap: {
    alignItems: "center",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.divider,
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconMuted: {
    backgroundColor: colors.rowWash,
  },
  rowIconAccent: {
    backgroundColor: "#E6F5FF",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputCompact: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  suggestionsCard: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  suggestionsCardTop: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    height: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.72 },
  suggestionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  suggestionTextWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  suggestionSubText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  suggestionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manualApplyBtn: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  manualApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  popupRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    zIndex: 60,
    elevation: 60,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  popupKeyboard: {
    width: "100%",
    maxWidth: 520,
  },
  popupScrollBody: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  popupCard: {
    width: "100%",
    maxHeight: "72%",
    backgroundColor: colors.background,
    borderRadius: radii.modal,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 70,
    zIndex: 70,
  },
  popupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  popupTitle: {
    flex: 1,
    fontSize: 26,
    lineHeight: 29,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
});
