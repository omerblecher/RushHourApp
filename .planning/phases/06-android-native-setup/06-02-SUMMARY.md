---
phase: 06-android-native-setup
plan: 02
subsystem: infra
tags: [admob, android, adb, verification, capacitor]

# Dependency graph
requires:
  - phase: 06-android-native-setup plan 01
    provides: Plugin installed, manifest wired, env files created

provides:
  - "Human-verified: Android build succeeds with admob plugin registered"
  - "Human-verified: App launches without IllegalStateException"
  - "Human-verified: AD_ID permission in compiled APK (granted=true)"
  - "Human-verified: cap sync registers @capacitor-community/admob@8.0.0"

affects:
  - 07-ad-service

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Actual applicationId is com.otis.brooke.rushhour.puzzle (not com.rushhour.puzzle)"

key-files:
  created: []
  modified: []

key-decisions:
  - "Pitfall 3 fallback (tools:replace / AD_SERVICES_CONFIG property) was NOT required — playServicesAdsVersion=24.3.0 pin was sufficient"

patterns-established: []

requirements-completed:
  - SETUP-01
  - SETUP-02
  - SETUP-03
  - SETUP-04

# Metrics
duration: ~30min
completed: 2026-04-13
---

# Phase 06-02: Manual Verification Summary

**All four SETUP requirements confirmed on device: admob plugin synced, BUILD SUCCESSFUL, app launches clean, AD_ID permission granted=true in compiled APK**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-04-13
- **Tasks:** 1 (manual checkpoint)

## Verification Results

| Step | Requirement | Result |
|------|-------------|--------|
| 1 — cap sync | SETUP-01 | ✓ `@capacitor-community/admob@8.0.0` registered (5 plugins total) |
| 2 — Android Studio build | SETUP-03 | ✓ BUILD SUCCESSFUL, no manifest merge conflict |
| 3 — App launch | SETUP-02 | ✓ Launched to puzzle selection screen, no IllegalStateException |
| 4 — adb AD_ID grep | SETUP-04 | ✓ `com.google.android.gms.permission.AD_ID: granted=true` |

## cap sync output (Step 1)
```
[info] Found 5 Capacitor plugins for android:
       @capacitor-community/admob@8.0.0
       @capacitor-firebase/authentication@8.1.0
       @capacitor/app@8.0.1
       @capacitor/splash-screen@8.0.1
       @capacitor/status-bar@8.0.1
```

## adb output (Step 4)
```
adb shell dumpsys package com.otis.brooke.rushhour.puzzle | grep -i AD_ID
  com.google.android.gms.permission.AD_ID
  com.google.android.gms.permission.AD_ID: granted=true
```

## Issues Encountered
- **Wrong package name in plan:** Plan 02 referenced `com.rushhour.puzzle` but actual applicationId is `com.otis.brooke.rushhour.puzzle` (from `android/app/build.gradle`). Corrected during verification.
- **npm install not run on master:** The executor ran `npm install` inside a worktree; `node_modules` is gitignored so the admob package was absent on master. Required running `npm install` + `npx cap sync` on master before Android Studio could pick up the plugin. Fixed and committed (`7a96aa7`).

## Pitfall 3 Fallback
**NOT applied.** The `playServicesAdsVersion = '24.3.0'` pin in `variables.gradle` was sufficient — no `ProcessLibraryManifest` or `AD_SERVICES_CONFIG` manifest merge conflict occurred. AndroidManifest.xml has no `xmlns:tools` namespace and no `android.adservices.AD_SERVICES_CONFIG` property. Phase 10 does not need to account for this fallback.

## Next Phase Readiness
- Phase 6 is complete — all SETUP-01 through SETUP-05 requirements verified
- Phase 7 (adService.ts + UMP consent) can proceed
- Note for Phase 7: use applicationId `com.otis.brooke.rushhour.puzzle` in any adb or package-specific commands

---
*Phase: 06-android-native-setup*
*Completed: 2026-04-13*
