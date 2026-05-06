# Mobile app — remaining integration (finish checklist)

Master backlog for wiring the Expo app to **Firebase**, **real location/maps**, and production release. Check items off in PRs; keep this file updated when scope changes.

**Product and backend context:** see the repo root [`README.md`](../../../README.md) (Firebase architecture §8, matching §9, MVP §11).

---

## Firebase and backend

- [ ] **Firebase Auth** — sign-in/session persistence; gate Firestore reads/writes by `uid`
- [ ] **`createServiceRequest`** — real Firestore write (`service_requests` or equivalent), return `requestId`, navigate to offers with live id
- [ ] **Firestore indexes** — composites for requests/quotes/bookings queries used by the app
- [ ] **Offers screen** — `onSnapshot` on `quotes` for `requestId`, sorting, empty/error states
- [ ] **Accept quote** — Cloud Function or trusted server path → booking + payment intent (no client-only acceptance)
- [ ] **In-app notifications** — replace dev samples (`useInAppNotifications`) with Firestore `onSnapshot`, `updateDoc` / `deleteDoc` / batch for read, dismiss, mark all read; align with FCM payloads
- [ ] **FCM** — permissions, token registration, background/foreground handling
- [ ] **User / customer profile** — `users` (and any `customer_settings` / saved addresses collection) for persisted identity and preferences
- [ ] **Security rules** — role + ownership for every collection the client touches (root README §8.3)
- [ ] **Cloud Functions** — dispatch, quote acceptance, payment capture, refunds, notification fan-out as needed
- [ ] **Stripe** — checkout or Payment Sheet per product decision; webhooks in Functions

---

## Profile / Account screen (`AccountScreen`)

**Current app:** `AccountScreen` is a **dev hub** only — links to Home, Search, Notifications, New request, and a muted Pro workspace link. There is **no** signed-in identity block, no edit profile, no payment methods, no legal links.

Replace / extend with a real **customer account** area:

- [ ] **Auth state** — show **Sign in / Sign up** when logged out; show **user summary** (photo, display name, email/phone) when logged in; **Sign out** (and optional “switch account” later)
- [ ] **Profile fields** — read/write `users` (and related docs): display name, photo (Storage upload + URL), phone if you use it; validate with rules
- [ ] **Saved locations** — list + edit + default flag (can mirror or deep-link from home location sheet once Firestore models exist)
- [ ] **Payments** — saved payment methods / “Payment & billing” entry point when Stripe customer portal or in-app management is ready
- [ ] **Orders / activity** — shortcuts to active requests, bookings, history (routes or tabs as you define the IA)
- [ ] **Notifications** — link to notification center + push permission status / open OS settings
- [ ] **Support & legal** — Help/FAQ, Terms, Privacy (URLs or in-app screens); contact support
- [ ] **Settings** — language (if i18n), theme (if dark mode), measurement units — only what MVP needs
- [ ] **Pro entry** — keep **separate** entry for pros (`/pro`) with copy that matches README priority (customer-first); avoid mixing pro tools into customer profile unless intentional

---

## Location and maps (home “My Location” + job context)

**Current app:** bottom sheet with **manual text** and **GPS coordinates** only (no validation, no persistence).

- [ ] **Address search** — Places Autocomplete (Google) or Geocoding API alternative (e.g. Mapbox); debounce, session tokens, attribution if required
- [ ] **Geocode** — selected place → `latitude` / `longitude` (+ `placeId` if available) for dispatch and “nearby pros”
- [ ] **Reverse geocode** — GPS fix → human-readable single-line label (and structured fields if needed)
- [ ] **Persist** — save chosen service location on the user (Firestore) and **restore on launch**; drive home header label from that source of truth
- [ ] **Use in queries** — home discovery / request dispatch use stored coordinates (root README §9: radius, geohash, indexes)
- [ ] **Optional** — map picker / “adjust pin”; saved addresses list (Wolt-style rows) backed by Firestore
- [ ] **Secrets** — Maps/API keys via EAS env / `expo-constants`, never committed; restrict keys by platform and API in provider console

---

## Pro app and admin (tracked; later than first customer slice)

- [ ] **Pro** quote submission UI + persistence; incoming request detail; push alignment
- [ ] **Admin** panel (separate product) per root README §11 when prioritized

---

## Quality, analytics, release

- [ ] **Analytics** — location set, request created, quote submitted/accepted, payment outcomes (event names aligned with root README §12.4)
- [ ] **Errors / offline** — clear messaging when Firestore or Maps fails; retry where safe
- [ ] **EAS Build** — dev/preview/prod profiles; store assets and permissions (location already declared in `app.json`; revisit when adding Maps SDK if native plugins change)
