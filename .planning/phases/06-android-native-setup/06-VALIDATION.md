---
phase: 6
slug: android-native-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `npm test`) |
| **Config file** | none — uses vite.config.ts implicitly |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + manual device checks complete
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SETUP-01 | — | N/A | manual | `npx cap sync` (visual inspection) | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | SETUP-03 | — | N/A | file-check | `grep 'playServicesAdsVersion' android/variables.gradle` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | SETUP-02 | T-InfoDisc | Test App ID only in dev | file-check | `grep 'admob_app_id' android/app/src/main/res/values/strings.xml` | ✅ | ⬜ pending |
| 06-01-04 | 01 | 1 | SETUP-04 | — | N/A | manual | `adb shell dumpsys package com.otis.brooke.rushhour.puzzle \| grep AD_ID` | N/A | ⬜ pending |
| 06-01-05 | 01 | 1 | SETUP-05 | T-InfoDisc | TODO placeholders in .env.production | file-check | `cat .env.development .env.production` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No new test files required — Phase 6 changes are native Android config files and Vite env files.
- Existing Vitest suite covers TypeScript regression.

*Existing infrastructure covers all phase requirements for automated tests. Manual verification is the acceptance gate for Android runtime requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx cap sync` completes without error | SETUP-01 | Requires Android SDK toolchain / Capacitor CLI runtime | Run `npx cap sync` and verify output contains `@capacitor-community/admob (8.0.0)` under Capacitor plugins |
| App launches on Android without crash | SETUP-02 | Requires Android emulator or physical device | Build and launch app; verify no `IllegalStateException` in logcat |
| `AD_ID` permission in compiled APK manifest | SETUP-04 | Requires device/emulator with adb | `adb shell dumpsys package com.otis.brooke.rushhour.puzzle \| grep AD_ID` must return a result |
| Gradle build succeeds with no manifest merge conflict | SETUP-03 | Requires Java/JDK (not in bash PATH; requires Android Studio) | Sync project in Android Studio; build must complete without `ProcessLibraryManifest` error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
