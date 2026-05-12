import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardTypeOptions,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { colors, spacing } from "@/theme/tokens";
import { useDiscoveryData } from "@/features/home/hooks/useDiscoveryData";
import { PRO_CATEGORY_ICONS } from "@/features/pro/data/proCategoryIcons";
import {
  DEFAULT_PRO_APPLICATION_DRAFT,
  emptyTradeLicenseDraft,
  hasProApplicationAlreadySubmitted,
  loadMyProApplicationDraft,
  loadMyProOnboardingSnapshot,
  saveMyProApplicationDraft,
  submitMyProApplication,
  syncLicensesByCategoryIds,
  type ProApplicationDraft,
  type StripeOnboardingStatus,
  type TradeLicenseDraft,
} from "@/data/repositories/proProfileRepository";
import {
  createStripeConnectOnboardingLink,
  verifyStripeConnectAccount,
} from "@/data/repositories/stripeRepository";
import { categoryLabelFromId } from "@/features/home/data/categoryCatalog";
import { specialtiesForCategory } from "@/features/requests/data/categorySpecialties";
import { isRegulatedCategoryId, proSelectionRequiresLicense } from "@/features/pro/data/regulatedCategoryIds";
import {
  PRO_LEGAL_AGREEMENT_COPY,
  type ProLegalAgreementId,
} from "@/features/pro/data/proApplyLegalCopy";
import { getFirebaseAuth, getFirebaseStorage } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";

type PlacesPrediction = {
  placeId: string;
  description: string;
  secondaryText: string;
  fullText: string;
};

type UploadLoadKey = `license:${string}` | "coiUrl" | "governmentIdUrl";

type DocUploadTarget =
  | { kind: "trade_license"; categoryId: string }
  | { kind: "coi" }
  | { kind: "governmentId" };

function uploadKeyFor(target: DocUploadTarget): UploadLoadKey {
  if (target.kind === "trade_license") return `license:${target.categoryId}`;
  if (target.kind === "coi") return "coiUrl";
  return "governmentIdUrl";
}

function uploadStorageLabel(target: DocUploadTarget): string {
  if (target.kind === "trade_license") return `licenseDocument-${target.categoryId}`;
  if (target.kind === "coi") return "coiUrl";
  return "governmentIdUrl";
}

type MapModule = {
  default: React.ComponentType<Record<string, unknown>>;
  Circle: React.ComponentType<Record<string, unknown>>;
};

let mapModule: MapModule | null = null;
try {
  mapModule = require("react-native-maps") as MapModule;
} catch {
  mapModule = null;
}

function circlePathPointsStatic(lat: number, lng: number, radiusMeters: number, points = 20): string {
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos(latRad));
  const coords: string[] = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (2 * Math.PI * i) / points;
    const pLat = lat + dLat * Math.sin(angle);
    const pLng = lng + dLng * Math.cos(angle);
    coords.push(`${pLat},${pLng}`);
  }
  return coords.join("|");
}

function radiusBoundsCoords(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    { latitude: lat + latDelta, longitude: lng },
    { latitude: lat - latDelta, longitude: lng },
    { latitude: lat, longitude: lng + lngDelta },
    { latitude: lat, longitude: lng - lngDelta },
  ];
}

function milesToLatitudeDelta(radiusMiles: number): number {
  // ~69 miles per 1 degree latitude; x2 so full diameter is visible.
  return Math.max(0.01, ((Math.max(radiusMiles, 5) * 2) / 69) * 1.15);
}

function formatEnglishList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]!}`;
}

const STEP_TITLES = [
  "Work profile",
  "Trust & compliance",
  "Platform legal",
  "Stripe payouts",
] as const;
/** Stripe Connect custom account ids (e.g. acct_xxx). */
const STRIPE_CONNECT_ACCOUNT_ID_RE = /^acct_[a-zA-Z0-9]+$/;

/** US tax ID: SSN or EIN both use 9 digits (client-side check; Stripe/KYC is authoritative). */
function taxIdDigitsCount(raw: string): number {
  return raw.replace(/\D/g, "").length;
}

const STEP_DESCRIPTIONS = [
  "Choose your services, legal identity for payouts, base location, and how far you travel.",
  "Upload required documents; optional sections can wait until later.",
  "Tap each agreement to read it. Accept inside the document to turn on the switch.",
  "Progress saves automatically. Connect Stripe; you can submit while payout approval is pending—we update your profile when Stripe enables transfers.",
] as const;

function isRegulatedSelection(categoryIds: string[]): boolean {
  return proSelectionRequiresLicense(categoryIds);
}

export function ProApplyScreen() {
  const router = useRouter();
  const { data: discoveryData, loading: categoriesLoading } = useDiscoveryData();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [subcategoryMenuOpen, setSubcategoryMenuOpen] = useState(false);
  const [predictions, setPredictions] = useState<PlacesPrediction[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [mapInteracting, setMapInteracting] = useState(false);
  const [draft, setDraft] = useState<ProApplicationDraft>(DEFAULT_PRO_APPLICATION_DRAFT);
  const [stripeOnboardingStatus, setStripeOnboardingStatus] =
    useState<StripeOnboardingStatus>("not_started");
  const [addressInputFocused, setAddressInputFocused] = useState(false);
  const [locationMode, setLocationMode] = useState<"gps" | "manual">("gps");
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  /** Trust step (1): collapsible sections — insurance starts closed to reduce visual noise. */
  const [trustSectionsOpen, setTrustSectionsOpen] = useState({
    tradeLicenses: true,
    insurance: false,
    identity: true,
  });
  const [legalModalAgreement, setLegalModalAgreement] = useState<ProLegalAgreementId | null>(null);
  const [legalAcceptedViaModal, setLegalAcceptedViaModal] = useState<Record<ProLegalAgreementId, boolean>>(
    {
      termsCommission: false,
      accuracy: false,
      contractor: false,
      insurance: false,
    },
  );
  const [legalReadHint, setLegalReadHint] = useState<string | null>(null);
  const legalReadHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stripeVerification, setStripeVerification] = useState<
    "idle" | "checking" | "valid" | "invalid" | "wrong_format"
  >("idle");
  const [stripeVerifyDetail, setStripeVerifyDetail] = useState<string | null>(null);
  const [stripeVerifyMeta, setStripeVerifyMeta] = useState<{
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [applyHydrationDone, setApplyHydrationDone] = useState(false);
  const [proApplicationAlreadyFiled, setProApplicationAlreadyFiled] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);
  const formScrollRef = useRef<ScrollView | null>(null);
  const radiusMapRef = useRef<any>(null);

  /** Resume saved apply flow from Firestore + sync Stripe id from `pro_profiles`; skip if already submitted. */
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        await ensureCustomerFirebaseSession();
        const [draftFromServer, filed, onboarding] = await Promise.all([
          loadMyProApplicationDraft(),
          hasProApplicationAlreadySubmitted(),
          loadMyProOnboardingSnapshot(),
        ]);
        if (!active) return;
        setProApplicationAlreadyFiled(filed);
        if (filed) {
          setApplyHydrationDone(true);
          return;
        }
        const sid = onboarding.stripeAccountId.trim();
        setDraft((prev) => ({
          ...draftFromServer,
          stripeAccountId:
            sid.length > 0 ? onboarding.stripeAccountId : draftFromServer.stripeAccountId,
        }));
        setStripeOnboardingStatus(onboarding.stripeOnboardingStatus);
      } catch {
        if (!active) return;
      } finally {
        if (active) setApplyHydrationDone(true);
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!proApplicationAlreadyFiled) return;
    router.replace("/pro/requirements");
  }, [proApplicationAlreadyFiled, router]);

  useEffect(() => {
    if (!applyHydrationDone || proApplicationAlreadyFiled || applicationSubmitted) return;
    const t = setTimeout(() => {
      void saveMyProApplicationDraft(draft);
    }, 2000);
    return () => clearTimeout(t);
  }, [draft, applyHydrationDone, proApplicationAlreadyFiled, applicationSubmitted]);

  useEffect(() => {
    return () => {
      if (legalReadHintTimerRef.current) {
        clearTimeout(legalReadHintTimerRef.current);
        legalReadHintTimerRef.current = null;
      }
    };
  }, []);

  const regulatedRequired = useMemo(
    () => isRegulatedSelection(draft.categoryIds),
    [draft.categoryIds],
  );

  const categories = discoveryData.categories;
  /** Regulated categories in the same order as selected on step 1 (one license block each). */
  const regulatedSelectionRows = useMemo(() => {
    const rows: { id: string; label: string }[] = [];
    for (const id of draft.categoryIds) {
      if (!isRegulatedCategoryId(id)) continue;
      const fromDiscovery = categories.find((c) => c.id === id)?.label?.trim();
      const label = (fromDiscovery || categoryLabelFromId(id) || id).trim();
      rows.push({ id, label });
    }
    return rows;
  }, [draft.categoryIds, categories]);

  const patchTradeLicense = (categoryId: string, patch: Partial<TradeLicenseDraft>) => {
    setDraft((prev) => ({
      ...prev,
      licensesByCategoryId: {
        ...prev.licensesByCategoryId,
        [categoryId]: {
          ...(prev.licensesByCategoryId[categoryId] ?? emptyTradeLicenseDraft()),
          ...patch,
        },
      },
    }));
  };
  const selectedCategoryLabels = useMemo(
    () =>
      categories
        .filter((cat) => draft.categoryIds.includes(cat.id))
        .map((cat) => cat.label),
    [categories, draft.categoryIds],
  );
  const availableSpecialties = useMemo(() => {
    const unique = new Map<string, { id: string; label: string }>();
    draft.categoryIds.forEach((id) => {
      specialtiesForCategory(id).forEach((specialty) => {
        unique.set(specialty.id, specialty);
      });
    });
    return Array.from(unique.values());
  }, [draft.categoryIds]);
  const selectedSpecialtyLabels = useMemo(
    () =>
      availableSpecialties
        .filter((item) => draft.specialtyIds.includes(item.id))
        .map((item) => item.label),
    [availableSpecialties, draft.specialtyIds],
  );
  const radiusMiles = Number.parseInt(draft.serviceRadiusMiles, 10) || 25;
  const radiusMeters = radiusMiles * 1609.34;
  const rawLatitudeDelta = milesToLatitudeDelta(radiusMiles);
  const nativeLatitudeDelta = Math.min(rawLatitudeDelta * 1.22, 1.45);
  // Keep static map fallback readable for large radii.
  const mapLatitudeDelta = Math.min(rawLatitudeDelta, 0.9);
  const mapLongitudeDelta = Math.max(
    0.01,
    nativeLatitudeDelta /
      Math.max(0.25, Math.cos((((typeof draft.baseLocationLat === "number" ? draft.baseLocationLat : 36) * Math.PI) / 180))),
  );
  const googleMapsApiKey = useMemo(() => {
    const raw = (Constants.expoConfig?.extra?.fixitBrand as { googleMapsApiKey?: string } | undefined)
      ?.googleMapsApiKey;
    return typeof raw === "string" ? raw.trim() : "";
  }, []);
  const shouldEnableScroll = contentHeight > viewportHeight + 12;
  const baseLat = draft.baseLocationLat;
  const baseLng = draft.baseLocationLng;
  const MapViewComponent = mapModule?.default;
  const CircleComponent = mapModule?.Circle;
  const canShowMap =
    Boolean(mapModule && MapViewComponent && CircleComponent) &&
    typeof baseLat === "number" &&
    typeof baseLng === "number";
  const staticMapUrl = useMemo(() => {
    if (typeof baseLat !== "number" || typeof baseLng !== "number" || !googleMapsApiKey) return "";
    const safeDelta = Math.max(mapLatitudeDelta, 0.0001);
    const zoom = Math.max(6, Math.min(15, Math.round(Math.log2(360 / safeDelta))));
    const circlePath = circlePathPointsStatic(baseLat, baseLng, radiusMeters);
    return (
      "https://maps.googleapis.com/maps/api/staticmap" +
      `?size=1200x600&scale=2&maptype=roadmap` +
      `&center=${encodeURIComponent(`${baseLat},${baseLng}`)}` +
      `&zoom=${zoom}` +
      `&markers=${encodeURIComponent(`color:red|${baseLat},${baseLng}`)}` +
      `&path=${encodeURIComponent(`fillcolor:0x007AFF33|color:0x007AFFFF|weight:4|${circlePath}`)}` +
      `&key=${encodeURIComponent(googleMapsApiKey)}`
    );
  }, [baseLat, baseLng, googleMapsApiKey, mapLatitudeDelta, radiusMeters]);

  const validateStepAt = (stepIndex: number): string | null => {
    if (stepIndex === 0) {
      if (draft.categoryIds.length === 0) return "Select at least one service category.";
      if (draft.specialtyIds.length === 0) return "Select at least one subcategory.";
      if (draft.legalName.trim().length < 3) {
        return "Enter your full legal name (as on tax documents).";
      }
      if (taxIdDigitsCount(draft.ssnOrEin) < 9) {
        return "Enter a valid SSN or EIN (9 digits — spaces or dashes are OK).";
      }
      if (locationMode === "gps" && !draft.gpsAddressDetected.trim()) {
        return "Use GPS location to set your base address.";
      }
      if (locationMode === "manual" && !draft.serviceAddress.trim()) {
        return "Enter your base address.";
      }
      if (draft.baseLocationLat === null || draft.baseLocationLng === null) {
        return "Save a valid location (lat/lng) from GPS or address selection.";
      }
      return null;
    }
    if (stepIndex === 1) {
      if (!draft.governmentIdUrl.trim()) {
        return "Government ID document is required.";
      }
      if (regulatedRequired) {
        for (const row of regulatedSelectionRows) {
          const L = draft.licensesByCategoryId[row.id] ?? emptyTradeLicenseDraft();
          const trade = row.label;
          if (!L.licenseNumber.trim()) {
            return `Please provide your ${trade} license number.`;
          }
          if (!L.licenseState.trim()) {
            return `Please provide the issuing state for your ${trade} license.`;
          }
          if (!L.licenseExpirationDate.trim()) {
            return `Please provide the expiration date for your ${trade} license.`;
          }
          if (!L.licenseDocumentUrl.trim()) {
            return `Please upload your ${trade} license document.`;
          }
        }
      }
      if (!draft.criminalRecordDeclaration) {
        return "Confirm \"No undisclosed criminal history\" to continue.";
      }
      return null;
    }
    if (stepIndex === 2) {
      if (!draft.termsAccepted || !draft.commissionAccepted) {
        return "Enable Terms of Service & Commission Policy to continue.";
      }
      if (!draft.accuracyAccepted) {
        return "Enable Information Accuracy Confirmation to continue.";
      }
      if (!draft.independentContractorAccepted) {
        return "Enable Independent Contractor Declaration to continue.";
      }
      if (!draft.marketplaceDisclaimerAccepted) {
        return "Enable Insurance & Liability Disclaimer to continue.";
      }
      return null;
    }
    if (stepIndex === 3) {
      if (Object.values(uploadingDocs).some(Boolean)) {
        return "Please wait for document uploads to finish.";
      }
      if (!draft.stripeAccountId.trim()) {
        return "Connect Stripe first so payouts and compliance are enabled.";
      }
      return null;
    }
    return null;
  };

  const validateStep = (): string | null => validateStepAt(step);
  const hasPendingUploads = Object.values(uploadingDocs).some(Boolean);
  const stepBlockingError = step < STEP_TITLES.length - 1 ? validateStepAt(step) : null;
  const currentStepBlocksNext = stepBlockingError !== null;
  /** Account exists & is yours (`accounts.retrieve`). Does not imply bank/KYC finished — see `stripePayoutsReady`. */
  const stripePayableReady =
    stripeVerification === "valid" && stripeVerifyMeta?.payoutsEnabled === true;
  /** Payouts optional for submit — see `stripe_payouts_enabled_at_submit` in Firestore + live webhook `payouts_enabled`. */
  const finalizeSubmitBlocked =
    submitting ||
    hasPendingUploads ||
    validateStepAt(3) !== null ||
    stripeVerification !== "valid";

  const submitBlockingHint = (): string | null => {
    if (!finalizeSubmitBlocked || submitting) return null;
    const step3Err = validateStepAt(3);
    if (step3Err !== null) return step3Err;
    if (stripeVerification !== "valid") {
      return (
        stripeVerifyDetail ??
        (stripeVerification === "checking"
          ? "Verifying Stripe account…"
          : "Confirm your Stripe Connect account (acct_…) matches your login.")
      );
    }
    return null;
  };

  const finalizeFooterHint = step === STEP_TITLES.length - 1 ? submitBlockingHint() : null;

  const next = () => setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1));
  const previous = () => setStep((prev) => Math.max(prev - 1, 0));

  const flashLegalReadHint = () => {
    const msg = "Please read the agreement before accepting.";
    setLegalReadHint(msg);
    if (legalReadHintTimerRef.current) {
      clearTimeout(legalReadHintTimerRef.current);
    }
    legalReadHintTimerRef.current = setTimeout(() => {
      setLegalReadHint(null);
      legalReadHintTimerRef.current = null;
    }, 3200);
  };

  const handleLegalAgreementSwitch = (agreementId: ProLegalAgreementId, wantsOn: boolean) => {
    if (!wantsOn) {
      setLegalAcceptedViaModal((prev) => ({ ...prev, [agreementId]: false }));
      if (agreementId === "termsCommission") {
        setDraft((d) => ({ ...d, termsAccepted: false, commissionAccepted: false }));
      } else if (agreementId === "accuracy") {
        setDraft((d) => ({ ...d, accuracyAccepted: false }));
      } else if (agreementId === "contractor") {
        setDraft((d) => ({ ...d, independentContractorAccepted: false }));
      } else {
        setDraft((d) => ({ ...d, marketplaceDisclaimerAccepted: false }));
      }
      return;
    }
    if (!legalAcceptedViaModal[agreementId]) {
      flashLegalReadHint();
      return;
    }
  };

  const applyLegalAgreementFromModal = (agreementId: ProLegalAgreementId) => {
    setLegalAcceptedViaModal((prev) => ({ ...prev, [agreementId]: true }));
    if (agreementId === "termsCommission") {
      setDraft((d) => ({ ...d, termsAccepted: true, commissionAccepted: true }));
    } else if (agreementId === "accuracy") {
      setDraft((d) => ({ ...d, accuracyAccepted: true }));
    } else if (agreementId === "contractor") {
      setDraft((d) => ({ ...d, independentContractorAccepted: true }));
    } else {
      setDraft((d) => ({ ...d, marketplaceDisclaimerAccepted: true }));
    }
    setLegalModalAgreement(null);
  };

  const submit = async () => {
    const error = [0, 1, 2, 3]
      .map((stepIndex) => validateStepAt(stepIndex))
      .find((value): value is string => Boolean(value));
    if (error) {
      Alert.alert("Cannot submit", error);
      return;
    }
    const stripeId = draft.stripeAccountId.trim();
    if (!STRIPE_CONNECT_ACCOUNT_ID_RE.test(stripeId)) {
      Alert.alert("Cannot submit", "Enter a valid Stripe Connect account ID (starts with acct_).");
      return;
    }
    setSubmitting(true);
    try {
      const verified = await verifyStripeConnectAccount(stripeId);
      setStripeVerifyMeta({
        payoutsEnabled: verified.payoutsEnabled,
        detailsSubmitted: verified.detailsSubmitted,
      });
      setStripeVerification("valid");
      await submitMyProApplication(draft, {
        payoutsEnabled: verified.payoutsEnabled,
        detailsSubmitted: verified.detailsSubmitted,
        chargesEnabled: verified.chargesEnabled,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setApplicationSubmitted(true);
    } catch (e: unknown) {
      Alert.alert("Submit failed", e instanceof Error ? e.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((prev) => {
      const has = prev.categoryIds.includes(categoryId);
      const categoryIds = has
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];
      const allowed = new Set(
        categoryIds.flatMap((id) => specialtiesForCategory(id).map((item) => item.id)),
      );
      return {
        ...prev,
        categoryIds,
        specialtyIds: prev.specialtyIds.filter((id) => allowed.has(id)),
        licensesByCategoryId: syncLicensesByCategoryIds(categoryIds, prev.licensesByCategoryId),
      };
    });
  };

  const toggleSpecialty = (specialtyId: string) => {
    setDraft((prev) => {
      const has = prev.specialtyIds.includes(specialtyId);
      return {
        ...prev,
        specialtyIds: has
          ? prev.specialtyIds.filter((id) => id !== specialtyId)
          : [...prev.specialtyIds, specialtyId],
      };
    });
  };

  const detectAddressWithGps = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Please allow location access and try again.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const reverse = await Location.reverseGeocodeAsync(pos.coords);
      const first = reverse[0];
      const detected =
        first && (first.street || first.city || first.region)
          ? [first.street, first.streetNumber, first.city ?? first.region].filter(Boolean).join(" ")
          : `GPS ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      Alert.alert("Use this address?", detected, [
        { text: "Edit manually", style: "cancel" },
        {
          text: "Use this",
          onPress: () =>
            setDraft((prev) => ({
              ...prev,
              gpsAddressDetected: detected,
              serviceAddress: detected,
              baseLocationLat: pos.coords.latitude,
              baseLocationLng: pos.coords.longitude,
            })),
        },
      ]);
    } catch {
      Alert.alert("Location error", "Could not detect your address.");
    }
  };

  useEffect(() => {
    const q = draft.serviceAddress.trim();
    if (step !== 0 || q.length < 2 || !googleMapsApiKey) {
      setPredictions([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void (async () => {
        setSearchingAddress(true);
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
              languageCode: "en",
              regionCode: "US",
            }),
          });
          const json = (await res.json()) as {
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
          setPredictions(rows.slice(0, 8));
        } catch {
          if (alive) setPredictions([]);
        } finally {
          if (alive) setSearchingAddress(false);
        }
      })();
    }, 160);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [draft.serviceAddress, googleMapsApiKey, step]);

  const applyPrediction = async (row: PlacesPrediction) => {
    if (!googleMapsApiKey) return;
    setResolvingPlaceId(row.placeId);
    try {
      const detailsUrl =
        `https://places.googleapis.com/v1/places/${encodeURIComponent(row.placeId)}` +
        "?languageCode=en";
      const detailsRes = await fetch(detailsUrl, {
        headers: {
          "X-Goog-Api-Key": googleMapsApiKey,
          "X-Goog-FieldMask": "formattedAddress,location",
        },
      });
      const details = (await detailsRes.json()) as {
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      };
      setDraft((prev) => ({
        ...prev,
        serviceAddress: details.formattedAddress || row.fullText || row.description,
        baseLocationLat:
          typeof details.location?.latitude === "number" ? details.location.latitude : null,
        baseLocationLng:
          typeof details.location?.longitude === "number" ? details.location.longitude : null,
      }));
      setPredictions([]);
    } catch {
      Alert.alert("Address lookup failed", "Could not use this address. Try another one.");
    } finally {
      setResolvingPlaceId(null);
    }
  };

  const uploadDocFromAsset = async (
    target: DocUploadTarget,
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<void> => {
    await ensureCustomerFirebaseSession();
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      throw new Error("No signed-in user session.");
    }
    const storage = getFirebaseStorage();
    const fileUri = asset.uri;
    const extFromName = asset.fileName?.split(".").pop()?.toLowerCase();
    const extFromUri = fileUri.split(".").pop()?.toLowerCase();
    const ext = (extFromName || extFromUri || "jpg").replace(/[^a-z0-9]/g, "");
    const safeExt = ext.length > 0 ? ext : "jpg";
    const slug = uploadStorageLabel(target);
    const objectRef = ref(storage, `applications/${uid}/${slug}-${Date.now()}.${safeExt}`);
    const response = await fetch(fileUri);
    const blob = await response.blob();
    await uploadBytes(objectRef, blob, {
      contentType: asset.mimeType || blob.type || "image/jpeg",
    });
    const downloadUrl = await getDownloadURL(objectRef);
    setDraft((prev) => {
      if (target.kind === "trade_license") {
        const cid = target.categoryId;
        const prevL = prev.licensesByCategoryId[cid] ?? emptyTradeLicenseDraft();
        return {
          ...prev,
          licensesByCategoryId: {
            ...prev.licensesByCategoryId,
            [cid]: { ...prevL, licenseDocumentUrl: downloadUrl },
          },
        };
      }
      if (target.kind === "coi") {
        return { ...prev, coiUrl: downloadUrl };
      }
      return { ...prev, governmentIdUrl: downloadUrl };
    });
  };

  const runDocumentPickFlow = async (
    target: DocUploadTarget,
    source: "camera" | "library",
  ): Promise<void> => {
    const key = uploadKeyFor(target);
    setUploadingDocs((prev) => ({ ...prev, [key]: true }));
    try {
      if (source === "camera") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPerm.status !== "granted") {
          Alert.alert("Permission needed", "Camera permission is required to take a photo.");
          return;
        }
      } else {
        const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (mediaPerm.status !== "granted") {
          Alert.alert("Permission needed", "Gallery permission is required to choose a file.");
          return;
        }
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      await uploadDocFromAsset(target, result.assets[0]);
    } catch (e: unknown) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Could not upload this document.",
      );
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [key]: false }));
    }
  };

  const pickAndUploadDocument = (target: DocUploadTarget) => {
    Alert.alert("Upload document", "Choose how you want to upload this file.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Camera",
        onPress: () => {
          void runDocumentPickFlow(target, "camera");
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          void runDocumentPickFlow(target, "library");
        },
      },
    ]);
  };

  const openStripeConnect = async () => {
    if (connectingStripe) return;
    setConnectingStripe(true);
    try {
      const res = await createStripeConnectOnboardingLink();
      if (!res.accountId || !res.url) {
        throw new Error("Stripe onboarding link was not returned.");
      }
      setDraft((prev) => ({ ...prev, stripeAccountId: res.accountId }));
      setStripeOnboardingStatus("pending");
      const supported = await Linking.canOpenURL(res.url);
      if (!supported) {
        throw new Error("Cannot open Stripe onboarding URL on this device.");
      }
      await Linking.openURL(res.url);
      Alert.alert(
        "Stripe onboarding opened",
        stripeOnboardingStatus === "expired"
          ? "Your old Stripe onboarding expired, so we started a fresh one. Complete Stripe, then return to the app."
          : "Complete the flow in Stripe, then return to the app.",
      );
    } catch (e: unknown) {
      Alert.alert(
        "Stripe connect failed",
        e instanceof Error ? e.message : "Could not open Stripe onboarding.",
      );
    } finally {
      setConnectingStripe(false);
    }
  };

  useEffect(() => {
    if (!addressInputFocused) return;
    const t = setTimeout(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    }, 140);
    return () => clearTimeout(t);
  }, [addressInputFocused, predictions.length]);

  useEffect(() => {
    if (typeof baseLat !== "number" || typeof baseLng !== "number") return;
    const coords = radiusBoundsCoords(baseLat, baseLng, radiusMeters);
    const map = radiusMapRef.current;
    const t = requestAnimationFrame(() => {
      if (typeof map?.fitToCoordinates === "function") {
        map.fitToCoordinates(coords, {
          edgePadding: { top: 28, right: 28, bottom: 28, left: 28 },
          animated: true,
        });
      } else {
        map?.animateToRegion?.(
          {
            latitude: baseLat,
            longitude: baseLng,
            latitudeDelta: nativeLatitudeDelta,
            longitudeDelta: mapLongitudeDelta,
          },
          200,
        );
      }
    });
    return () => cancelAnimationFrame(t);
  }, [baseLat, baseLng, radiusMeters, nativeLatitudeDelta, mapLongitudeDelta]);

  useEffect(() => {
    if (step !== 3) {
      setStripeVerification("idle");
      setStripeVerifyDetail(null);
      setStripeVerifyMeta(null);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    const id = draft.stripeAccountId.trim();
    setStripeVerifyDetail(null);
    if (!id) {
      setStripeVerification("idle");
      setStripeVerifyMeta(null);
      return;
    }
    if (!STRIPE_CONNECT_ACCOUNT_ID_RE.test(id)) {
      setStripeVerification("wrong_format");
      setStripeVerifyMeta(null);
      setStripeVerifyDetail(
        "Stripe Connect account IDs must look like acct_ followed by letters and numbers.",
      );
      return;
    }
    setStripeVerification("checking");
    setStripeVerifyMeta(null);
    let cancelled = false;
    const t = setTimeout(() => {
      void verifyStripeConnectAccount(id)
        .then((res) => {
          if (cancelled) return;
          setStripeVerification("valid");
          setStripeVerifyMeta({
            payoutsEnabled: res.payoutsEnabled,
            detailsSubmitted: res.detailsSubmitted,
          });
          setStripeVerifyDetail(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setStripeVerification("invalid");
          const msg =
            err instanceof Error && typeof err.message === "string" && err.message.trim()
              ? err.message.trim()
              : "FixIT could not confirm this Stripe account.";
          setStripeVerifyDetail(msg);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, draft.stripeAccountId]);

  useEffect(() => {
    if (step !== 3) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const id = draft.stripeAccountId.trim();
      if (!STRIPE_CONNECT_ACCOUNT_ID_RE.test(id)) return;
      void verifyStripeConnectAccount(id)
        .then((res) => {
          setStripeVerification("valid");
          setStripeVerifyMeta({
            payoutsEnabled: res.payoutsEnabled,
            detailsSubmitted: res.detailsSubmitted,
          });
          setStripeVerifyDetail(null);
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [step, draft.stripeAccountId]);

  if (applicationSubmitted) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Apply as provider" />
        <ScrollView
          contentContainerStyle={[styles.body, styles.thankYouBody]}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.applyStepSheet}>
            <View style={styles.thankYouIconBubble}>
              <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
            </View>
            <Text style={styles.thankYouTitle}>Thank you</Text>
            <Text style={styles.thankYouMessage}>
              Your application has been sent. Our team usually reviews new provider applications within{" "}
              <Text style={styles.thankYouMessageEmphasis}>24–48 hours</Text>.
              {"\n\n"}
              If Stripe was still approving payout setup when you submitted, your profile updates automatically once
              transfers are enabled—no need to start over unless our team reaches out.
              {"\n\n"}
              You’ll hear from us as soon as there’s an update.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.stickyFooter}>
          <Pressable style={styles.thankYouFooterButton} onPress={() => router.replace("/pro")}>
            <Text style={styles.primaryButtonText}>Back to provider home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!applyHydrationDone) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Apply as provider" />
        <View style={styles.applyHydrationLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.applyHydrationLoadingText}>Loading your saved application…</Text>
        </View>
      </View>
    );
  }

  if (proApplicationAlreadyFiled) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Apply as provider" />
        <View style={styles.applyHydrationLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Apply as provider" />
      <ScrollView
        ref={formScrollRef}
        contentContainerStyle={styles.body}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        scrollEnabled={shouldEnableScroll && !mapInteracting}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Step {step + 1} of {STEP_TITLES.length}</Text>
            <Text style={styles.progressPct}>{Math.round(((step + 1) / STEP_TITLES.length) * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEP_TITLES.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressTitle}>{STEP_TITLES[step]}</Text>
          {STEP_DESCRIPTIONS[step] ? (
            <Text style={styles.progressSubtitle}>{STEP_DESCRIPTIONS[step]}</Text>
          ) : null}
        </View>

        {step === 0 ? (
          <View style={styles.applyStepSheet}>
            <View style={styles.fieldBlock}>
              <View style={styles.dropdownWrap}>
                <Pressable
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setSubcategoryMenuOpen(false);
                    setCategoryMenuOpen((prev) => !prev);
                  }}
                >
                  <Ionicons name="list-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.dropdownTriggerText}>
                    {selectedCategoryLabels.length > 0
                      ? `Categories: ${selectedCategoryLabels.join(", ")}`
                      : "Categories"}
                  </Text>
                  <Ionicons
                    name={categoryMenuOpen ? "chevron-up-outline" : "chevron-down-outline"}
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {categoryMenuOpen ? (
                  <Modal
                    visible={categoryMenuOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setCategoryMenuOpen(false)}
                  >
                    <Pressable
                      style={styles.dropdownModalOverlay}
                      onPress={() => setCategoryMenuOpen(false)}
                    >
                      <Pressable style={styles.dropdownModalContent} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.dropdownMenuHeader}>
                          <Text style={styles.dropdownMenuHeaderText}>Categories</Text>
                          <Pressable onPress={() => setCategoryMenuOpen(false)}>
                            <Text style={styles.dropdownMenuDoneText}>Done</Text>
                          </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                          {categories.map((cat) => {
                            const selected = draft.categoryIds.includes(cat.id);
                            const iconName = PRO_CATEGORY_ICONS[cat.id] ?? PRO_CATEGORY_ICONS.default;
                            return (
                              <Pressable
                                key={cat.id}
                                style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                                onPress={() => toggleCategory(cat.id)}
                              >
                                <Ionicons
                                  name={iconName}
                                  size={15}
                                  color={selected ? colors.primary : colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    selected && styles.dropdownItemTextSelected,
                                  ]}
                                >
                                  {cat.label}
                                </Text>
                                <Ionicons
                                  name={selected ? "checkbox-outline" : "square-outline"}
                                  size={16}
                                  color={selected ? colors.primary : colors.textSecondary}
                                />
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </Pressable>
                    </Pressable>
                  </Modal>
                ) : null}
              </View>
              {!categoriesLoading && categories.length === 0 ? (
                <Text style={styles.helperText}>No categories found in Firebase.</Text>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.dropdownWrap}>
                <Pressable
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setCategoryMenuOpen(false);
                    setSubcategoryMenuOpen((prev) => !prev);
                  }}
                >
                  <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.dropdownTriggerText}>
                    {selectedSpecialtyLabels.length > 0
                      ? `Subcategories: ${selectedSpecialtyLabels.join(", ")}`
                      : "Subcategories"}
                  </Text>
                  <Ionicons
                    name={subcategoryMenuOpen ? "chevron-up-outline" : "chevron-down-outline"}
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {subcategoryMenuOpen ? (
                  <Modal
                    visible={subcategoryMenuOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setSubcategoryMenuOpen(false)}
                  >
                    <Pressable
                      style={styles.dropdownModalOverlay}
                      onPress={() => setSubcategoryMenuOpen(false)}
                    >
                      <Pressable style={styles.dropdownModalContent} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.dropdownMenuHeader}>
                          <Text style={styles.dropdownMenuHeaderText}>Subcategories</Text>
                          <Pressable onPress={() => setSubcategoryMenuOpen(false)}>
                            <Text style={styles.dropdownMenuDoneText}>Done</Text>
                          </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                          {availableSpecialties.map((specialty) => {
                            const selected = draft.specialtyIds.includes(specialty.id);
                            return (
                              <Pressable
                                key={specialty.id}
                                style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                                onPress={() => toggleSpecialty(specialty.id)}
                              >
                                <Ionicons
                                  name={selected ? "checkbox-outline" : "square-outline"}
                                  size={16}
                                  color={selected ? colors.primary : colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    selected && styles.dropdownItemTextSelected,
                                  ]}
                                >
                                  {specialty.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </Pressable>
                    </Pressable>
                  </Modal>
                ) : null}
              </View>
            </View>

            <View style={[styles.fieldBlock, styles.identitySectionGap]}>
              <View style={styles.labelRow}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.fieldLabel}>Legal identity (Stripe & tax)</Text>
                <InfoIcon
                  title="Why we ask"
                  body="Must match your tax documents. Used for Connect verification and compliance. Stored securely on your profile."
                />
              </View>
              <LabeledInput
                icon="id-card-outline"
                label="Full legal name"
                helper=""
                infoTitle="Legal name"
                infoBody="Exactly as on IRS or state documents — required for Stripe payouts."
                value={draft.legalName}
                onChangeText={(legalName) => setDraft((prev) => ({ ...prev, legalName }))}
                placeholder="First and last (as on tax ID)"
                autoCapitalize="words"
              />
              <LabeledInput
                icon="keypad-outline"
                label="SSN or EIN"
                helper="9 digits — US Social Security Number or Employer ID (dashes optional)."
                infoTitle="Tax ID"
                infoBody="Individuals: SSN. Business entity: EIN. This is sensitive — do not share your screen."
                value={draft.ssnOrEin}
                onChangeText={(ssnOrEin) => setDraft((prev) => ({ ...prev, ssnOrEin }))}
                placeholder="•••-••-•••• or XX-XXXXXXX"
                keyboardType="number-pad"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.fieldBlock, styles.locationSectionGap]}>
              <View style={styles.labelRow}>
                <Ionicons name="locate-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.fieldLabel}>Service address (US)</Text>
              </View>
              <View style={styles.modeSelectorRow}>
                <Pressable
                  style={[styles.modeChip, locationMode === "gps" && styles.modeChipActive]}
                  onPress={() => setLocationMode("gps")}
                >
                  <Ionicons name="navigate-outline" size={13} color={locationMode === "gps" ? "#FFFFFF" : colors.textSecondary} />
                  <Text style={[styles.modeChipText, locationMode === "gps" && styles.modeChipTextActive]}>
                    Use GPS
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeChip, locationMode === "manual" && styles.modeChipActive]}
                  onPress={() => setLocationMode("manual")}
                >
                  <Ionicons name="create-outline" size={13} color={locationMode === "manual" ? "#FFFFFF" : colors.textSecondary} />
                  <Text style={[styles.modeChipText, locationMode === "manual" && styles.modeChipTextActive]}>
                    Type address
                  </Text>
                </Pressable>
              </View>
              {locationMode === "gps" ? (
                <View style={styles.fieldBlock}>
                  <Pressable style={styles.secondaryCta} onPress={() => void detectAddressWithGps()}>
                    <Ionicons name="navigate-outline" size={13} color={colors.primary} />
                    <Text style={styles.secondaryCtaText}>Find my location with GPS</Text>
                  </Pressable>
                  {draft.gpsAddressDetected ? (
                    <View style={styles.detectedAddressBadge}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                      <Text style={styles.detectedAddressText}>{draft.gpsAddressDetected}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.fieldBlock}>
                  <TextInput
                    style={styles.input}
                    value={draft.serviceAddress}
                    onFocus={() => setAddressInputFocused(true)}
                    onBlur={() => setAddressInputFocused(false)}
                    onChangeText={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        serviceAddress: value,
                        baseLocationLat: null,
                        baseLocationLng: null,
                      }))
                    }
                    placeholder=""
                    placeholderTextColor={colors.textSecondary}
                  />
                  {searchingAddress ? (
                    <Text style={styles.helperText}>Searching addresses...</Text>
                  ) : null}
                  {predictions.length > 0 ? (
                    <View style={styles.inlineSuggestions}>
                      {predictions.map((row) => (
                        <Pressable
                          key={row.placeId}
                          style={styles.inlineSuggestionRow}
                          onPress={() => void applyPrediction(row)}
                          disabled={resolvingPlaceId === row.placeId}
                        >
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={colors.textSecondary}
                          />
                          <View style={styles.inlineSuggestionTextWrap}>
                            <Text style={styles.inlineSuggestionTitle}>{row.description}</Text>
                            {row.secondaryText ? (
                              <Text style={styles.inlineSuggestionSubtitle}>{row.secondaryText}</Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
              <View style={styles.fieldBlock}>
                <View style={styles.labelRow}>
                  <Ionicons name="resize-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.fieldLabel}>Service radius</Text>
                </View>
                <Text style={styles.radiusValueText}>
                  {radiusMiles} miles
                </Text>
                <Slider
                  style={styles.radiusSlider}
                  minimumValue={5}
                  maximumValue={100}
                  step={1}
                  value={radiusMiles}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor={colors.primary}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      serviceRadiusMiles: String(Math.round(value)),
                    }))
                  }
                />
                {canShowMap && MapViewComponent && CircleComponent ? (
                  <View style={styles.radiusMapWrap}>
                    <MapViewComponent
                      ref={radiusMapRef}
                      style={styles.radiusMap}
                      initialRegion={{
                        latitude: baseLat as number,
                        longitude: baseLng as number,
                        latitudeDelta: mapLatitudeDelta,
                        longitudeDelta: mapLongitudeDelta,
                      }}
                      scrollEnabled
                      zoomEnabled
                      rotateEnabled
                      zoomTapEnabled
                      pitchEnabled={false}
                      onPanDrag={() => setMapInteracting(true)}
                      onRegionChange={() => setMapInteracting(true)}
                      onRegionChangeComplete={() => {
                        setTimeout(() => setMapInteracting(false), 80);
                      }}
                      toolbarEnabled={false}
                      showsCompass={false}
                      showsScale={false}
                      showsUserLocation={false}
                    >
                      <CircleComponent
                        center={{ latitude: baseLat as number, longitude: baseLng as number }}
                        radius={radiusMeters}
                        fillColor="rgba(0, 122, 255, 0.1)"
                        strokeColor="#007AFF"
                        strokeWidth={2}
                      />
                    </MapViewComponent>
                  </View>
                ) : staticMapUrl ? (
                  <View style={styles.radiusMapWrap}>
                    <Image source={{ uri: staticMapUrl }} style={styles.radiusMap} resizeMode="cover" />
                  </View>
                ) : (
                  <View style={styles.radiusMapFallback}>
                    <Text style={styles.helperText}>Map preview unavailable in this build.</Text>
                  </View>
                )}
              </View>
            </View>

          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.applyStepSheet}>
            <View style={styles.trustSectionsColumn}>
              {regulatedRequired ? (
                <CollapsibleFormSection
                  iconName="document-text-outline"
                  title="Trade licenses"
                  badge="required"
                  collapsedSummary={`${formatEnglishList(regulatedSelectionRows.map((r) => r.label))} — one license block each.`}
                  expanded={trustSectionsOpen.tradeLicenses}
                  onToggle={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setTrustSectionsOpen((s) => ({ ...s, tradeLicenses: !s.tradeLicenses }));
                  }}
                >
                  {regulatedSelectionRows.map((row, index) => {
                    const tier = draft.licensesByCategoryId[row.id] ?? emptyTradeLicenseDraft();
                    const licKey = uploadKeyFor({ kind: "trade_license", categoryId: row.id });
                    return (
                      <View key={row.id} style={styles.tradeLicenseSection}>
                        {index > 0 ? <View style={styles.tradeLicenseDivider} /> : null}
                        <Text style={styles.tradeLicenseSectionTitle}>{row.label}</Text>
                        <LabeledInput
                          icon="document-text-outline"
                          label="License number"
                          helper=""
                          infoTitle="License number"
                          infoBody={`State-issued trade license number for ${row.label}.`}
                          value={tier.licenseNumber}
                          onChangeText={(value) =>
                            patchTradeLicense(row.id, {
                              licenseNumber: value,
                            })
                          }
                          placeholder=""
                        />
                        <LabeledInput
                          icon="flag-outline"
                          label="Issuing state"
                          helper=""
                          infoTitle="License state"
                          infoBody="State or board that issued this license."
                          value={tier.licenseState}
                          onChangeText={(value) =>
                            patchTradeLicense(row.id, {
                              licenseState: value,
                            })
                          }
                          placeholder=""
                        />
                        <LabeledInput
                          icon="time-outline"
                          label="Expiration date"
                          helper=""
                          infoTitle="Expiration"
                          infoBody="When this license expires."
                          value={tier.licenseExpirationDate}
                          onChangeText={(value) =>
                            patchTradeLicense(row.id, {
                              licenseExpirationDate: value,
                            })
                          }
                          placeholder=""
                        />
                        <UploadLikeField
                          icon="document-attach-outline"
                          label="License document"
                          helper=""
                          infoTitle="License document"
                          infoBody={`Readable photo or PDF of your ${row.label} license.`}
                          value={tier.licenseDocumentUrl}
                          onPick={() =>
                            pickAndUploadDocument({
                              kind: "trade_license",
                              categoryId: row.id,
                            })
                          }
                          uploading={uploadingDocs[licKey] === true}
                          isRequired
                        />
                      </View>
                    );
                  })}
                </CollapsibleFormSection>
              ) : null}

              <CollapsibleFormSection
                iconName="shield-checkmark-outline"
                title="Liability insurance"
                badge="optional"
                collapsedSummary="COI optional now — verified upload adds an Insured badge later."
                expanded={trustSectionsOpen.insurance}
                onToggle={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setTrustSectionsOpen((s) => ({ ...s, insurance: !s.insurance }));
                }}
              >
                <LabeledInput
                  icon="business-outline"
                  label="Insurance provider"
                  helper=""
                  infoTitle="Insurance provider"
                  infoBody="Your general liability carrier. Used during COI review."
                  value={draft.insuranceProvider}
                  onChangeText={(value) => setDraft({ ...draft, insuranceProvider: value })}
                  placeholder=""
                />
                <LabeledInput
                  icon="id-card-outline"
                  label="Policy number"
                  helper=""
                  infoTitle="Policy number"
                  infoBody="From your declarations page or COI."
                  value={draft.insurancePolicyNumber}
                  onChangeText={(value) => setDraft({ ...draft, insurancePolicyNumber: value })}
                  placeholder=""
                />
                <LabeledInput
                  icon="calendar-outline"
                  label="Policy expiration"
                  helper=""
                  infoTitle="Policy expiration"
                  infoBody="End date of your current term on the COI."
                  value={draft.insuranceExpirationDate}
                  onChangeText={(value) => setDraft({ ...draft, insuranceExpirationDate: value })}
                  placeholder=""
                />
                <UploadLikeField
                  icon="shield-checkmark-outline"
                  label="Certificate of Insurance (COI)"
                  helper=""
                  infoTitle="COI upload"
                  infoBody="PDF or clear photo optional now; verified files unlock the Insured badge."
                  value={draft.coiUrl}
                  onPick={() => pickAndUploadDocument({ kind: "coi" })}
                  uploading={uploadingDocs.coiUrl === true}
                />
              </CollapsibleFormSection>

              <CollapsibleFormSection
                iconName="person-outline"
                title="Identity & screening"
                badge="required"
                collapsedSummary="Government ID upload and screening confirmation."
                expanded={trustSectionsOpen.identity}
                onToggle={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setTrustSectionsOpen((s) => ({ ...s, identity: !s.identity }));
                }}
              >
                <UploadLikeField
                  icon="card-outline"
                  label="Government ID document"
                  helper=""
                  infoTitle="Government ID"
                  infoBody="Government-issued photo ID required for verification."
                  value={draft.governmentIdUrl}
                  onPick={() => pickAndUploadDocument({ kind: "governmentId" })}
                  uploading={uploadingDocs.governmentIdUrl === true}
                  isRequired
                />
                <View style={styles.checkRow}>
                  <View style={styles.declarationLabelWrap}>
                    <Text style={styles.rowLabel}>No undisclosed criminal history — required</Text>
                    <InfoIcon
                      title="Declaration"
                      body="You must confirm this declaration to submit. False statements may disqualify your account."
                    />
                  </View>
                  <Switch value={draft.criminalRecordDeclaration} onValueChange={(value) => setDraft({ ...draft, criminalRecordDeclaration: value })} trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }} />
                </View>
              </CollapsibleFormSection>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.applyStepSheet}>
            <View style={styles.trustSectionsColumn}>
              <LegalGroupCard iconName="document-text-outline" title="Terms & platform rules">
                <ReadToAcceptLegalRow
                  label="Terms of Service & Commission Policy"
                  value={draft.termsAccepted && draft.commissionAccepted}
                  onLabelPress={() => setLegalModalAgreement("termsCommission")}
                  onSwitchAttempt={(wantsOn) =>
                    handleLegalAgreementSwitch("termsCommission", wantsOn)
                  }
                />
                <View style={styles.legalCheckDivider} />
                <ReadToAcceptLegalRow
                  label="Information Accuracy Confirmation"
                  value={draft.accuracyAccepted}
                  onLabelPress={() => setLegalModalAgreement("accuracy")}
                  onSwitchAttempt={(wantsOn) =>
                    handleLegalAgreementSwitch("accuracy", wantsOn)
                  }
                />
              </LegalGroupCard>

              <LegalGroupCard iconName="briefcase-outline" title="Disclosures">
                <ReadToAcceptLegalRow
                  label="Independent Contractor Declaration"
                  value={draft.independentContractorAccepted}
                  onLabelPress={() => setLegalModalAgreement("contractor")}
                  onSwitchAttempt={(wantsOn) =>
                    handleLegalAgreementSwitch("contractor", wantsOn)
                  }
                />
                <View style={styles.legalCheckDivider} />
                <ReadToAcceptLegalRow
                  label="Insurance & Liability Disclaimer"
                  value={draft.marketplaceDisclaimerAccepted}
                  onLabelPress={() => setLegalModalAgreement("insurance")}
                  onSwitchAttempt={(wantsOn) =>
                    handleLegalAgreementSwitch("insurance", wantsOn)
                  }
                />
              </LegalGroupCard>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.applyStepSheet}>
            {stripeOnboardingStatus === "expired" ? (
              <View style={styles.warningBanner}>
                <Ionicons name="time-outline" size={15} color={colors.primary} />
                <Text style={styles.warningBannerText}>
                  Your previous Stripe onboarding expired. Start again below.
                </Text>
              </View>
            ) : null}
            <Text style={styles.stripeWhyCopy}>
              We use Stripe to pay you quickly and securely. Stripe handles bank details—we never store them in
              FixIT. You’ll open Stripe’s portal in your browser for setup.
            </Text>
            <Pressable
              style={[styles.connectStripeButton, connectingStripe && styles.disabled]}
              onPress={() => void openStripeConnect()}
              disabled={connectingStripe}
            >
              <Ionicons name="open-outline" size={15} color="#FFFFFF" />
              <Text style={styles.connectStripeButtonText}>
                {connectingStripe
                  ? "Opening Stripe..."
                  : stripeOnboardingStatus === "expired"
                    ? "Restart Stripe onboarding"
                    : "Connect with Stripe"}
              </Text>
            </Pressable>
            <View
              style={[
                styles.stripeAccountIdWrap,
                stripePayableReady && styles.stripeAccountIdWrapSuccess,
                stripeVerification === "valid" && !stripePayableReady && styles.stripeAccountIdWrapPayoutPending,
                stripeVerification === "invalid" && styles.stripeAccountIdWrapInvalid,
                stripeVerification === "wrong_format" && styles.stripeAccountIdWrapInvalid,
              ]}
            >
              <View style={styles.stripeAccountIdHeader}>
                <Ionicons
                  name="logo-usd"
                  size={16}
                  color={
                    stripePayableReady
                      ? "#15803D"
                      : stripeVerification === "valid" && !stripePayableReady
                        ? "#B45309"
                        : stripeVerification === "invalid" || stripeVerification === "wrong_format"
                          ? "#B91C1C"
                          : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.fieldLabel,
                    stripePayableReady && styles.stripeAccountIdLabelSuccess,
                    stripeVerification === "valid" && !stripePayableReady && styles.stripeAccountIdLabelPending,
                  ]}
                >
                  Stripe account ID
                </Text>
                {stripeVerification === "checking" ? (
                  <View style={styles.stripeLinkedPillNeutral}>
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                    <Text style={styles.stripeLinkedPillNeutralText}>Checking…</Text>
                  </View>
                ) : stripePayableReady ? (
                  <View style={styles.stripeLinkedPill}>
                    <Ionicons name="checkmark-circle" size={15} color="#15803D" />
                    <Text style={styles.stripeLinkedPillText}>Payouts enabled</Text>
                  </View>
                ) : stripeVerification === "valid" ? (
                  <View style={styles.stripeLinkedPillPayoutPending}>
                    <Ionicons name="shield-checkmark-outline" size={15} color="#B45309" />
                    <Text style={styles.stripeLinkedPillPayoutPendingText}>Verified · payouts pending</Text>
                  </View>
                ) : stripeVerification === "invalid" || stripeVerification === "wrong_format" ? (
                  <View style={styles.stripeLinkedPillWarning}>
                    <Ionicons name="alert-circle" size={15} color="#B91C1C" />
                    <Text style={styles.stripeLinkedPillWarningText}>Not verified</Text>
                  </View>
                ) : (
                  <InfoIcon
                    title="Stripe account ID"
                    body="We confirm this Connect account belongs to your login (Stripe lookup). If Stripe hasn’t approved payouts yet, you can still submit—your application is queued and Firestore updates when payouts turn on."
                  />
                )}
              </View>
              <Text style={styles.stripeSupportOnlyNote}>
                Support use only — manual entry unless our team instructed you.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  stripePayableReady && styles.stripeAccountInputSuccess,
                ]}
                value={draft.stripeAccountId}
                onChangeText={(value) => setDraft({ ...draft, stripeAccountId: value })}
                placeholder={stripeVerification === "valid" || stripePayableReady ? "" : "Filled after Stripe Connect (acct_…)"}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {stripeVerifyDetail ? (
                <Text
                  style={[
                    styles.stripeVerifyDetailText,
                    stripeVerification === "invalid" || stripeVerification === "wrong_format"
                      ? styles.stripeVerifyDetailTextError
                      : null,
                  ]}
                >
                  {stripeVerifyDetail}
                </Text>
              ) : null}
              {stripeVerification === "valid" && stripeVerifyMeta && !stripePayableReady ? (
                <Text style={styles.stripeOnboardingReminder}>
                  Your Connect account matches your FixIT login. Stripe may still be reviewing payout setup—in that case
                  you can <Text style={styles.thankYouMessageEmphasis}>submit your application now</Text>; we store the
                  current status on your profile and update automatically via Stripe when payouts go live.
                  Optionally open Connect again anytime until you see{" "}
                  <Text style={styles.thankYouMessageEmphasis}>Payouts enabled</Text> here.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <LegalAgreementReadModal
        visible={legalModalAgreement !== null}
        agreement={legalModalAgreement}
        onClose={() => setLegalModalAgreement(null)}
        onConfirmAccept={() => {
          if (legalModalAgreement) {
            applyLegalAgreementFromModal(legalModalAgreement);
          }
        }}
      />

      <View style={styles.stickyFooter}>
        {step === 2 && legalReadHint ? (
          <View style={styles.legalReadHintBar}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.legalReadHintText}>{legalReadHint}</Text>
          </View>
        ) : null}
        {stepBlockingError ? (
          <View style={styles.nextBlockedHintBar}>
            <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
            <Text style={styles.nextBlockedHintText}>{stepBlockingError}</Text>
          </View>
        ) : null}
        {finalizeFooterHint ? (
          <View style={[styles.nextBlockedHintBar, styles.submitBlockedHintBar]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.nextBlockedHintText}>{finalizeFooterHint}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          <Pressable style={[styles.secondaryButton, step === 0 && styles.disabled]} onPress={previous} disabled={step === 0}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          {step < STEP_TITLES.length - 1 ? (
            <Pressable
              style={[styles.primaryButton, currentStepBlocksNext && styles.disabled]}
              onPress={next}
              disabled={currentStepBlocksNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryButton, finalizeSubmitBlocked && styles.disabled]}
              onPress={() => void submit()}
              disabled={finalizeSubmitBlocked}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? "Submitting..."
                  : hasPendingUploads
                    ? "Finishing uploads..."
                    : "Finish & submit application"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/** Grouped agreements (always visible—no collapsing so nothing is overlooked). */
function LegalGroupCard({
  iconName,
  title,
  children,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.collapsibleCard}>
      <View style={styles.legalStaticHeader}>
        <View style={styles.collapsibleIconBubble}>
          <Ionicons name={iconName} size={17} color={colors.primary} />
        </View>
        <View style={styles.collapsibleHeaderMain}>
          <View style={styles.legalStaticTitleRow}>
            <Text style={styles.collapsibleSectionTitle}>{title}</Text>
            <View style={styles.legalSectionBadgeOutline}>
              <Text style={styles.legalSectionBadgeOutlineLabel}>Required</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.collapsibleBody}>{children}</View>
    </View>
  );
}

function CollapsibleFormSection({
  iconName,
  title,
  badge,
  collapsedSummary,
  expandedHint,
  expanded,
  onToggle,
  children,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  badge: "required" | "optional";
  collapsedSummary?: string;
  expandedHint?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const badgeLabels = { required: "Required", optional: "Optional" };

  return (
    <View style={styles.collapsibleCard}>
      <Pressable style={styles.collapsibleHeader} onPress={onToggle} accessibilityRole="button">
        <View style={styles.collapsibleIconBubble}>
          <Ionicons name={iconName} size={17} color={colors.primary} />
        </View>
        <View style={styles.collapsibleHeaderMain}>
          <View style={styles.collapsibleTitleLine}>
            <Text style={styles.collapsibleSectionTitle}>{title}</Text>
            <View style={styles.legalSectionBadgeOutline}>
              <Text style={styles.legalSectionBadgeOutlineLabel}>{badgeLabels[badge]}</Text>
            </View>
          </View>
          {!expanded && collapsedSummary ? (
            <Text style={styles.collapsibleSummaryMuted} numberOfLines={3}>
              {collapsedSummary}
            </Text>
          ) : expanded && expandedHint ? (
            <Text style={styles.collapsibleSummaryMuted}>{expandedHint}</Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

function CheckRow({
  label,
  value,
  onChange,
  variant = "standalone",
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** `embedded`: no outer border — for grouped agreement lists inside cards. */
  variant?: "standalone" | "embedded";
}) {
  const switchEl = (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
    />
  );

  return (
    <View style={variant === "embedded" ? styles.checkRowEmbedded : styles.checkRow}>
      <Text style={variant === "embedded" ? styles.rowLabelAgreement : styles.rowLabel}>{label}</Text>
      <View style={styles.switchCompactClip}>
        <View style={styles.switchCompactInner}>{switchEl}</View>
      </View>
    </View>
  );
}

/** Opens full agreement in a modal — switch must accept via modal first. */
function ReadToAcceptLegalRow({
  label,
  value,
  onLabelPress,
  onSwitchAttempt,
}: {
  label: string;
  value: boolean;
  onLabelPress: () => void;
  onSwitchAttempt: (wantsOn: boolean) => void;
}) {
  return (
    <View style={styles.checkRowEmbedded}>
      <Pressable
        onPress={onLabelPress}
        style={styles.readToAcceptLabelPressable}
        accessibilityRole="button"
        accessibilityLabel={`Read agreement: ${label}`}
      >
        <Text style={styles.rowLabelAgreementLink}>{label}</Text>
        <Ionicons name="open-outline" size={14} color="#007AFF" style={styles.readToAcceptLinkChevron} />
      </Pressable>
      <View style={styles.switchCompactClip}>
        <View style={styles.switchCompactInner}>
          <Switch
            value={value}
            onValueChange={onSwitchAttempt}
            trackColor={{ false: colors.woltIconWell, true: colors.switchTrackOn }}
          />
        </View>
      </View>
    </View>
  );
}

function LegalAgreementReadModal({
  visible,
  agreement,
  onClose,
  onConfirmAccept,
}: {
  visible: boolean;
  agreement: ProLegalAgreementId | null;
  onClose: () => void;
  onConfirmAccept: () => void;
}) {
  const meta = agreement ? PRO_LEGAL_AGREEMENT_COPY[agreement] : null;

  return (
    <Modal
      visible={visible && Boolean(meta)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.legalModalOuter}>
        <Pressable style={styles.legalModalBackdropTap} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.legalModalSheet}>
          <View style={styles.legalModalHeader}>
            <Text style={styles.legalModalTitle} numberOfLines={2}>
              {meta?.modalTitle ?? ""}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.legalModalCloseBubble}
              accessibilityLabel="Close agreement"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.legalModalScroll}
            contentContainerStyle={styles.legalModalScrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.legalModalBody}>{meta?.body ?? ""}</Text>
          </ScrollView>
          <Pressable
            style={styles.legalModalAcceptButton}
            onPress={() => {
              if (meta) {
                onConfirmAccept();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="I Read and Accept"
          >
            <Text style={styles.legalModalAcceptButtonText}>I Read and Accept</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LabeledInput({
  label,
  helper,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  infoTitle,
  infoBody,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  infoTitle?: string;
  infoBody?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={14} color={colors.textSecondary} />
        <Text style={styles.fieldLabel}>{label}</Text>
        {infoTitle && infoBody ? <InfoIcon title={infoTitle} body={infoBody} /> : null}
      </View>
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || undefined}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
      />
    </View>
  );
}

function UploadLikeField({
  label,
  helper,
  icon,
  value,
  onPick,
  uploading,
  isRequired = false,
  infoTitle,
  infoBody,
}: {
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPick: () => void;
  uploading: boolean;
  isRequired?: boolean;
  infoTitle?: string;
  infoBody?: string;
}) {
  const hasValue = value.trim().length > 0;
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={14} color={colors.textSecondary} />
        <Text style={styles.fieldLabel}>{label}</Text>
        {infoTitle && infoBody ? <InfoIcon title={infoTitle} body={infoBody} /> : null}
      </View>
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      <Pressable style={styles.uploadMock} onPress={onPick} disabled={uploading}>
        <Ionicons
          name={uploading ? "sync-outline" : hasValue ? "checkmark-circle-outline" : "cloud-upload-outline"}
          size={16}
          color={hasValue ? colors.primary : colors.textSecondary}
        />
        <Text style={styles.uploadMockText}>
          {uploading ? "Uploading..." : hasValue ? "Replace document" : "Take photo or upload document"}
        </Text>
      </Pressable>
      {hasValue ? (
        <View style={styles.uploadPreviewRow}>
          <Image source={{ uri: value }} style={styles.uploadPreviewImage} resizeMode="cover" />
          <Pressable
            style={styles.viewDocButton}
            onPress={() => {
              void Linking.openURL(value);
            }}
          >
            <Text style={styles.viewDocButtonText}>View document</Text>
          </Pressable>
        </View>
      ) : isRequired ? (
        <Text style={styles.uploadStatusText}>Required</Text>
      ) : null}
    </View>
  );
}

function InfoIcon({ title, body }: { title: string; body: string }) {
  return (
    <Pressable onPress={() => Alert.alert(title, body)} hitSlop={8}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  applyHydrationLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  applyHydrationLoadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: "System",
    textAlign: "center",
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 150,
    gap: spacing.lg,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: "#ECECEC", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.primary },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "System",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  progressPct: { color: colors.textSecondary, fontSize: 12, fontFamily: "System", fontWeight: "700" },
  progressTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "System",
    fontWeight: "800",
    textAlign: "center",
  },
  progressSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "System",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    marginTop: -4,
  },
  applyStepSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  fieldBlock: { gap: 8, marginBottom: spacing.md },
  identitySectionGap: { marginTop: spacing.md },
  locationSectionGap: { marginTop: spacing.md },
  nextBlockedHintBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FDE68A",
  },
  nextBlockedHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: "System",
  },
  submitBlockedHintBar: {
    backgroundColor: "#F3F4F6",
    borderColor: colors.border,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: { color: colors.textPrimary, fontSize: 16, fontFamily: "System" },
  fieldHelper: { color: colors.textSecondary, fontSize: 15, lineHeight: 20, fontFamily: "System" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    backgroundColor: "#FFFFFF",
  },
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    backgroundColor: "transparent",
  },
  checkRowEmbedded: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  rowLabel: { flex: 1, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: "System", fontWeight: "600" },
  rowLabelAgreement: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "System",
    fontWeight: "600",
    paddingRight: spacing.sm,
  },
  declarationLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  helperText: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, fontFamily: "System" },
  modeSelectorRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    minHeight: 0,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeChipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: "System",
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: "#FFFFFF",
  },
  detectedAddressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detectedAddressText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: "System",
  },
  radiusValueText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: "System",
    fontWeight: "600",
  },
  radiusSlider: {
    height: 24,
    transform: [{ scaleY: 0.82 }],
  },
  radiusMapWrap: {
    marginTop: spacing.xs,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  radiusMap: {
    width: "100%",
    height: 250,
  },
  radiusMapFallback: {
    marginTop: spacing.xs,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: "#FFFFFF",
  },
  inlineSuggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  inlineSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inlineSuggestionTextWrap: {
    flex: 1,
    gap: 2,
  },
  inlineSuggestionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: "System",
  },
  inlineSuggestionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "System",
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
  },
  secondaryCtaText: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: "System",
    fontWeight: "600",
  },
  uploadMock: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D4D4D4",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSoft,
  },
  uploadMockText: { color: colors.textSecondary, fontSize: 14, fontFamily: "System", fontWeight: "600" },
  uploadPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  uploadPreviewImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  viewDocButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  viewDocButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: "System",
    fontWeight: "700",
  },
  uploadStatusText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: "System",
  },
  trustSectionsColumn: {
    gap: spacing.md,
  },
  legalSectionBadgeOutline: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignSelf: "flex-start",
  },
  legalSectionBadgeOutlineLabel: {
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.28,
    textTransform: "uppercase" as const,
  },
  switchCompactClip: {
    width: 46,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  switchCompactInner: {
    transform: [{ scaleX: 0.74 }, { scaleY: 0.74 }],
  },
  legalStaticHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.rowWash,
  },
  legalStaticTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  legalCheckDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  collapsibleCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.rowWash,
  },
  collapsibleIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  collapsibleHeaderMain: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  collapsibleTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  collapsibleSectionTitle: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: "System",
    fontWeight: "800",
  },
  collapsibleSummaryMuted: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "System",
  },
  collapsibleBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  tradeLicenseSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  tradeLicenseDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  tradeLicenseSectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: "System",
    fontWeight: "800",
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: "System",
    flex: 1,
    marginRight: spacing.sm,
  },
  dropdownWrap: {
    position: "relative",
    zIndex: 20,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  dropdownModalContent: {
    width: "100%",
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  dropdownMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: "#FAFAFA",
  },
  dropdownMenuHeaderText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: "System",
  },
  dropdownMenuDoneText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: "System",
    fontWeight: "700",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: "transparent",
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: "System",
  },
  dropdownItemTextSelected: {
    color: colors.textPrimary,
  },
  dropdownEmpty: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  connectStripeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
  },
  connectStripeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "700",
  },
  stripeWhyCopy: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "System",
    textAlign: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  stripeAccountIdWrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5E5",
    backgroundColor: colors.surfaceSoft,
  },
  stripeAccountIdWrapSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  stripeAccountIdHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stripeAccountIdLabelSuccess: {
    color: "#14532D",
    fontWeight: "700",
  },
  stripeLinkedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#D1FAE5",
  },
  stripeLinkedPillText: {
    fontSize: 12,
    fontFamily: "System",
    fontWeight: "800",
    color: "#047857",
  },
  stripeAccountIdWrapPayoutPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  stripeAccountIdLabelPending: {
    color: "#92400E",
    fontWeight: "700",
  },
  stripeLinkedPillPayoutPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FCD34D",
  },
  stripeLinkedPillPayoutPendingText: {
    fontSize: 12,
    fontFamily: "System",
    fontWeight: "800",
    color: "#B45309",
  },
  stripeLinkedPillNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stripeLinkedPillNeutralText: {
    fontSize: 12,
    fontFamily: "System",
    fontWeight: "700",
    color: colors.textSecondary,
  },
  stripeLinkedPillWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECACA",
  },
  stripeLinkedPillWarningText: {
    fontSize: 12,
    fontFamily: "System",
    fontWeight: "800",
    color: "#B91C1C",
  },
  stripeAccountIdWrapInvalid: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  stripeVerifyDetailText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: "System",
  },
  stripeVerifyDetailTextError: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  stripeOnboardingReminder: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: "System",
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  stripeSupportOnlyNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: "System",
    fontStyle: "italic",
  },
  stripeAccountInputSuccess: {
    backgroundColor: "#FFFFFF",
    borderColor: "#86EFAC",
  },
  thankYouBody: {
    justifyContent: "center",
    flexGrow: 1,
    paddingVertical: spacing.xxl,
  },
  thankYouIconBubble: {
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  thankYouTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "System",
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  thankYouMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    fontFamily: "System",
    textAlign: "center",
  },
  thankYouMessageEmphasis: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  thankYouFooterButton: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  warningBannerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "System",
    fontWeight: "600",
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  legalReadHintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  legalReadHintText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "System",
    fontWeight: "600",
  },
  readToAcceptLabelPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    minWidth: 0,
  },
  readToAcceptLinkChevron: { marginTop: 1 },
  rowLabelAgreementLink: {
    flexShrink: 1,
    color: "#007AFF",
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "System",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  legalModalOuter: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  legalModalBackdropTap: {
    flex: 1,
    width: "100%",
  },
  legalModalSheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: Platform.select({ ios: 28, android: 14, default: 16 }),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  legalModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  legalModalTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "System",
    fontWeight: "800",
  },
  legalModalCloseBubble: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  legalModalScroll: {
    maxHeight: 420,
  },
  legalModalScrollContent: {
    paddingBottom: spacing.md,
  },
  legalModalBody: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "System",
  },
  legalModalAcceptButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  legalModalAcceptButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "800",
  },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontFamily: "System", fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 15, fontFamily: "System", fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
