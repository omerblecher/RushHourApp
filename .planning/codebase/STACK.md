# Technology Stack
*Generated: 2026-04-12*

## Summary
Rush Hour is a React 19 + TypeScript mobile puzzle game built with Vite and deployed as an Android native app via Capacitor. State is managed with Zustand, routing uses React Router v7 with HashRouter (required for Capacitor), and all styling is done with CSS Modules.

## Languages

**Primary:**
- TypeScript 5.9 — all source files under `src/` and `scripts/`

**Secondary:**
- JSON — puzzle data files under `src/data/puzzles/` (beginner, intermediate, advanced, expert)
- CSS — per-component CSS Modules

## Runtime

**Environment:**
- Browser (web) and Android (via Capacitor WebView)
- `HashRouter` is used (not `BrowserRouter`) to support file:// URLs in Capacitor

**Node.js:**
- Used for build tooling and scripts only; not a server runtime

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present — `"type": "module"` in `package.json`)

## Frameworks

**Core UI:**
- React 19.2 + React DOM 19.2 — component rendering
- Entry point: `src/main.tsx`

**Mobile Shell:**
- Capacitor 8.2 — wraps the Vite web build into a native Android app
- App ID: `com.otis.brooke.rushhour.puzzle`
- Web dist dir: `dist/`
- Config: `capacitor.config.ts`

**Routing:**
- React Router 7.13 — `HashRouter` with `Routes`/`Route`
- Routes defined in `src/App.tsx`

**State Management:**
- Zustand 5.0 — three stores:
  - `src/store/authStore.ts` — Firebase auth state, Google sign-in
  - `src/store/gameStore.ts` — active puzzle engine state, moves, undo
  - `src/store/progressStore.ts` — local puzzle completion history (persisted via `zustand/middleware` `persist` to `localStorage` key `rushhour_progress`)

**Testing:**
- Vitest 4.0 — unit and integration tests
- Config: `vitest.config.ts`
- Globals enabled; `@engine` path alias configured

**Build/Dev:**
- Vite 7.3 — dev server and production bundler
- `@vitejs/plugin-react` 5.1 — JSX transform
- Config: `vite.config.ts`
- TypeScript transpiler: `tsx` 4.21 (used for `scripts/validate-puzzles.ts` at prebuild)

## Styling

**Approach:** CSS Modules (scoped, per-component)
- Vite configured with `localsConvention: 'camelCaseOnly'` — class names accessed as camelCase in TSX
- Every component and screen has a paired `.module.css` file
- Global baseline: `src/index.css`
- No CSS-in-JS, no Tailwind, no UI component library

## Key Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.9.3 | Type checking (`tsc --noEmit` via `typecheck` script) |
| `vite` | ^7.3.1 | Build and dev server |
| `@vitejs/plugin-react` | ^5.1.4 | React fast-refresh and JSX |
| `vitest` | ^4.0.18 | Test runner |
| `tsx` | ^4.21.0 | Run TypeScript scripts (prebuild puzzle validation) |
| `@capacitor/cli` | ^8.2.0 | Capacitor CLI for native builds |
| `@capacitor/assets` | ^3.0.5 | Icon/splash asset generation |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/canvas-confetti` | ^1.9.0 | Type defs for confetti library |

## Build Configuration

**Vite chunk splitting** (`vite.config.ts`):
- `firebase` chunk — all `node_modules/firebase` and `@firebase`
- `howler` chunk — audio library (referenced in config, package listed as dependency)
- `confetti` chunk — `canvas-confetti`
- `vendor` chunk — `react`, `react-dom`, `react-router`, `zustand`, `scheduler`

**Path Alias:**
- `@engine` → `src/engine/` (configured in both `vite.config.ts` and `vitest.config.ts`)

**Prebuild script:**
- `npm run validate-puzzles` runs before every `vite build`
- Script: `scripts/validate-puzzles.ts` executed via `tsx`

## Runtime Targets

**Web:** Modern browsers with `AudioContext` and `localStorage` support
**Android:** Native app via Capacitor 8 wrapping a WebView
**iOS:** Not configured (no `@capacitor/ios` in dependencies)

## Gaps / Uncertainties
- `howler` appears in the Vite chunk split config but is not listed in `package.json` — may be a leftover config artifact or the package was removed
- No `.nvmrc` or `.node-version` file found; Node.js version is not pinned
- No `.eslintrc` or `biome.json` found; linting is not configured
- No `.prettierrc` found; code formatting tooling is not configured
- iOS target: no evidence of iOS Capacitor setup in this repo
