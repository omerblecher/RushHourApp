---
phase: 09-interstitial-ad
plan: 03
status: complete
completed: 2026-04-13
---

# Plan 03 Summary — Device Verification Checkpoint

## What Was Verified

All 5 device checks passed on a physical Android device (emulator also used during debugging):

| Check | Requirement | Result |
|-------|-------------|--------|
| Win 1 & 2: no interstitial; win 3: interstitial appears | INTER-02 | ✅ Pass |
| Win 6: another interstitial (auto-reload works) | INTER-03 | ✅ Pass |
| Airplane mode: 3rd-win navigation completes within ~5s, no hang | INTER-04 | ✅ Pass |
| Force-close + reopen: win counter resets, no ad on win 1 | INTER-05 | ✅ Pass |
| "Back to Selection" on win 3 also triggers interstitial | INTER-02 | ✅ Pass |

## Bugs Fixed During Verification

Several issues were discovered and resolved during device testing:

1. **Listener race condition** — `addListener` was fire-and-forget; changed to `await addListener` so the Dismissed handler is guaranteed registered before `showInterstitial()` fires.

2. **Listener accumulation** — Added one-shot cleanup (`handle.remove()` inside the callback + after `Promise.race`) to prevent stale listeners accumulating across wins.

3. **Fireworks stuck after win** — Added `confetti.reset()` to the `useEffect([puzzleId])` cleanup to clear the canvas-confetti canvas on each puzzle navigation.

4. **AdMob loading-loop** — Removed `prepareInterstitial()` from the Dismissed callback entirely (violates AdMob's restriction on calling `loadAd` inside `onAdDismissedFullScreenContent`). Reload responsibility moved to GameScreen.

5. **White screen / blocked celebration** — Root cause: `bannerHeight` initialized to 0; `SizeChanged` event changing it to 64 caused a layout shift that flashed white and covered the 2-second win animation. Fixed by initializing `bannerHeight` to `Capacitor.isNativePlatform() ? 64 : 0`.

6. **Interstitial reload timing** — `prepareInterstitial()` now fires from a `useEffect([puzzleId])` with a 5-second delay (fires during active gameplay, not during win animations or transitions).

7. **WinModal state flash** — `setShowWinModal(false)` moved to the top of `handleWinNavigate` (before the interstitial await) so the modal closes immediately on tap, preventing a render of the previous puzzle's solved board after the ad dismisses.

## Test Suite

79/79 tests passing (`npm run test`).
