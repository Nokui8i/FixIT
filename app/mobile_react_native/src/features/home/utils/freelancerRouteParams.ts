/** Normalize Expo Router `[id]` param (string vs array vs encoded). */
export function freelancerIdFromParams(
  raw: string | string[] | undefined,
): string {
  const one = Array.isArray(raw) ? raw[0] : raw;
  if (!one || typeof one !== "string") return "";
  try {
    return decodeURIComponent(one);
  } catch {
    return one;
  }
}

/** Normalize `[albumId]` for portfolio album screen. */
export function portfolioAlbumIdFromParams(
  raw: string | string[] | undefined,
): string {
  return freelancerIdFromParams(raw);
}
