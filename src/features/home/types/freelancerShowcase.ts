/** One slot in the profile-top “show off” carousel. */
export type ShowcaseSlide =
  | { type: "image"; uri: string }
  | { type: "video"; uri: string; posterUri?: string };

export const SHOWCASE_MAX_IMAGES = 3;
export const SHOWCASE_MAX_VIDEOS = 1;
