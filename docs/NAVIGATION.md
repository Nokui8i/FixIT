# ProxiPro mobile — navigation & folder conventions

This app uses **Expo Router** (file-based routing). Entry is `package.json` → `"main": "expo-router/entry"`.

## Build priority

**Ship the customer path first:** `/` → `/search` → `/post` → `/request/:id/offers` → `/request/:id/booking` → payment.  
Routes under **`/pro/*`** are scaffold only until customer flows and Firebase are in place.

## Mental model

| Area | Purpose |
|------|---------|
| `app/` | **Routes only** — thin files that render a screen from `src/features/`. URL structure mirrors the folder tree. |
| `src/features/` | **Product features** — screens, feature-specific components, local state, and (later) data hooks. |
| `src/shared/` | **Cross-feature UI** — reusable pieces like headers, buttons, layout helpers. |
| `src/theme/` | **Design tokens** — colors, spacing, radii (imported by features and routes styling if needed). |
| `src/navigation/` | **Path constants** — import `routes` / `requestOffersPath` from `src/navigation/routes.ts` instead of hardcoding URL strings. |

Do **not** bury business logic inside `app/` route files. Keep routes as one-liners or small wrappers so future developers can grep features under `src/features/`.

## Data policy (no demo listings)

- Do **not** commit fake professionals, quotes, or “demo” navigation shortcuts.
- **Product taxonomy** (e.g. which category labels exist) may live in code as static config — see `src/features/home/data/categoryCatalog.ts`.
- **User-generated / server data** (listings, quotes) must come from Firestore or your API; empty states should explain what to implement next.

## Route map

| URL | File | Screen | Notes |
|-----|------|--------|--------|
| `/` | `app/(tabs)/index.tsx` | `HomeScreen` | Customer discovery (main hub tab) |
| `/category/:categoryId` | `app/category/[categoryId].tsx` | `CategoryFreelancersScreen` | Freelancers in one category (from home category row); use `categoryBrowsePath(id)` |
| `/browse/:section` | `app/browse/[section].tsx` | `BrowseSectionScreen` | `nearby` or `top-rated` — full list from home carousels; `browseSectionPath("nearby")` |
| `/search` | `app/(tabs)/search.tsx` | `SearchScreen` | Search shell → link to new request |
| `/account` | `app/(tabs)/account.tsx` | `AccountScreen` | Profile hub + **dev shortcuts** (customer / pro / search) |
| `/account-management` | `app/account-management.tsx` | `AccountManagementScreen` | Wolt-style account data: photo, email, receipts toggle, legal, **device** (not generic “app settings”) |
| `/notifications` | `app/notifications.tsx` | `NotificationsScreen` | In-app notification list (from home **bell**; not duplicated on profile) |
| `/messages` | `app/(tabs)/messages.tsx` | `MessagesScreen` | Chat inbox (`routes.messages`); threads from AsyncStorage until Firestore |
| `/freelancer/:id` | `app/freelancer/[id]/index.tsx` | `FreelancerProfileScreen` | Pro profile; **Chat** FAB → `/freelancer/:id/chat` |
| `/freelancer/:id/chat` | `app/freelancer/[id]/chat.tsx` | `FreelancerChatScreen` | `freelancerChatHref(proId)` |
| `/freelancer/:id/portfolio` | `app/freelancer/[id]/portfolio/...` | portfolio screens | Gallery + album |
| `/post` | `app/(tabs)/post.tsx` | `CreateRequestScreen` | Hub tab; optional `categoryId`; optional `proId` for directed copy (`routes.requestNew`) |
| `/request/:requestId/offers` | `app/request/[requestId]/offers.tsx` | `OffersScreen` | Dynamic `requestId` |
| `/request/:requestId/booking` | `app/request/[requestId]/booking.tsx` | `BookingConfirmationScreen` | Optional query `bookingId` after `acceptQuote` |
| `/pro` | `app/pro/index.tsx` | `ProHomeScreen` | **Scaffold — not current priority** (pro app later) |
| `/pro/incoming` | `app/pro/incoming.tsx` | `ProIncomingScreen` | **Scaffold** — incoming list when pro phase starts |

### Nested stacks

- **`app/(tabs)/_layout.tsx`** — main hub `Tabs` (home, messages, search, post, account) with fixed `CustomerTabsBar`.
- **`app/request/_layout.tsx`** — `Stack` for `/request/:id/*` (offers, booking after a request exists).
- **`app/pro/_layout.tsx`** — `Stack` for `/pro/*`.

Dynamic segment: `[requestId]` → `useLocalSearchParams().requestId`.  
Optional params on new request: push `{ pathname: routes.requestNew, params: { categoryId: 'locksmith' } }`.

## Deep linking

`app.json` defines `"scheme": "proxipro"`. Example:

`proxipro://post`

## Adding a new screen (checklist)

1. Create the UI under `src/features/<feature>/screens/YourScreen.tsx`.
2. Add `app/.../your-route.tsx` that exports default `YourScreen` (or a tiny wrapper).
3. Add the path to `src/navigation/routes.ts` and navigate with `import { router } from "expo-router"` plus `routes.*` or `requestOffersPath(id)` (avoid raw string literals).
4. If it needs a standard back header, use `ScreenHeader` from `src/shared/components/ScreenHeader.tsx`.
5. Document the new row in the table above.

## Stack behavior

`app/_layout.tsx` configures a root `Stack` with `headerShown: false` so the home UI can use full-bleed Wolt-style layout. Inner screens use `ScreenHeader` instead of the native stack header.

## Commands

```bash
cd app/mobile_react_native
npm install
npm start
```

When moving between machines, prefer `npx expo start --lan` or `--tunnel` if the device cannot reach Metro on the LAN.
