/**
 * Per-category job types for the post-request form (Fiverr/Upwork-style narrowing).
 * When Firestore is wired, map `specialtyId` on `service_requests` for matching filters.
 */
export type SpecialtyOption = { id: string; label: string };

const FALLBACK: SpecialtyOption[] = [
  { id: "general", label: "General — I’ll describe below" },
];

export const specialtiesByCategoryId: Record<string, SpecialtyOption[]> = {
  locksmith: [
    { id: "lockout", label: "Lockout / lost keys" },
    { id: "rekey", label: "Rekey / new keys" },
    { id: "install", label: "Lock install or replacement" },
    { id: "smart", label: "Smart lock setup" },
    { id: "auto", label: "Car / vehicle keys" },
    { id: "general", label: "Other locksmith work" },
  ],
  plumber: [
    { id: "leak", label: "Leak or burst" },
    { id: "drain", label: "Drain / clog" },
    { id: "water_heater", label: "Water heater" },
    { id: "fixture", label: "Toilet, sink, or fixture" },
    { id: "install", label: "New install / renovation" },
    { id: "general", label: "Other plumbing" },
  ],
  electrician: [
    { id: "outlet", label: "Outlets / wiring" },
    { id: "panel", label: "Panel / breaker" },
    { id: "lighting", label: "Lighting" },
    { id: "ev", label: "EV charger" },
    { id: "inspection", label: "Safety / inspection" },
    { id: "general", label: "Other electrical" },
  ],
  doors: [
    { id: "repair", label: "Door repair" },
    { id: "install", label: "New door install" },
    { id: "frame", label: "Frame or alignment" },
    { id: "hardware", label: "Hinges / closers / hardware" },
    { id: "general", label: "Other door work" },
  ],
  tire: [
    { id: "roadside", label: "Flat / roadside" },
    { id: "rotation", label: "Rotation / balance" },
    { id: "replace", label: "New tires" },
    { id: "mobile", label: "Mobile tire service" },
    { id: "general", label: "Other tire / wheel" },
  ],
  handyman: [
    { id: "assembly", label: "Assembly" },
    { id: "mount", label: "TV / shelves / mounting" },
    { id: "paint", label: "Paint / patch" },
    { id: "carpentry", label: "Small carpentry" },
    { id: "general", label: "General repairs" },
  ],
};

export function specialtiesForCategory(categoryId: string): SpecialtyOption[] {
  return specialtiesByCategoryId[categoryId] ?? FALLBACK;
}
