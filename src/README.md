# `src/` — application source

- **`features/`** — product areas (`home`, `requests`, `quotes`, …). Each feature owns its screens, small components, and feature-local types.
- **`navigation/`** — shared route path constants (`routes.ts`), not route components.
- **`shared/`** — reusable UI and utilities used by multiple features.
- **`theme/`** — global design tokens (`colors`, `spacing`, …).

Route entrypoints live in **`app/`** (sibling of `src/`). See `docs/NAVIGATION.md`.
