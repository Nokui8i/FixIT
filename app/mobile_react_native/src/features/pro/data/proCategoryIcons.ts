import Ionicons from "@expo/vector-icons/Ionicons";

/** Icons for service category rows (apply flow + pro dashboard). */
export const PRO_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  locksmith: "key-outline",
  electrician: "flash-outline",
  plumber: "water-outline",
  handyman: "hammer-outline",
  default: "construct-outline",
};
