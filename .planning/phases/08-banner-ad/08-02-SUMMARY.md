---
plan: 02
phase: 8
status: complete
completed: 2026-04-13
device: Medium Phone API 36.1 (Android 16 emulator, x86_64)
---

# Phase 8 Plan 02: Device Verification — SUMMARY

## Device Tested

- **Device:** Medium Phone API 36.1 (AVD) — Android 16 (API 36), x86_64
- **Build mode:** `--mode development` (loads `.env.development` with Google test IDs)
- **APK:** debug build, installed via `./gradlew installDebug`

## Verification Results

| Requirement | Description | Result |
|-------------|-------------|--------|
| BANNER-01 | Banner visible at bottom of GameScreen, below ControlBar | PASS |
| BANNER-02 | Adaptive banner width, BOTTOM_CENTER position | PASS |
| BANNER-03 | Bottom padding equal to banner height; no content obscured | PASS |
| BANNER-04 | Banner removed when navigating away from GameScreen | PASS |
| BANNER-05 | Airplane mode → no banner, no error UI, puzzle fully playable | PASS |

All 5 requirements confirmed by user ("approved").

## Issues Encountered and Resolved

### Issue 1: NullPointerException crash on banner show
**Symptom:** App crashed entering GameScreen with `NullPointerException` in `BannerExecutor.createNewAdView` — `addView()` called on null `ViewGroup`.  
**Root cause:** `AdMob.initialize()` was never called. The plugin's native view infrastructure was not set up before `showBanner()` ran.  
**Fix:** `initAdService()` now chains `AdMob.initialize()` before `runConsentFlow()`, so `waitForConsent()` (and `showBanner()`) block until the plugin is fully initialized. Test 8 updated from Phase 7 scope guard ("never calls initialize") to Phase 8 gate ("calls initialize exactly once").

### Issue 2: White flickering — blank banner overlay
**Symptom:** No visible ad content; white rectangle flickering in banner area every ~2 seconds.  
**Root cause:** `npm run build` uses production mode — `.env.development` not loaded — `VITE_ADMOB_BANNER_ID` resolved to `"TODO"` (placeholder). Ad load failed with error code 1 (invalid unit ID). `bannerAdSizeChanged` still fired, so `bannerHeight` was set and the empty native overlay was visible.  
**Fix:** Rebuilt with `npm run build -- --mode development` to load the correct Google test banner ID (`ca-app-pub-3940256099942544/6300978111`).

**Note for production:** Phase 10 will swap in real ad unit IDs via `.env.production`. Device builds for production must use `npm run build` (no `--mode development` flag).

## Logcat Summary

- `bannerAdSizeChanged` fired after banner loaded — `setBannerHeight` correctly updated
- `bannerAdLoaded` confirmed ad content delivered
- No unhandled exceptions related to banner code
- Calendar-related `ContentResolver` warnings from Google Play Services — unrelated to this phase

## Acceptance Criteria Check

- [x] BANNER-01 passes: banner visible at bottom of GameScreen (user confirmed)
- [x] BANNER-02 passes: banner is adaptive width and bottom-center (confirmed via visual)
- [x] BANNER-03 passes: ControlBar and puzzle board not obscured (user confirmed)
- [x] BANNER-04 passes: banner gone on every non-GameScreen route (user confirmed)
- [x] BANNER-05 passes: airplane mode → no banner, no error, puzzle playable (user confirmed)
- [x] `.planning/phases/08-banner-ad/08-02-SUMMARY.md` exists
- [x] Contains BANNER-01, BANNER-02, BANNER-03, BANNER-04, BANNER-05
- [x] No unhandled banner exceptions in logcat
