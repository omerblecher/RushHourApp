---
phase: 07-gdpr-consent
plan: "01"
subsystem: ad-service
tags: [gdpr, consent, ump, admob, vitest, tdd]
dependency_graph:
  requires: [06-android-native-setup]
  provides: [adService-singleton, consent-gate, ump-flow]
  affects: [src/main.tsx, src/services/adService.ts]
tech_stack:
  added: ["@capacitor-community/admob UMP consent API"]
  patterns: [module-singleton, fire-and-forget, promise-gate, TDD-red-green]
key_files:
  created:
    - src/services/adService.ts
    - src/services/__tests__/adService.test.ts
  modified:
    - src/main.tsx
    - .env.development
decisions:
  - "showConsentForm export calls showPrivacyOptionsForm (revisit form) not showConsentForm (startup form) per RESEARCH.md Pitfall 2 — intentional naming mismatch to match CONTEXT.md D-01 public API"
  - "AdMob.initialize() deliberately excluded from Phase 7 — deferred to Phase 8 (T-07-06)"
  - "_consentReady safe default = Promise.resolve() so waitForConsent() never throws before initAdService() runs"
  - "initAdService() returns void (not Promise) — fire-and-forget matches soundService pattern"
metrics:
  duration: "2 min"
  completed: "2026-04-13"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 7 Plan 01: GDPR Consent Service Summary

**One-liner:** UMP consent singleton using AdMob plugin — promise-gated flow with EEA debug flag, 8 Vitest tests covering all branching paths, wired fire-and-forget before React mounts.

## What Was Built

`adService.ts` is a module-level singleton (matching `soundService.ts` pattern) that runs the Google UMP consent flow on every app launch. It exposes three named exports:

- `initAdService()` — fire-and-forget call from `main.tsx` before `createRoot`; sets `_consentReady` to the consent flow promise
- `waitForConsent()` — returns `_consentReady`; Phase 8/9 ad code awaits this before any ad API call
- `showConsentForm()` — revisit entry point for ProfileScreen "Privacy Settings" button (Plan 02); delegates to `AdMob.showPrivacyOptionsForm()`

The consent flow (`runConsentFlow`) calls `AdMob.requestConsentInfo` once, then shows the startup consent form only when `status === REQUIRED && isConsentFormAvailable === true`. Non-EEA users (NOT_REQUIRED) skip the dialog entirely. The `VITE_ADMOB_DEBUG_EEA=true` env var activates EEA debug geography for local testing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create adService.ts with UMP consent flow and failing unit tests (TDD) | aa6d2ff | src/services/adService.ts, src/services/__tests__/adService.test.ts |
| 2 | Wire initAdService into main.tsx and add debug env vars to .env.development | 0fbf53a | src/main.tsx, .env.development |

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run adService` — 8/8 adService tests | PASS |
| `npx vitest run` — full suite 65/65 | PASS |
| `npm run typecheck` | PASS |
| `grep -c "initAdService" src/main.tsx` | 2 (import + call) |
| `grep -c "AdMob.initialize" src/services/adService.ts` | 0 (scope guard) |
| `grep -q "VITE_ADMOB_DEBUG_EEA" .env.development` | PRESENT |
| `! grep -q "VITE_ADMOB_DEBUG_EEA" .env.production` | ABSENT (T-07-02 mitigated) |

## Threat Model Coverage

| Threat | Disposition | Verified |
|--------|-------------|---------|
| T-07-01: Advertising ID collected pre-consent | mitigate | _consentReady not resolved until after showConsentForm completes |
| T-07-02: Debug geography leaks to production | mitigate | grep confirms absent from .env.production |
| T-07-03: waitForConsent called before initAdService | mitigate | Safe default Promise.resolve(); main.tsx ordering enforced |
| T-07-04: Consent choice not persisted | accept | UMP SDK persists in Android SharedPreferences |
| T-07-05: runConsentFlow throws blocks ads | accept | Phase 8/9 must try/catch waitForConsent() |
| T-07-06: AdMob.initialize() called pre-consent | mitigate | Test 8 asserts initialize never called; grep confirms 0 occurrences |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - no placeholder data or stub values introduced.

## Self-Check: PASSED

- src/services/adService.ts: FOUND
- src/services/__tests__/adService.test.ts: FOUND
- src/main.tsx: FOUND (contains initAdService)
- .env.development: FOUND (contains VITE_ADMOB_DEBUG_EEA)
- Commit aa6d2ff: FOUND
- Commit 0fbf53a: FOUND
