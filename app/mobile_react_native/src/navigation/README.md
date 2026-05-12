# Navigation helpers

- **`routes.ts`** — canonical path strings and small helpers (`requestOffersPath`, `requestBookingPath`).
  Import these when calling `router.push` / `router.replace` so paths stay consistent.

The **URL tree** is still owned by `app/` (Expo Router). If you add a new file there, add its path to `routes.ts` and to `docs/NAVIGATION.md`.
