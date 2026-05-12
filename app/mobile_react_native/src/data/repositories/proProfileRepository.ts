import {
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  collection,
  deleteField,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { categoryLabelFromId } from "@/features/home/data/categoryCatalog";
import type { PortfolioAlbum } from "@/features/home/types/serviceListing";
import {
  MAX_ITEMS_PER_PORTFOLIO_ALBUM,
  MAX_PORTFOLIO_ALBUMS,
} from "@/features/home/utils/portfolioAlbums";
import { isRegulatedCategoryId } from "@/features/pro/data/regulatedCategoryIds";
import { getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from "@/shared/firebase/client";
import { ensureCustomerFirebaseSession } from "@/shared/firebase/ensureCustomerSession";
import { portfolioAlbumsFromFirestore } from "@/data/repositories/discoveryRepository";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

/** Hero carousel (max widths enforced in UI; customer hero clamps again). */
export type MyProShowcaseHero = {
  imageUrls: string[];
  video?: { url: string; posterUrl?: string };
};

export type MyProProfile = {
  title: string;
  subtitle: string;
  categoryIds: string[];
  eta: string;
  fee: string;
  imageUrl: string;
  /** Long-form story — customer profile “Bio”. */
  bio: string;
  showcaseHero: MyProShowcaseHero | null;
  portfolioAlbums: PortfolioAlbum[];
  isActive: boolean;
  verificationStatus: "pending_approval" | "approved" | "rejected";
  isLicensed: boolean;
  isInsured: boolean;
  adminNotes: string;
};

export type IncomingRequestRow = {
  id: string;
  title: string;
  details: string;
  categoryId: string | null;
  urgency: "standard" | "urgent";
  createdAt: number;
};

export type ProVerificationStatus = "pending_approval" | "approved" | "rejected";
export type StripeOnboardingStatus =
  | "not_started"
  | "created"
  | "pending"
  /** Set by Stripe webhook when onboarding details were submitted (`account.updated`). */
  | "submitted"
  | "completed"
  | "expired";

export type BackgroundCheckStatus =
  | "not_started"
  | "pending"
  | "clear"
  | "flagged";

/** License packet for one regulated trade (category id matches `regulatedCategoryIds`). */
export type TradeLicenseDraft = {
  licenseNumber: string;
  licenseState: string;
  licenseExpirationDate: string;
  licenseDocumentUrl: string;
};

export type ProApplicationDraft = {
  legalName: string;
  dateOfBirth: string;
  serviceAddress: string;
  ssnOrEin: string;
  governmentIdUrl: string;
  categoryIds: string[];
  specialtyIds: string[];
  baseLocationLat: number | null;
  baseLocationLng: number | null;
  serviceRadiusMiles: string;
  coverageMode: "all_areas" | "selected_areas";
  serviceAreasText: string;
  gpsAddressDetected: string;
  /** Keys are regulated category ids (e.g. `electrician`); omit or empty when no regulated selections. */
  licensesByCategoryId: Record<string, TradeLicenseDraft>;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpirationDate: string;
  coiUrl: string;
  criminalRecordDeclaration: boolean;
  stripeAccountId: string;
  termsAccepted: boolean;
  commissionAccepted: boolean;
  accuracyAccepted: boolean;
  independentContractorAccepted: boolean;
  marketplaceDisclaimerAccepted: boolean;
};

const DEFAULT_PRO_PROFILE: MyProProfile = {
  title: "",
  subtitle: "",
  categoryIds: [],
  eta: "15 min",
  fee: "$55",
  imageUrl: "",
  bio: "",
  showcaseHero: null,
  portfolioAlbums: [],
  isActive: true,
  verificationStatus: "pending_approval",
  isLicensed: false,
  isInsured: false,
  adminNotes: "",
};

function clampPortfolioAlbumsForStore(albums: PortfolioAlbum[]): PortfolioAlbum[] {
  return albums.slice(0, MAX_PORTFOLIO_ALBUMS).map((a) => ({
    ...a,
    items: a.items.slice(0, MAX_ITEMS_PER_PORTFOLIO_ALBUM),
  }));
}

function parseShowcaseHeroFromDoc(d: Record<string, unknown>): MyProShowcaseHero | null {
  const raw = d.showcaseHero ?? d.showcase_hero;
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  const imageUrls = Array.isArray(h.imageUrls)
    ? h.imageUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim())
    : [];
  const vraw = h.video;
  let video: { url: string; posterUrl?: string } | undefined;
  if (vraw && typeof vraw === "object") {
    const v = vraw as Record<string, unknown>;
    const url = typeof v.url === "string" ? v.url.trim() : "";
    if (url) {
      video = {
        url,
        posterUrl: typeof v.posterUrl === "string" ? v.posterUrl.trim() : undefined,
      };
    }
  }
  if (imageUrls.length === 0 && !video) return null;
  return { imageUrls, ...(video ? { video } : {}) };
}

export function emptyTradeLicenseDraft(): TradeLicenseDraft {
  return {
    licenseNumber: "",
    licenseState: "",
    licenseExpirationDate: "",
    licenseDocumentUrl: "",
  };
}

/** Keep map aligned with regulated selections (add empty rows / drop deselected). */
export function syncLicensesByCategoryIds(
  categoryIds: string[],
  current: Record<string, TradeLicenseDraft>,
): Record<string, TradeLicenseDraft> {
  const regulated = categoryIds.filter((id) => isRegulatedCategoryId(id));
  const next: Record<string, TradeLicenseDraft> = {};
  for (const id of regulated) {
    next[id] = current[id] ? { ...current[id] } : emptyTradeLicenseDraft();
  }
  return next;
}

export const DEFAULT_PRO_APPLICATION_DRAFT: ProApplicationDraft = {
  legalName: "",
  dateOfBirth: "",
  serviceAddress: "",
  ssnOrEin: "",
  governmentIdUrl: "",
  categoryIds: [],
  specialtyIds: [],
  baseLocationLat: null,
  baseLocationLng: null,
  serviceRadiusMiles: "25",
  coverageMode: "selected_areas",
  serviceAreasText: "",
  gpsAddressDetected: "",
  licensesByCategoryId: {},
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceExpirationDate: "",
  coiUrl: "",
  criminalRecordDeclaration: false,
  stripeAccountId: "",
  termsAccepted: false,
  commissionAccepted: false,
  accuracyAccepted: false,
  independentContractorAccepted: false,
  marketplaceDisclaimerAccepted: false,
};

async function currentUid(): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No Firebase user session.");
  return uid;
}

/** Whether this user already has a `pro_profiles/{uid}` document (any verification state). */
export async function proProfileRecordExists(): Promise<boolean> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return false;
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, "pro_profiles", uid));
  return snap.exists();
}

export async function loadMyProProfile(): Promise<MyProProfile> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_PRO_PROFILE;
  const d = snap.data() as Record<string, unknown>;
  const rawStatus = asString(d.verification_status);
  const verificationStatus: ProVerificationStatus =
    rawStatus === "approved"
      ? "approved"
      : rawStatus === "rejected"
        ? "rejected"
        : "pending_approval";
  const storedAlbums = portfolioAlbumsFromFirestore(d.portfolioAlbums) ?? [];

  return {
    title: asString(d.title, DEFAULT_PRO_PROFILE.title),
    subtitle: asString(d.subtitle, DEFAULT_PRO_PROFILE.subtitle),
    categoryIds: Array.isArray(d.categoryIds)
      ? d.categoryIds.filter((v): v is string => typeof v === "string")
      : [],
    eta: asString(d.eta, DEFAULT_PRO_PROFILE.eta),
    fee: asString(d.fee, DEFAULT_PRO_PROFILE.fee),
    imageUrl: asString(d.imageUrl),
    bio:
      typeof d.bio === "string" && d.bio.trim().length > 0
        ? d.bio.trim()
        : DEFAULT_PRO_PROFILE.bio,
    showcaseHero: parseShowcaseHeroFromDoc(d),
    portfolioAlbums: clampPortfolioAlbumsForStore(storedAlbums),
    isActive: d.isActive !== false,
    verificationStatus,
    isLicensed: asBoolean(d.is_licensed),
    isInsured: asBoolean(d.is_insured),
    adminNotes: asString(d.admin_notes),
  };
}

export async function saveMyProProfile(input: MyProProfile): Promise<void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  /** Only storefront fields — never overwrite admin verification (`verification_status`, badges, notes). */
  const hero =
    input.showcaseHero &&
    (input.showcaseHero.imageUrls.length > 0 || input.showcaseHero.video?.url?.trim())
      ? {
          imageUrls: input.showcaseHero.imageUrls.filter((u) => u.trim().length > 0),
          ...(input.showcaseHero.video?.url?.trim()
            ? {
                video: {
                  url: input.showcaseHero.video.url.trim(),
                  ...(input.showcaseHero.video.posterUrl?.trim()
                    ? { posterUrl: input.showcaseHero.video.posterUrl.trim() }
                    : {}),
                },
              }
            : {}),
        }
      : null;

  await setDoc(
    ref,
    {
      ownerId: uid,
      title: input.title,
      subtitle: input.subtitle,
      categoryIds: input.categoryIds,
      eta: input.eta,
      fee: input.fee,
      imageUrl: input.imageUrl,
      bio: input.bio.trim(),
      showcaseHero: hero ?? deleteField(),
      portfolioAlbums: clampPortfolioAlbumsForStore(input.portfolioAlbums),
      isActive: input.isActive,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Persist trade license packets (`licensesByCategoryId`) for regulated categories.
 * Merges into `compliance_private` and `application_draft` so apply validation and ops review stay aligned.
 */
export async function saveComplianceLicenses(
  licensesByCategoryId: Record<string, TradeLicenseDraft>,
): Promise<void> {
  await ensureCustomerFirebaseSession();
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_compliance", uid);
  const publicRef = doc(db, "pro_profiles", uid);
  const [snap, publicSnap] = await Promise.all([getDoc(ref), getDoc(publicRef)]);
  const existing = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
  const publicExisting = publicSnap.exists()
    ? (publicSnap.data() as Record<string, unknown>)
    : {};
  const compliance = {
    ...((publicExisting.compliance_private as Record<string, unknown>) ?? {}),
    ...((existing.compliance_private as Record<string, unknown>) ?? {}),
  };
  const draftObj = {
    ...((publicExisting.application_draft as Record<string, unknown>) ?? {}),
    ...((existing.application_draft as Record<string, unknown>) ?? {}),
  };

  await setDoc(
    ref,
    {
      ownerId: uid,
      compliance_private: {
        ...compliance,
        licensesByCategoryId,
      },
      application_draft: {
        ...draftObj,
        licensesByCategoryId,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(publicRef, { ownerId: uid, updatedAt: serverTimestamp() }, { merge: true });
}

/** Upload one trade license document (same Storage path pattern as provider apply). */
export async function uploadTradeLicenseDocument(
  categoryId: string,
  localUri: string,
  contentType?: string,
): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No signed-in user.");
  const safeCat = categoryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "trade";
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storage = getFirebaseStorage();
  const objectRef = ref(
    storage,
    `applications/${uid}/trade-license-${safeCat}-${Date.now()}.jpg`,
  );
  await uploadBytes(objectRef, blob, {
    contentType: contentType || blob.type || "image/jpeg",
  });
  return getDownloadURL(objectRef);
}

/** Authenticated pros upload portfolio visuals under `portfolio/{uid}/`. */
export async function uploadMyProPortfolioImage(
  localUri: string,
  filePrefix: string,
): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No signed-in user.");

  const response = await fetch(localUri);
  const blob = await response.blob();
  const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "img";
  const storage = getFirebaseStorage();
  const objectRef = ref(storage, `portfolio/${uid}/${safePrefix}-${Date.now()}.jpg`);
  await uploadBytes(objectRef, blob, {
    contentType: blob.type || "image/jpeg",
  });
  return getDownloadURL(objectRef);
}

/** Authenticated pros upload one short hero video shown in the public profile carousel. */
export async function uploadMyProShowcaseVideo(localUri: string): Promise<string> {
  await ensureCustomerFirebaseSession();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("No signed-in user.");

  const response = await fetch(localUri);
  const blob = await response.blob();
  const storage = getFirebaseStorage();
  const objectRef = ref(storage, `pro_videos/${uid}/showcase-${Date.now()}.mp4`);
  await uploadBytes(objectRef, blob, {
    contentType: blob.type || "video/mp4",
  });
  return getDownloadURL(objectRef);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseTradeLicense(value: unknown): TradeLicenseDraft {
  if (!value || typeof value !== "object") return emptyTradeLicenseDraft();
  const o = value as Record<string, unknown>;
  return {
    licenseNumber: asString(o.licenseNumber),
    licenseState: asString(o.licenseState),
    licenseExpirationDate: asString(o.licenseExpirationDate),
    licenseDocumentUrl: asString(o.licenseDocumentUrl),
  };
}

function parseLicensesMapFromUnknown(raw: unknown): Record<string, TradeLicenseDraft> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, TradeLicenseDraft> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!isRegulatedCategoryId(key)) continue;
    out[key] = parseTradeLicense(val);
  }
  return out;
}

function buildPublicLicenseNumber(draft: ProApplicationDraft): string | null {
  const parts: string[] = [];
  for (const id of draft.categoryIds) {
    if (!isRegulatedCategoryId(id)) continue;
    const L = draft.licensesByCategoryId[id] ?? emptyTradeLicenseDraft();
    const n = L.licenseNumber.trim();
    if (!n) continue;
    const lab = categoryLabelFromId(id) ?? id;
    parts.push(`${lab}: ${n}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Remove pre–per-trade flat compliance fields when migrating to licensesByCategoryId. */
function complianceDeletesForLegacyFlatLicense() {
  return {
    licenseNumber: deleteField(),
    licenseState: deleteField(),
    licenseExpirationDate: deleteField(),
    licenseDocumentUrl: deleteField(),
  };
}

export async function loadMyProApplicationDraft(): Promise<ProApplicationDraft> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  const privateRef = doc(db, "pro_compliance", uid);
  const [snap, privateSnap] = await Promise.all([getDoc(ref), getDoc(privateRef)]);
  if (!snap.exists() && !privateSnap.exists()) return DEFAULT_PRO_APPLICATION_DRAFT;
  const d = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
  const privateDoc = privateSnap.exists() ? (privateSnap.data() as Record<string, unknown>) : {};
  const compliance =
    (privateDoc.compliance_private as Record<string, unknown> | undefined) ??
    (d.compliance_private as Record<string, unknown> | undefined) ??
    {};
  const draftObj =
    (privateDoc.application_draft as Record<string, unknown> | undefined) ??
    (d.application_draft as Record<string, unknown> | undefined) ??
    {};
  const pick = (key: keyof ProApplicationDraft | string): unknown => {
    if (key in draftObj) return draftObj[key as string];
    if (key in compliance) return compliance[key as string];
    if (key in privateDoc) return privateDoc[key as string];
    return d[key as string];
  };
  const categoryIds = Array.isArray(pick("categoryIds"))
    ? (pick("categoryIds") as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const nestedMap = parseLicensesMapFromUnknown(
    (draftObj as Record<string, unknown>).licensesByCategoryId ?? compliance.licensesByCategoryId,
  );
  const regulated = categoryIds.filter((id) => isRegulatedCategoryId(id));
  const legacyNum = asString(pick("licenseNumber")).trim();
  const legacyDoc = asString(pick("licenseDocumentUrl")).trim();
  const legacyHas = legacyNum.length > 0 || legacyDoc.length > 0;
  let licensesByCategoryId = syncLicensesByCategoryIds(categoryIds, nestedMap);
  if (regulated.length > 0 && legacyHas && Object.keys(nestedMap).length === 0) {
    const legacy: TradeLicenseDraft = {
      licenseNumber: asString(pick("licenseNumber")),
      licenseState: asString(pick("licenseState")),
      licenseExpirationDate: asString(pick("licenseExpirationDate")),
      licenseDocumentUrl: asString(pick("licenseDocumentUrl")),
    };
    const seeded: Record<string, TradeLicenseDraft> = {};
    for (const id of regulated) seeded[id] = { ...legacy };
    licensesByCategoryId = syncLicensesByCategoryIds(categoryIds, seeded);
  }
  return {
    legalName: asString(pick("legalName")),
    dateOfBirth: asString(pick("dateOfBirth")),
    serviceAddress: asString(pick("serviceAddress")),
    ssnOrEin: asString(pick("ssnOrEin")),
    governmentIdUrl: asString(pick("governmentIdUrl")),
    categoryIds,
    specialtyIds: Array.isArray(pick("specialtyIds"))
      ? (pick("specialtyIds") as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
    baseLocationLat:
      typeof pick("baseLocationLat") === "number" &&
      Number.isFinite(pick("baseLocationLat") as number)
        ? (pick("baseLocationLat") as number)
        : null,
    baseLocationLng:
      typeof pick("baseLocationLng") === "number" &&
      Number.isFinite(pick("baseLocationLng") as number)
        ? (pick("baseLocationLng") as number)
        : null,
    serviceRadiusMiles: asString(pick("serviceRadiusMiles"), "25"),
    coverageMode:
      pick("coverageMode") === "all_areas" || pick("coverageMode") === "selected_areas"
        ? (pick("coverageMode") as "all_areas" | "selected_areas")
        : "selected_areas",
    serviceAreasText: asString(pick("serviceAreasText")),
    gpsAddressDetected: asString(pick("gpsAddressDetected")),
    licensesByCategoryId,
    insuranceProvider: asString(pick("insuranceProvider")),
    insurancePolicyNumber: asString(pick("insurancePolicyNumber")),
    insuranceExpirationDate: asString(pick("insuranceExpirationDate")),
    coiUrl: asString(pick("coiUrl")),
    criminalRecordDeclaration: asBoolean(pick("criminalRecordDeclaration")),
    stripeAccountId: asString(pick("stripeAccountId")),
    termsAccepted: asBoolean(pick("termsAccepted")),
    commissionAccepted: asBoolean(pick("commissionAccepted")),
    accuracyAccepted: asBoolean(pick("accuracyAccepted")),
    independentContractorAccepted: asBoolean(pick("independentContractorAccepted")),
    marketplaceDisclaimerAccepted: asBoolean(pick("marketplaceDisclaimerAccepted")),
  };
}

/** True after the user has submitted a full provider application (legal + stripe step). */
export async function hasProApplicationAlreadySubmitted(): Promise<boolean> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const d = snap.data() as Record<string, unknown>;
  return d.verification_submitted_at != null;
}

export async function loadMyProOnboardingSnapshot(): Promise<{
  stripeOnboardingStatus: StripeOnboardingStatus;
  stripeAccountId: string;
}> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const ref = doc(db, "pro_profiles", uid);
  const privateRef = doc(db, "pro_compliance", uid);
  const [snap, privateSnap] = await Promise.all([getDoc(ref), getDoc(privateRef)]);
  if (!snap.exists() && !privateSnap.exists()) {
    return { stripeOnboardingStatus: "not_started", stripeAccountId: "" };
  }
  const d = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
  const privateDoc = privateSnap.exists() ? (privateSnap.data() as Record<string, unknown>) : {};
  const status = asString(d.stripe_onboarding_status);
  const stripeOnboardingStatus: StripeOnboardingStatus =
    status === "created" ||
    status === "pending" ||
    status === "submitted" ||
    status === "completed" ||
    status === "expired"
      ? status
      : "not_started";
  return {
    stripeOnboardingStatus,
    stripeAccountId: asString(d.stripe_connect_account_id) || asString(privateDoc.stripeAccountId),
  };
}

export async function saveMyProApplicationDraft(
  draft: ProApplicationDraft,
): Promise<void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const publicRef = doc(db, "pro_profiles", uid);
  const privateRef = doc(db, "pro_compliance", uid);
  await setDoc(
    publicRef,
    {
      ownerId: uid,
      role: "freelancer",
      backgroundCheckStatus: "not_started" satisfies BackgroundCheckStatus,
      verification_status: "pending_approval" satisfies ProVerificationStatus,
      is_licensed: false,
      is_insured: false,
      admin_notes: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    privateRef,
    {
      ownerId: uid,
      application_draft: draft,
      compliance_private: {
        governmentIdUrl: draft.governmentIdUrl,
        licensesByCategoryId: draft.licensesByCategoryId,
        ...complianceDeletesForLegacyFlatLicense(),
        insuranceProvider: draft.insuranceProvider,
        insurancePolicyNumber: draft.insurancePolicyNumber,
        insuranceExpirationDate: draft.insuranceExpirationDate,
        coiUrl: draft.coiUrl,
        criminalRecordDeclaration: draft.criminalRecordDeclaration,
      },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Snapshot from Stripe Connect at submit — Firestore webhook may update live `payouts_enabled` later. */
export type StripeConnectSnapshotAtSubmit = {
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
};

export async function submitMyProApplication(
  draft: ProApplicationDraft,
  stripeAtSubmit: StripeConnectSnapshotAtSubmit,
): Promise<void> {
  const uid = await currentUid();
  const db = getFirebaseFirestore();
  const publicRef = doc(db, "pro_profiles", uid);
  const privateRef = doc(db, "pro_compliance", uid);
  await Promise.all([
    setDoc(
      publicRef,
      {
        ownerId: uid,
        role: "freelancer",
        stripe_payouts_enabled_at_submit: stripeAtSubmit.payoutsEnabled,
        stripe_details_submitted_at_submit: stripeAtSubmit.detailsSubmitted,
        stripe_charges_enabled_at_submit: stripeAtSubmit.chargesEnabled,
        verification_status: "pending_approval" satisfies ProVerificationStatus,
        is_licensed: false,
        is_insured: false,
        admin_notes: "",
        verification_submitted_at: serverTimestamp(),
        verification_updated_at: serverTimestamp(),
        background_check_status: "not_started" satisfies BackgroundCheckStatus,
        phone_masking_enabled: true,
        phone_masking_provider: "twilio",
        categoryIds: draft.categoryIds,
        specialtyIds: draft.specialtyIds,
        serviceRadiusMiles: draft.serviceRadiusMiles,
        coverageMode: draft.coverageMode,
        serviceAreasText: draft.serviceAreasText,
        /** Public display only; document stays in private compliance storage. */
        licenseNumber: buildPublicLicenseNumber(draft),
        terms_accepted_at: draft.termsAccepted ? serverTimestamp() : null,
        commission_policy_accepted_at: draft.commissionAccepted
          ? serverTimestamp()
          : null,
        information_accuracy_accepted_at: draft.accuracyAccepted
          ? serverTimestamp()
          : null,
        independent_contractor_accepted_at: draft.independentContractorAccepted
          ? serverTimestamp()
          : null,
        marketplace_disclaimer_accepted_at: draft.marketplaceDisclaimerAccepted
          ? serverTimestamp()
          : null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      privateRef,
      {
        ownerId: uid,
        application_draft: draft,
        legalName: draft.legalName,
        dateOfBirth: draft.dateOfBirth,
        serviceAddress: draft.serviceAddress,
        ssnOrEin: draft.ssnOrEin,
        baseLocationLat: draft.baseLocationLat,
        baseLocationLng: draft.baseLocationLng,
        gpsAddressDetected: draft.gpsAddressDetected,
        stripeAccountId: draft.stripeAccountId,
        work_profile: {
          categories: draft.categoryIds,
          specialty_ids: draft.specialtyIds,
          base_location: {
            address: draft.serviceAddress.trim(),
            lat: draft.baseLocationLat,
            lng: draft.baseLocationLng,
          },
          service_radius_miles: Number.parseInt(draft.serviceRadiusMiles, 10) || 25,
        },
        compliance_private: {
          governmentIdUrl: draft.governmentIdUrl,
          licensesByCategoryId: draft.licensesByCategoryId,
          ...complianceDeletesForLegacyFlatLicense(),
          insuranceProvider: draft.insuranceProvider,
          insurancePolicyNumber: draft.insurancePolicyNumber,
          insuranceExpirationDate: draft.insuranceExpirationDate,
          coiUrl: draft.coiUrl,
          criminalRecordDeclaration: draft.criminalRecordDeclaration,
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
}

export async function loadIncomingRequestsForMyPro(options?: {
  bypassVerification?: boolean;
}): Promise<IncomingRequestRow[]> {
  const profile = await loadMyProProfile();
  if (!options?.bypassVerification && profile.verificationStatus !== "approved") return [];
  if (profile.categoryIds.length === 0) return [];

  const db = getFirebaseFirestore();
  const snap = await getDocs(
    query(
      collection(db, "service_requests"),
      where("status", "==", "open"),
      where("categoryId", "in", profile.categoryIds.slice(0, 10)),
      limit(40),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as {
      title?: string;
      details?: string;
      categoryId?: string | null;
      urgency?: "standard" | "urgent";
      createdAt?: { toMillis?: () => number } | number;
    };
    const createdAt =
      typeof data.createdAt === "number"
        ? data.createdAt
        : typeof data.createdAt === "object" &&
            data.createdAt !== null &&
            typeof data.createdAt.toMillis === "function"
          ? data.createdAt.toMillis()
          : Date.now();
    return {
      id: d.id,
      title: typeof data.title === "string" ? data.title : "Request",
      details: typeof data.details === "string" ? data.details : "",
      categoryId:
        typeof data.categoryId === "string" ? data.categoryId : (data.categoryId ?? null),
      urgency: data.urgency === "urgent" ? "urgent" : "standard",
      createdAt,
    };
  });
}
