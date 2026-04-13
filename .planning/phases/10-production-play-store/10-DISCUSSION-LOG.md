# Phase 10: Production & Play Store - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 10-production-play-store
**Areas discussed:** AdMob account & real IDs, Privacy policy location, Play Store status & scope, Release signing & AAB build

---

## AdMob Account & Real IDs

| Option | Description | Selected |
|--------|-------------|----------|
| Account exists, IDs ready | Already have real App ID, Banner unit ID, Interstitial unit ID | |
| Account exists, need to register app | Have account but haven't registered this app yet | |
| No account yet | Need to create account, register app, and get all IDs from scratch | ✓ |

**User's choice:** No account yet

---

| Option | Description | Selected |
|--------|-------------|----------|
| Manual prerequisites + setup guide | Document steps in setup guide; assume IDs are in hand before running code plan | ✓ |
| Inline tasks in the plan | Include manual steps (create account, register app, create ad units) as explicit plan tasks | |

**User's choice:** Manual prerequisites + setup guide (recommended)

**Notes:** Setup guide (RELEASE-01) covers the manual AdMob steps. Code plan starts from "IDs are ready."

---

## Privacy Policy Location

| Option | Description | Selected |
|--------|-------------|----------|
| No policy exists yet | Need to create one from scratch | ✓ |
| In the app (React route) | Existing /privacy route | |
| External URL | Hosted externally, just needs AdMob disclosures added | |

**User's choice:** No policy exists yet

---

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Pages (simple static page) | Standalone HTML published to gh-pages branch. Free, permanent URL. | ✓ |
| Route inside the app | Add /privacy React route to the app itself | |
| External service (Privacy policy generator) | Use a hosted generator service | |

**User's choice:** GitHub Pages (recommended)

---

## Play Store Status & Scope

| Option | Description | Selected |
|--------|-------------|----------|
| No, first submission | Haven't submitted yet — need full listing creation | |
| Yes, v1.0 is live | Already published — update existing listing only | ✓ |

**User's choice:** Yes, v1.0 is live

---

## Release Signing & AAB Build

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keystore is configured | Signing config already set up in build.gradle | ✓ |
| APK was debug-signed or manually signed | Need to configure Gradle signing first | |
| Not sure | Plan should verify first | |

**User's choice:** Yes, keystore is configured (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Upload AAB + no Play Console errors | AAB uploads cleanly, passes automated checks, available to internal testers | ✓ |
| Upload + manual smoke test on device | Also install via Play and verify ads show with real IDs | |
| Upload + full pre-launch report clean | Wait for Play's pre-launch report crawler to complete | |

**User's choice:** Upload AAB + no Play Console errors (recommended)

---

## Claude's Discretion

- Setup guide format and location
- Privacy policy HTML structure and content
- Whether to add privacy policy URL to UMP consent form config in adService.ts
