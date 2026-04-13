---
phase: 09-interstitial-ad
plan: "01"
subsystem: ad-service
tags: [admob, interstitial, unit-tests, typescript]
dependency_graph:
  requires: [phase-07-gdpr-consent, phase-08-banner-ad]
  provides: [prepareInterstitial, showInterstitialIfDue, _winCount, AD_TIMEOUT_MS]
  affects: [src/services/adService.ts]
tech_stack:
  added: []
  patterns: [Promise.race timeout guard, module-level session counter, Dismissed event auto-reload]
key_files:
  modified:
    - src/services/adService.ts
    - src/services/__tests__/adService.test.ts
decisions:
  - "_winCount is module-level (session-only) — no localStorage/Zustand; resets on app restart (INTER-05)"
  - "Promise.race with 5000ms timeout guarantees showInterstitialIfDue() always resolves (INTER-04)"
  - "Orphaned listener after timeout is accepted per locked CONTEXT.md design (RESEARCH Pitfall 2)"
  - "void prepareInterstitial() inside Dismissed listener is fire-and-forget reload (INTER-03)"
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_modified: 2
---

# Phase 9 Plan 01: adService Interstitial Functions Summary

**One-liner:** Extend adService.ts singleton with `prepareInterstitial()` and `showInterstitialIfDue()` using module-level `_winCount` frequency cap, `Promise.race` 5-second timeout, and `InterstitialAdPluginEvents.Dismissed` auto-reload.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add prepareInterstitial() + showInterstitialIfDue() + _winCount to adService.ts | 6e3dcb4 | src/services/adService.ts |
| 2 | Add interstitial unit tests to adService.test.ts (INTER-01/02/03/04/05) | 24493ac | src/services/__tests__/adService.test.ts |

## What Was Built

### adService.ts additions

- `InterstitialAdPluginEvents` added to the `@capacitor-community/admob` import
- `const AD_TIMEOUT_MS = 5000` — timeout constant for Promise.race guard
- `let _winCount = 0` — module-level session-only win counter
- `export async function prepareInterstitial()` — awaits consent, calls `AdMob.prepareInterstitial` with env ad ID and DEV testing flag
- `export async function showInterstitialIfDue()` — increments counter, early-returns on non-3rd calls, awaits consent, races Dismissed listener against 5-second timeout, triggers reload on dismiss

All Phase 7/8 exports (`initAdService`, `waitForConsent`, `showConsentForm`, `showBanner`, `removeBanner`) retained unchanged.

### adService.test.ts additions

8 new tests (Tests 15–22) covering all 5 INTER requirements:

| Test | Requirement | Behavior |
|------|-------------|----------|
| Test 15 | INTER-01 | prepareInterstitial calls AdMob.prepareInterstitial once after consent |
| Test 16 | INTER-01 | prepareInterstitial passes correct adId + isTesting from env |
| Test 17 | INTER-02 | counter: no show on win 1 or win 2 |
| Test 18 | INTER-02 | counter: show exactly once on win 3 |
| Test 19 | INTER-02 | counter: shows on win 3 AND win 6 (every 3rd) |
| Test 20 | INTER-03 | Dismissed fires → prepareInterstitial reload called |
| Test 21 | INTER-04 | timeout: resolves within 5s when Dismissed never fires (fake timers) |
| Test 22 | INTER-05 | vi.resetModules() resets _winCount to 0 |

Total tests: 22 passing (14 original + 8 new). All 36 tests pass across both the main repo and worktree.

## Verification

- `npx tsc --noEmit` — exits 0, no errors
- `npm run test -- --run src/services/__tests__/adService.test.ts` — 22/22 pass
- No localStorage/sessionStorage in adService.ts
- No new imports or dependencies added

## Deviations from Plan

None — plan executed exactly as written. Code shape matches CONTEXT.md locked design verbatim.

## Known Stubs

None. Both functions are fully implemented. The `VITE_ADMOB_INTERSTITIAL_ID` env var uses a Google test ID (already defined in `.env.development`); production ID is a Phase 10 concern per plan scope.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary surfaces introduced beyond what is documented in the plan's threat model (T-09-01 through T-09-04).

## Self-Check: PASSED

- `src/services/adService.ts` — FOUND
- `src/services/__tests__/adService.test.ts` — FOUND
- Commit 6e3dcb4 — FOUND (`git log --oneline | grep 6e3dcb4`)
- Commit 24493ac — FOUND (`git log --oneline | grep 24493ac`)
