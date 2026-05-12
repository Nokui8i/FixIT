# FixIT

Location-based marketplace for on-demand local services.

This document is the single source of truth for what we are building, how we build it, and how future team members can continue development with clean structure and predictable standards.

## Current build priority

**Customer experience first:** discovery → create request → compare offers → booking/payment (then ratings).  
The **professional (`/pro/*`)** routes exist as placeholders and are **not** the active product focus until the customer journey is solid end-to-end.

## 1) Product Vision

ProxiPro is a mobile app that combines:
- Fiverr-style marketplace for independent professionals
- Uber/Wolt-style real-time dispatch by location and availability
- Quote competition (price + ETA + profile trust signals)

Users post a job request (`I need X`). Nearby professionals receive the request, submit offers, and the customer chooses the best one.

## 2) Problem We Solve

Finding a local professional is slow and painful:
- people search manually in Google
- they call many providers one by one
- availability and pricing are unclear
- urgent jobs need immediate response

## 3) Core Value Proposition

- Find nearby available professionals in minutes
- Compare multiple offers in one place
- Make safer decisions based on ratings, ETA, and distance
- Complete booking and payment inside the platform

## 4) Primary Users

- Customers needing urgent or scheduled services
- Independent professionals seeking new clients
- Small field-service teams

Service examples:
- Locksmith
- Electrician
- Plumber
- Handyman
- Tire/roadside assistance
- Door/home repair

## 5) Business Model

Main model:
- No monthly subscription for professionals
- Platform takes commission only on completed transactions

Optional revenue add-ons:
- Sponsored profile placement
- Priority lead access
- Featured profile boost
- Customer protection fee

## 6) End-to-End User Flow

1. Customer selects category and creates request
2. Customer fills dynamic form (details, urgency, media, location)
3. System dispatches request to nearby relevant professionals
4. Professionals submit quotes (price, ETA, notes)
5. Customer compares and accepts one quote
6. Job progresses through tracked statuses
7. Payment is completed in app
8. Both sides submit ratings/reviews

## 7) Tech Stack (Mobile First)

- App: React Native (Expo) + TypeScript
- Backend: Firebase
  - Firebase Auth
  - Cloud Firestore
  - Cloud Functions
  - Cloud Messaging (FCM)
  - Cloud Storage
  - Firebase Analytics + Crashlytics
  - Remote Config
- Payments: Stripe
- Maps/Geocoding/ETA: Google Maps Platform

Why Firebase:
- fast MVP delivery
- real-time updates
- native push notification support
- serverless backend scale

## 8) Firebase Architecture (High Level)

### 8.1 Core Collections

- `users`: shared identity and **`role`** (`customer` | `freelancer` | `manager` | `admin` | `owner`; legacy `pro` is treated as `freelancer`)
- `pro_profiles`: professional business profile, categories, radius, verification
- `service_requests`: customer job requests and status lifecycle
- `quotes`: submitted offers per request
- `bookings`: accepted quote + execution details
- `payments`: charge/payment status and commission metadata
- `reviews`: customer-to-pro and pro-to-customer ratings
- `notifications`: log of in-app/push notifications

### 8.2 Status Lifecycles

Request status:
- `draft` -> `open` -> `quoted` -> `booked` -> `completed` / `cancelled`

Booking status:
- `pending` -> `accepted` -> `in_progress` -> `completed` / `cancelled` / `disputed`

Payment status:
- `intent_created` -> `authorized` -> `captured` / `failed` / `refunded`

### 8.3 Security Model

- No trust in client app for critical actions
- Sensitive transitions enforced in Cloud Functions
- Firestore security rules by role and ownership
- Contact details hidden until booking/payment milestone
- **`users/{uid}.role`**: clients cannot set **staff** roles (`manager` / `admin` / `owner`) or change an existing staff role; **`customer`**, **`freelancer`**, and legacy **`pro`** are allowed for non-staff accounts. Staff assignments stay Firebase Console / Admin SDK / automation only.

## 9) Matching and Dispatch Logic

When a request is opened:
1. Validate request and category
2. Find professionals by:
   - matching category
   - online/available status
   - service radius
   - geo distance
3. Rank by matching score:
   - distance
   - response speed history
   - rating
   - completion rate
4. Send push notifications to top candidates
5. Keep dispatch wave-based (first wave, then broader radius if needed)

## 10) Anti-Bypass and Trust Strategy

To reduce off-platform closures:
- hide phone numbers before booking confirmation
- use in-app masked chat/call
- reveal direct details only after booking/payment intent
- provide dispute/refund safety only for in-app jobs
- retention perks for on-platform repeat bookings

To increase trust:
- pro identity verification
- optional license/certificate verification by category
- review quality checks and fraud signals
- reliability metrics on profile

## 11) MVP Scope (Phase 1)

### Customer App
- sign up / login
- create request with guided form
- receive live quotes
- compare and accept quote
- in-app chat
- payment checkout
- rating/review

### Professional App
- onboarding and profile setup
- categories + work radius
- availability toggle
- incoming request notifications
- quote submission (price + ETA)
- booking status updates

### Admin Panel
- categories management
- verification/review moderation
- payments and commission monitoring
- disputes handling

## 12) Engineering Standards (Team Handoff)

### 12.1 Project Structure (Target)

```
/app
  /mobile_react_native
    /app                 # Expo Router: URL tree only (thin route files)
    /docs                # Mobile handoff: NAVIGATION.md, MOBILE_INTEGRATION_CHECKLIST.md
    /src
      /navigation        # route path constants (see routes.ts + README there)
      /theme             # design tokens and theme helpers
      /features          # product screens + feature UI/logic
        /auth
        /home
        /requests
        /quotes
        /bookings
        /payments
        /profile
      /shared            # reusable components and services
      /data              # repositories, models, DTOs (when added)
    /__tests__
  /functions           # Firebase Cloud Functions
  /firebase
    firestore.rules
    firestore.indexes.json
    storage.rules
```

### 12.2 Coding Rules

- Feature-first folder architecture
- One responsibility per file/class
- Keep business logic in services/use-cases, not UI widgets
- Strict typing and model validation
- Reusable components for consistent UI
- Every new feature includes tests (unit at minimum)

### 12.3 Branching and PR Discipline

- Branch naming: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Small PRs with clear scope
- Required PR description:
  - what changed
  - why
  - test evidence
  - screenshots for UI changes

### 12.4 Documentation Discipline

For each feature, always document:
- data model impact
- API/function contracts
- security rules impact
- analytics events added
- migration steps if any

## 13) Product Design Direction

Visual style target:
- clean modern layout similar to top mobility/delivery apps
- high readability and fast task completion
- premium visual layer using subtle depth:
  - glassmorphism accents
  - soft shadows
  - rounded cards
  - strong typography hierarchy

Principle:
- speed and clarity first, visual effects second

## 14) Go-To-Market Recommendation

Start narrow:
- one city
- one or two high-urgency categories (locksmith + roadside support)

Why:
- faster supply-demand balance
- easier operational control
- stronger early retention signal

## 15) Future Enhancements

- Urgency mode for emergency requests
- Instant booking for fixed-price services
- AI-assisted quote suggestions for professionals
- B2B recurring jobs mode (offices/property managers)
- Subscription tier for power pros (optional later)

## 16) Non-Goals for MVP

- No global launch at day one
- No complex escrow/legal workflows in v1
- No broad multi-vertical expansion before local liquidity works

## 17) Definition of Done (Per Feature)

A feature is complete only if:
- implementation is merged
- tests pass
- rules/security reviewed
- analytics events added
- docs updated in README or feature docs

## 18) UI Strategy: Ready-Made Template First

We will not design UI from scratch for MVP.  
We will start from a high-quality, production-ready React Native UI kit/theme and adapt it to our flows.

Why:
- faster launch
- more consistent UX
- lower design risk
- cleaner handoff for future team members

### 18.1 Template Requirements

The selected template must include:
- modern design system (typography, spacing, colors, components)
- onboarding, auth, profile, list, detail, chat, and checkout patterns
- light + dark theme support
- clean architecture and maintainable code quality
- active maintenance and good documentation

### 18.2 Mandatory Rule for Implementation

- Keep the template's design tokens and component system as the base.
- Do not introduce random one-off styles per screen.
- New screens must be built from shared reusable components.
- UX behavior should stay smooth and familiar, similar to top delivery/mobility apps.

### 18.3 Visual Direction

- base style: clean mobility/delivery UX
- component style: rounded cards, subtle shadows, premium spacing
- optional accents: soft glassmorphism only where it does not hurt readability
- animation: short, smooth transitions (no heavy effects)

### 18.4 Team Workflow for UI

1. Pick one base template and freeze it as `v1-ui-base`
2. Map existing template screens to our product flows
3. Create missing shared components once (do not duplicate screen-level code)
4. Implement customer and pro flows using the same design tokens
5. Add screenshot checklist for every UI PR

## 19) Current Code Bootstrap (Implemented)

Current implementation is now in React Native (Expo) at:
- `app/mobile_react_native/package.json` (`main`: `expo-router/entry`)
- `app/mobile_react_native/app/` — Expo Router routes + nested `request/` and `pro/` stacks (see `docs/NAVIGATION.md`)
- `app/mobile_react_native/src/navigation/routes.ts`
- `app/mobile_react_native/src/theme/tokens.ts`
- `app/mobile_react_native/src/features/home/screens/HomeScreen.tsx`
- `app/mobile_react_native/src/features/home/components/*`
- `app/mobile_react_native/src/features/home/data/categoryCatalog.ts` (static category taxonomy only)
- `app/mobile_react_native/src/features/requests/screens/CreateRequestScreen.tsx`
- `app/mobile_react_native/src/features/requests/api/createServiceRequest.ts` (Firestore `service_requests` when `.env` + rules + Anonymous auth are set)
- `app/mobile_react_native/src/shared/firebase/*`, `app.config.js`, `.env` / `.env.example` — Firebase Web SDK (**FixIT** project `fixit-app-48290171`)
- `app/mobile_react_native/src/data/repositories/discoveryRepository.ts` (Firestore `categories` + `pro_profiles` reads with fallback)
- `app/mobile_react_native/src/data/repositories/messagesRepository.ts` (`chat_threads` inbox reads with fallback)
- `app/mobile_react_native/src/data/repositories/userRepository.ts` (`users/{uid}` profile + account persistence)
- `app/mobile_react_native/src/data/repositories/proProfileRepository.ts` (pro card/profile + incoming open requests)
- `app/mobile_react_native/src/data/repositories/chatRepository.ts` (`chat_threads` + `chat_messages/{threadId}/items` conversation write/listen)
- `app/firebase.json`, `app/firebase/*`, `app/functions/*`, `app/complete-fixit-firebase.ps1` — CLI deploy / bootstrap
- `app/mobile_react_native/src/features/quotes/screens/OffersScreen.tsx`
- `app/mobile_react_native/src/shared/components/ScreenHeader.tsx`
- `app/mobile_react_native/src/shared/components/EmptyState.tsx`
- `app/mobile_react_native/src/features/search/screens/SearchScreen.tsx`
- `app/mobile_react_native/src/features/account/screens/AccountScreen.tsx`
- `app/mobile_react_native/src/features/pro/screens/ProHomeScreen.tsx`, `ProIncomingScreen.tsx`

Implemented now:
- **Expo Router** — customer, request stack, search, account, pro stack (`docs/NAVIGATION.md` + `src/navigation/routes.ts`)
- Wolt-like base design tokens (colors, radius, shadows, spacing)
- home top bar fixed while scrolling (location + action circles)
- collapsing category strip (taxonomy tiles + chips; no stock-photo placeholders)
- promo banner
- reusable `ServiceCard` (typed for real `ServiceListing` rows when Firestore is wired)
- floating search pill → **Search** (`/search`) → shortcut to new request
- home category tile → **New request** with `categoryId` param; header icons → **Account** (dev shortcuts to all areas)
- **Pro** `/pro` and `/pro/incoming` shells (minimal Firestore wiring)
- **Create request** → `createServiceRequest` persists to **`service_requests`** when Firebase is configured (enable **Anonymous** in Console for dev)
- **Home / category / profile discovery** reads from Firestore `categories` and `pro_profiles` (no local demo fallback)
- discovery and inbox now avoid local/demo fallback so only real Firebase data is shown
- **Home banners** now load from Firestore `banners` (no hardcoded demo slides in app code)
- category-driven surfaces (Categories page, Search category list, Request category dropdown) now read from Firestore `categories`
- **Notifications** now use Firestore `notifications` subscription (demo feed disabled)
- **Messages** inbox reads from Firestore `chat_threads` when available; falls back to AsyncStorage preview data
- **Account** screens persist profile fields to Firestore `users/{uid}` (name/email/phone/country/avatar/receipts)
- **Account UX** is simplified for US launch (fixed region, cleaner profile hierarchy, in-app notifications toggles, Help Center link, legal links, delete-account flow)
- **Pro workspace** persists own card under `pro_profiles/{uid}` and loads incoming open `service_requests` by selected categories
- **Freelancer chat** writes and listens in Firestore (`chat_threads` + `chat_messages`)
- **Offers** → empty state + instructions for `quotes` listener; **Accept** shows not-implemented alert
- discovery grids → **EmptyState** with explicit integration notes (no fake pros)

Mobile app is **React Native (Expo) only**; the earlier Flutter experiment folder was removed.

High-level next steps (detailed checklist lives in the mobile app repo):

1. **Storage** — complete Firebase Console **Storage → Get started**, then `npm run firebase:deploy:rules` (or deploy `storage` only) from `app/`
2. **Offers** screen: `onSnapshot` on `quotes` + sort UI + accept → booking + Stripe (server-side)
3. **Pro** flow: quote submission screen + job detail route under `/pro/...`
4. **Cloud Functions** on Blaze plan (dispatch, payments); expand security rules per README §8.3
5. **Location + maps** end-to-end (autocomplete, geocode, reverse geocode, persistence)

**Finish checklist (checkbox backlog):** [`app/mobile_react_native/docs/MOBILE_INTEGRATION_CHECKLIST.md`](app/mobile_react_native/docs/MOBILE_INTEGRATION_CHECKLIST.md)

---

This README is a living document and must be updated whenever architecture, data flow, security rules, or core feature behavior changes.
