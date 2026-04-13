---
phase: 07-gdpr-consent
plan: "02"
subsystem: ui
tags: [gdpr, consent, ump, admob, profile, privacy-settings]

# Dependency graph
requires:
  - phase: 07-gdpr-consent/07-01
    provides: adService singleton with showConsentForm export
  - phase: 06-android-native-setup
    provides: Capacitor Android build pipeline, adb deployment
provides:
  - Privacy Settings button in ProfileScreen wired to UMP showConsentForm
  - Device-verified GDPR-02 (EEA consent dialog on first launch)
  - Device-verified GDPR-03 (no dialog for non-EEA users)
  - Device-verified GDPR-05 (user can re-open privacy/consent settings)
affects: [src/screens/ProfileScreen, phase-08-admob-init]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "try/catch swallow on optional native UI — non-critical UMP calls wrapped so UI never crashes on rejection (T-07-07)"
    - "Universal button visibility — Privacy Settings shown to all users; non-EEA tap is silent no-op per RESEARCH.md Open Question 1"

key-files:
  created: []
  modified:
    - src/screens/ProfileScreen/ProfileScreen.tsx
    - src/screens/ProfileScreen/ProfileScreen.module.css

key-decisions:
  - "Privacy Settings button shown unconditionally (not gated by geography) — lower risk than conditional hiding; non-EEA rejection swallowed in try/catch"
  - "New section placed below Sign Out section, not inside it — keeps sign-out and privacy as independent affordances"
  - ".privacyButton uses white/transparent neutral styling to visually distinguish from red .signOutButton"

patterns-established:
  - "Optional native UI invocation: always wrap in try/catch, log warning in DEV only, never surface error to user"

requirements-completed: [GDPR-02, GDPR-05]

# Metrics
duration: ~30min (including device verification)
completed: 2026-04-13
---

# Phase 7 Plan 02: ProfileScreen Privacy Settings Button + Device Verification Summary

**"Privacy Settings" button added to ProfileScreen wired to UMP showConsentForm, with all three GDPR device verification scenarios passing on a real Android device.**

## Performance

- **Duration:** ~30 min (including build, deploy, and three device verification scenarios)
- **Started:** 2026-04-13
- **Completed:** 2026-04-13
- **Tasks:** 2 (Task 1 automated, Task 2 device checkpoint)
- **Files modified:** 2

## Accomplishments

- Added "Privacy Settings" button to bottom of ProfileScreen, styled with neutral white/transparent border distinct from the red Sign Out button
- Wired button to `adService.showConsentForm()` via async handler with try/catch swallowing errors silently in production (satisfies GDPR-05 and T-07-07)
- Device verification confirmed full UMP flow works correctly across all three GDPR scenarios on a real Android device

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Privacy Settings button and styles to ProfileScreen** - `9e2815a` (feat)
2. **Task 2: Device verification checkpoint** - human-verified; no code changes

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `src/screens/ProfileScreen/ProfileScreen.tsx` — Added `showConsentForm` import, `handlePrivacySettings` async handler with try/catch, and new Privacy Settings `<section>` below Sign Out
- `src/screens/ProfileScreen/ProfileScreen.module.css` — Added `.privacyButton` class with neutral white/transparent styling and `:hover` state

## Device Verification Results

### Scenario A — EEA debug on, consent form on first launch (GDPR-02)

**Result: PASS**

UMP consent dialog appeared on fresh launch with `VITE_ADMOB_DEBUG_EEA=true`. Google's "Privacy & Terms" native overlay displayed within a few seconds of app start. Dialog dismissed successfully after user interaction.

### Scenario B — Privacy Settings revisit entry point (GDPR-05)

**Result: PASS**

"Privacy Settings" button visible in ProfileScreen below Sign Out button. Tapping the button opened the UMP privacy options form. Form was dismissable. Button styled with subtle white/transparent border, visually distinct from the red Sign Out button.

### Scenario C — Non-EEA, no dialog on launch (GDPR-03)

**Result: PASS**

With `VITE_ADMOB_DEBUG_EEA` commented out, app launched directly to home/game screen with no consent dialog. Tapping "Privacy Settings" resulted in a silent no-op (try/catch swallowed the rejection). No crash. `.env.development` restored to `VITE_ADMOB_DEBUG_EEA=true` after verification.

## Decisions Made

- Chose universal button visibility (always shown) over geography-gated visibility — per RESEARCH.md Open Question 1, the try/catch approach is lower risk than conditional hiding. Non-EEA users who tap Privacy Settings get a silent no-op.
- Used a new `<section>` element below the Sign Out section rather than co-locating inside the same section, keeping the two affordances visually and semantically separate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Threat Model Coverage

| Threat | Disposition | Verified |
|--------|-------------|---------|
| T-07-07: Privacy button crashes ProfileScreen | mitigate | Scenario C confirmed — non-EEA rejection swallowed silently, no crash |
| T-07-08: Privacy button visible to non-EEA users | accept | Scenario C confirmed — silent no-op, no PII exposed |
| T-07-09: CSS class collision with signOutButton | mitigate | CSS Modules scoping verified by build pass + visual inspection |
| T-07-10: User cannot re-open consent | mitigate | Scenario B confirmed — Privacy Settings button opens UMP form |

## Known Stubs

None - no placeholder data or stub values introduced.

## Next Phase Readiness

- All 5 GDPR requirements (GDPR-01 through GDPR-05) are satisfied across Plan 01 + Plan 02
- Phase 7 GDPR consent implementation is complete and device-verified
- Phase 8 (AdMob initialization) can proceed — `waitForConsent()` gate is in place and verified to block ads until consent is collected
- `.env.development` is in correct state with `VITE_ADMOB_DEBUG_EEA=true` uncommented for future dev runs

---
*Phase: 07-gdpr-consent*
*Completed: 2026-04-13*
