import type { ServiceListing } from "../types/serviceListing";

/**
 * Sample professionals for UI development. Swap for Firestore / API queries before launch.
 * Images: Pravatar (stable CDN faces; replace with your own assets or signed URLs later).
 * `fee` simulates what each **pro sets** as their starting price (`pro_profiles.startingFeeDisplay` when live).
 */
export const demoNearbyFreelancers: ServiceListing[] = [
  {
    id: "demo-nearby-1",
    title: "Marco Silva",
    subtitle: "Emergency locksmith · 24/7",
    eta: "8 min",
    fee: "$55",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=12",
    showcaseHero: {
      imageUrls: [
        "https://picsum.photos/id/28/900/700",
        "https://picsum.photos/id/221/900/700",
        "https://picsum.photos/id/431/900/700",
      ],
      video: {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        posterUrl: "https://picsum.photos/id/1060/800/450",
      },
    },
    categoryIds: ["locksmith"],
    jobsDone: 312,
    bio:
      "Certified locksmith with 12+ years on residential and commercial jobs. I specialize in emergency lockouts, smart locks, rekeys, and high-security hardware. Fully insured. Based in your area with fast dispatch — see recent work below.",
    portfolioAlbums: [
      {
        id: "album-marco-emergency",
        title: "Emergency callouts",
        items: [
          { type: "image", url: "https://picsum.photos/id/28/900/700" },
          { type: "image", url: "https://picsum.photos/id/221/900/700" },
        ],
      },
      {
        id: "album-marco-smart",
        title: "Smart locks & hardware",
        items: [
          { type: "image", url: "https://picsum.photos/id/431/900/700" },
          { type: "image", url: "https://picsum.photos/id/534/900/700" },
        ],
      },
      {
        id: "album-marco-video",
        title: "Intro clip",
        items: [
          {
            type: "video",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            posterUrl: "https://picsum.photos/id/1060/800/450",
            durationSec: 45,
          },
        ],
      },
    ],
  },
  {
    id: "demo-nearby-2",
    title: "Ana Petrova",
    subtitle: "Certified plumber · leaks & installs",
    eta: "14 min",
    fee: "$65",
    rating: "5.0",
    imageUrl: "https://i.pravatar.cc/400?img=45",
    categoryIds: ["plumber"],
    jobsDone: 428,
    bio: `I'm Ana — a licensed plumber serving homeowners and small businesses for over nine years. I focus on clear communication before any wrench turns: you get scope, options, and pricing expectations up front so there are no surprises.

Day to day I handle leak detection and repair, fixture swaps, drain cleaning, water heater service (tank and tankless), and kitchen or bath rough-in work. I’m careful with your finishes and cleanup, and I stand behind leak-free connections.

Whether it’s an urgent drip at night or a planned bath refresh, I treat every visit with the same standard: show up on time, explain what I found, and leave the space tidy. Browse my albums — they’re grouped how I upload jobs (bathroom, kitchen, emergencies, and more) — or message me with photos for a faster estimate.`,
    portfolioAlbums: [
      {
        id: "album-ana-bath",
        title: "Bathroom work",
        items: [
          { type: "image", url: "https://picsum.photos/id/1048/900/700" },
          { type: "image", url: "https://picsum.photos/id/866/900/700" },
          { type: "image", url: "https://picsum.photos/id/237/900/700" },
          { type: "image", url: "https://picsum.photos/id/1080/900/700" },
          { type: "image", url: "https://picsum.photos/id/823/900/700" },
        ],
      },
      {
        id: "album-ana-kitchen",
        title: "Kitchen & piping",
        items: [
          { type: "image", url: "https://picsum.photos/id/193/900/700" },
          {
            type: "video",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            posterUrl: "https://picsum.photos/id/292/900/700",
            durationSec: 42,
          },
        ],
      },
      {
        id: "album-ana-drains",
        title: "Drains & leaks",
        items: [
          { type: "image", url: "https://picsum.photos/id/292/900/700" },
          { type: "image", url: "https://picsum.photos/id/429/900/700" },
        ],
      },
      {
        id: "album-ana-heaters",
        title: "Water heaters",
        items: [{ type: "image", url: "https://picsum.photos/id/514/900/700" }],
      },
      {
        id: "album-ana-mixed",
        title: "Recent jobs",
        items: [
          { type: "image", url: "https://picsum.photos/id/318/900/700" },
          { type: "image", url: "https://picsum.photos/id/625/900/700" },
        ],
      },
    ],
  },
  {
    id: "demo-nearby-3",
    title: "James Okonkwo",
    subtitle: "Residential electrician",
    eta: "11 min",
    fee: "$70",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=33",
    categoryIds: ["electrician"],
  },
  {
    id: "demo-nearby-4",
    title: "Sofia Reyes",
    subtitle: "Doors, frames & hardware",
    eta: "22 min",
    fee: "$48",
    rating: "4.7",
    imageUrl: "https://i.pravatar.cc/400?img=26",
    categoryIds: ["doors", "handyman"],
  },
  {
    id: "demo-nearby-5",
    title: "Tom Andersen",
    subtitle: "Mobile tire change & repair",
    eta: "18 min",
    fee: "$40",
    rating: "4.6",
    imageUrl: "https://i.pravatar.cc/400?img=59",
    categoryIds: ["tire"],
  },
  {
    id: "demo-nearby-6",
    title: "Lisa Chen",
    subtitle: "Smart locks & access control",
    eta: "9 min",
    fee: "$60",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=16",
    categoryIds: ["locksmith"],
  },
  {
    id: "demo-nearby-7",
    title: "David Park",
    subtitle: "Panel swaps & EV charger install",
    eta: "16 min",
    fee: "$85",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=60",
    categoryIds: ["electrician"],
  },
  {
    id: "demo-nearby-8",
    title: "Rita Gomez",
    subtitle: "Rekey & master key systems",
    eta: "12 min",
    fee: "$50",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=32",
    categoryIds: ["locksmith"],
  },
  {
    id: "demo-nearby-9",
    title: "Ken Yamamoto",
    subtitle: "Drain cleaning & water heaters",
    eta: "20 min",
    fee: "$72",
    rating: "4.7",
    imageUrl: "https://i.pravatar.cc/400?img=68",
    categoryIds: ["plumber"],
  },
  {
    id: "demo-nearby-10",
    title: "Priya Nair",
    subtitle: "Interior doors & weatherstrip",
    eta: "19 min",
    fee: "$52",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=44",
    categoryIds: ["doors"],
  },
  {
    id: "demo-nearby-11",
    title: "Chris Weber",
    subtitle: "Roadside tire & battery",
    eta: "24 min",
    fee: "$45",
    rating: "4.5",
    imageUrl: "https://i.pravatar.cc/400?img=52",
    categoryIds: ["tire"],
  },
  {
    id: "demo-nearby-12",
    title: "Mike O'Brien",
    subtitle: "Odd jobs, furniture assembly & patches",
    eta: "27 min",
    fee: "$44",
    rating: "4.7",
    imageUrl: "https://i.pravatar.cc/400?img=61",
    categoryIds: ["handyman"],
  },
];

export const demoTopRatedFreelancers: ServiceListing[] = [
  {
    id: "demo-top-1",
    title: "Ana Petrova",
    subtitle: "Certified plumber · 1.2k jobs",
    eta: "Usually same day",
    fee: "$65",
    rating: "5.0",
    imageUrl: "https://i.pravatar.cc/400?img=45",
    categoryIds: ["plumber"],
  },
  {
    id: "demo-top-2",
    title: "James Okonkwo",
    subtitle: "Electrician · panel upgrades",
    eta: "12 min",
    fee: "$70",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=33",
    categoryIds: ["electrician"],
  },
  {
    id: "demo-top-3",
    title: "Marco Silva",
    subtitle: "Locksmith · emergency specialist",
    eta: "8 min",
    fee: "$55",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=12",
    categoryIds: ["locksmith"],
  },
  {
    id: "demo-top-4",
    title: "Elena Vasquez",
    subtitle: "Handyman · doors & small repairs",
    eta: "25 min",
    fee: "$42",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=38",
    categoryIds: ["doors", "handyman"],
  },
  {
    id: "demo-top-5",
    title: "Omar Haddad",
    subtitle: "Commercial locksmith · access control",
    eta: "15 min",
    fee: "$58",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=14",
    categoryIds: ["locksmith"],
  },
  {
    id: "demo-top-6",
    title: "Nina Kowalski",
    subtitle: "Repipes & fixture installs",
    eta: "Same day",
    fee: "$68",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=47",
    categoryIds: ["plumber"],
  },
  {
    id: "demo-top-7",
    title: "Victor Mensah",
    subtitle: "EV-ready electrical upgrades",
    eta: "18 min",
    fee: "$90",
    rating: "4.9",
    imageUrl: "https://i.pravatar.cc/400?img=11",
    categoryIds: ["electrician"],
  },
  {
    id: "demo-top-8",
    title: "Hannah Lee",
    subtitle: "Storm doors & smart entry",
    eta: "21 min",
    fee: "$55",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=24",
    categoryIds: ["doors"],
  },
  {
    id: "demo-top-9",
    title: "Alex Ruiz",
    subtitle: "Fleet tire service",
    eta: "30 min",
    fee: "$38",
    rating: "4.6",
    imageUrl: "https://i.pravatar.cc/400?img=55",
    categoryIds: ["tire"],
  },
  {
    id: "demo-top-10",
    title: "Sam Okafor",
    subtitle: "Safe opening & high-security locks",
    eta: "10 min",
    fee: "$62",
    rating: "5.0",
    imageUrl: "https://i.pravatar.cc/400?img=15",
    categoryIds: ["locksmith"],
  },
  {
    id: "demo-top-11",
    title: "Yuki Tanaka",
    subtitle: "Tankless water heaters",
    eta: "Next day",
    fee: "$74",
    rating: "4.8",
    imageUrl: "https://i.pravatar.cc/400?img=31",
    categoryIds: ["plumber"],
  },
];

export type HomeBrowseSection = "nearby" | "top-rated" | "around-you";

/** All demo pros (nearby + top-rated), deduped by name — mixed trades. Replace with geo query ≤ 5 mi. */
export function listingsMixedWithinRadius(): ServiceListing[] {
  const pool = [...demoNearbyFreelancers, ...demoTopRatedFreelancers];
  const seenTitles = new Set<string>();
  const out: ServiceListing[] = [];
  for (const item of pool) {
    const key = item.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(item);
  }
  return out;
}

export function listingsForBrowseSection(section: HomeBrowseSection): ServiceListing[] {
  if (section === "nearby") return [...demoNearbyFreelancers];
  if (section === "top-rated") return [...demoTopRatedFreelancers];
  return listingsMixedWithinRadius();
}

/**
 * Demo-only: merge nearby + top-rated, keep one row per person (title), filter by category.
 * Production: query `pro_profiles` (or equivalent) by `categoryId` + geo.
 */
export function listingsForCategory(categoryId: string): ServiceListing[] {
  const pool = [...demoNearbyFreelancers, ...demoTopRatedFreelancers];
  const seenTitles = new Set<string>();
  const out: ServiceListing[] = [];
  for (const item of pool) {
    if (!item.categoryIds.includes(categoryId)) continue;
    const key = item.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(item);
  }
  return out;
}

/** Resolve one demo listing by id for profile deep links (until Firestore `pro_profiles`). */
export function getListingById(id: string): ServiceListing | undefined {
  const pool = [...demoNearbyFreelancers, ...demoTopRatedFreelancers];
  const seen = new Set<string>();
  for (const item of pool) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.id === id) return item;
  }
  return undefined;
}
