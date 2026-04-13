---
phase: 10-production-play-store
plan: "01"
subsystem: admob-setup
tags: [admob, privacy-policy, version-bump, ump-consent, play-store]
dependency_graph:
  requires: []
  provides:
    - ADMOB-SETUP.md guide for AdMob account and ad unit registration
    - docs/privacy-policy.html for GitHub Pages hosting
    - android/app/build.gradle versionCode 2 / versionName 1.1
    - adService.ts privacyPolicyUrl wired into UMP consent options
  affects:
    - Plan 10-02 (user fills real IDs, publishes policy, builds AAB)
tech_stack:
  added: []
  patterns:
    - AdmobConsentRequestOptions cast via `as AdmobConsentRequestOptions` to carry untyped privacyPolicyUrl field
key_files:
  created:
    - .planning/phases/10-production-play-store/ADMOB-SETUP.md
    - docs/privacy-policy.html
  modified:
    - android/app/build.gradle
    - src/services/adService.ts
decisions:
  - "Cast options object as AdmobConsentRequestOptions rather than using spread+any; cleaner and keeps debugGeography mutation working"
  - "privacyPolicyUrl placeholder is https://example.com/privacy-policy with prominent TODO comment — user MUST update in Plan 10-02"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  files_changed: 4
---

# Phase 10 Plan 01: AdMob Artifacts and Version Bump Summary

## One-liner

AdMob setup guide, privacy policy HTML, versionCode 2/versionName 1.1 bump, and privacyPolicyUrl placeholder wired into UMP consent options.

## What Was Built

All autonomous artifacts for Phase 10 production release prep — everything Claude can produce before the user has an AdMob account:

1. **ADMOB-SETUP.md** — 7-step guide covering AdMob account creation, app registration, banner/interstitial ad unit creation, UMP consent form configuration, ID fill-in for `.env.production` and `strings.xml`, and a note explaining why strings.xml needs the native App ID separately from .env.
2. **docs/privacy-policy.html** — Standalone HTML privacy policy page ready for GitHub Pages hosting. Declares AdMob advertising ID and device info collection, Firebase Auth email/display name storage, Firestore puzzle progress storage. Includes a contact email placeholder and `<!-- Replace ... -->` comment.
3. **android/app/build.gradle** — Version bump: `versionCode 1 → 2`, `versionName "1.0" → "1.1"`. Only these two lines changed.
4. **src/services/adService.ts** — `privacyPolicyUrl: 'https://example.com/privacy-policy'` added to the UMP `options` object in `runConsentFlow()`, with a TODO comment pointing to Plan 10-02 and a note explaining the `as AdmobConsentRequestOptions` cast (field not typed in plugin v8).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AdMob setup guide and privacy policy HTML | f91c9a6 | ADMOB-SETUP.md, docs/privacy-policy.html |
| 2 | Version bump + privacyPolicyUrl in adService.ts | 96685a2 | android/app/build.gradle, src/services/adService.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `privacyPolicyUrl` not in `AdmobConsentRequestOptions` type definition**
- **Found during:** Task 2
- **Issue:** Plugin v8 `AdmobConsentRequestOptions` interface only declares `debugGeography`, `testDeviceIdentifiers`, `tagForUnderAgeOfConsent` — no `privacyPolicyUrl` field. TypeScript would reject a direct assignment.
- **Fix:** Used `as AdmobConsentRequestOptions` cast on the options literal, with a comment explaining the cast reason. This is the cleaner of the two approaches the plan offered (vs. spread+any).
- **Files modified:** src/services/adService.ts
- **Commit:** 96685a2

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/services/adService.ts | `privacyPolicyUrl: 'https://example.com/privacy-policy'` | Placeholder URL — user must replace with real GitHub Pages URL in Plan 10-02 before AAB build |
| docs/privacy-policy.html | `[YOUR_EMAIL]` contact placeholder | User must fill in real support email before publishing |

## Threat Surface

No new network endpoints or trust boundary changes introduced. Privacy policy HTML is static content with no secrets. AdMob setup guide is in `.planning/` (not served publicly). Placeholder URL in adService.ts is visibly marked TODO per T-10-03 mitigation.

## Self-Check: PASSED

- FOUND: .planning/phases/10-production-play-store/ADMOB-SETUP.md
- FOUND: docs/privacy-policy.html
- FOUND: android/app/build.gradle
- FOUND: src/services/adService.ts
- FOUND: .planning/phases/10-production-play-store/10-01-SUMMARY.md
- FOUND: commit f91c9a6 (Task 1)
- FOUND: commit 96685a2 (Task 2)
