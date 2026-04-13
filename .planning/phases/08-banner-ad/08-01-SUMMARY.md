---
phase: 08-banner-ad
plan: 01
subsystem: ui
tags: [admob, capacitor, banner-ad, react, typescript]

# Dependency graph
requires:
  - phase: 07-gdpr-consent
    provides: waitForConsent() singleton in adService.ts that gates all ad API calls

provides:
  - showBanner() export in adService.ts — awaits consent, calls AdMob.showBanner with ADAPTIVE_BANNER + BOTTOM_CENTER
  - removeBanner() export in adService.ts — delegates to AdMob.removeBanner
  - GameScreen banner lifecycle useEffect — mounts banner, listens for SizeChanged, removes on cleanup
  - Dynamic paddingBottom on GameScreen container driven by bannerHeight state
  - 6 new adService unit tests (Tests 9-14) covering consent gating, ad options, rejection propagation

affects: [08-02-device-verification, 09-interstitial-ad]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - showBanner awaits waitForConsent() before any AdMob call — consent gate pattern
    - Capacitor.isNativePlatform() early-return guard in React useEffect — native-only effect pattern
    - listenerHandle?.remove() before removeBanner() in cleanup — listener-before-API teardown order (Pitfall 5)
    - bannerHeight state defaults to 0 — silent failure pattern (BANNER-05)

key-files:
  created: []
  modified:
    - src/services/adService.ts
    - src/services/__tests__/adService.test.ts
    - src/screens/GameScreen/GameScreen.tsx

key-decisions:
  - "Used BannerAdSize / BannerAdPosition full enum names (verified in node_modules v8.0.0) — no alias fallback needed"
  - "Banner useEffect uses empty [] dep array so banner mounts once per GameScreen mount, not per puzzle change"
  - "listenerHandle removal placed BEFORE removeBanner() call in cleanup per RESEARCH.md Pitfall 5"
  - "SizeChanged event used (not Loaded) for height — Loaded callback has no size info in v8.0.0"

patterns-established:
  - "Consent-gated ad functions: always await waitForConsent() as first line in showBanner-style functions"
  - "Native-only effects: if (!Capacitor.isNativePlatform()) return; as first line in Capacitor useEffects"

requirements-completed: [BANNER-01, BANNER-02, BANNER-03, BANNER-04, BANNER-05]

# Metrics
duration: 12min
completed: 2026-04-13
---

# Phase 8 Plan 01: Banner Service + GameScreen Lifecycle Summary

**`adService.showBanner()` consent-gated with ADAPTIVE_BANNER + BOTTOM_CENTER; GameScreen wires SizeChanged-driven dynamic paddingBottom with correct listener-before-API cleanup order**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-13T11:35:00Z
- **Completed:** 2026-04-13T11:37:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `adService.ts` with `showBanner()` (consent-gated, ADAPTIVE_BANNER, BOTTOM_CENTER) and `removeBanner()`
- Added 6 new unit tests (Tests 9-14): consent deferred-promise test, ad options assertion, isTesting flag, removeBanner contract, rejection propagation — all green alongside existing 8 Tests
- Wired banner lifecycle into `GameScreen.tsx` with native guard, SizeChanged listener for exact height, empty dep array, and correct cleanup ordering

## Task Commits

1. **Task 1: Extend adService with showBanner/removeBanner + tests** - `c06ea86` (feat)
2. **Task 2: Wire banner lifecycle into GameScreen** - `d9aaef0` (feat)

## Files Created/Modified

- `src/services/adService.ts` — Added `BannerAdSize`/`BannerAdPosition` imports, `showBanner()`, `removeBanner()`
- `src/services/__tests__/adService.test.ts` — Extended vi.mock with banner mocks + BannerAdSize/Position/Events; added Tests 9-14
- `src/screens/GameScreen/GameScreen.tsx` — Added Capacitor/AdMob imports, `bannerHeight` state, banner useEffect, `paddingBottom: bannerHeight` on container

## Decisions Made

- Used `BannerAdSize` / `BannerAdPosition` full enum names — both verified present in `@capacitor-community/admob` v8.0.0 node_modules; no alias fallback needed
- Empty `[]` dependency array on banner useEffect is intentional: banner mounts once when GameScreen mounts, not on each puzzle navigation within the screen
- `listenerHandle?.remove()` placed before `void removeBanner()` in cleanup per RESEARCH.md Pitfall 5 (remove listeners before stopping the ad, not after)
- `BannerAdPluginEvents.SizeChanged` used (not `Loaded`) because `Loaded` callback has no size info in v8.0.0; `SizeChanged` provides `AdMobBannerSize.height`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `BannerAdSize` / `BannerAdPosition` resolved cleanly on first TypeScript check — no alias fallback required (RESEARCH.md Open Question #1 resolved: full names work).

The Vite build warning about `@capacitor/core` dynamic/static import is pre-existing (present before Phase 8), not introduced by this plan.

No React warnings from the empty `[]` dependency array — the effect correctly has no reactive dependencies (banner lifecycle is not tied to route params).

## Verification Results

- `npm test -- adService`: 14 tests pass (8 existing + 6 new)
- `npm test` (full suite): 136 tests pass, 0 failures
- `npx tsc --noEmit`: exits 0, no errors
- `npm run build`: succeeds in 2.00s

## Next Phase Readiness

- BANNER-01, BANNER-02, BANNER-05 are unit-verified
- BANNER-03 (dynamic padding from SizeChanged) and BANNER-04 (removeBanner on cleanup) are code-complete and await device verification in Plan 02
- `showBanner()` / `removeBanner()` are ready for Plan 02 device checkpoint

---
*Phase: 08-banner-ad*
*Completed: 2026-04-13*
