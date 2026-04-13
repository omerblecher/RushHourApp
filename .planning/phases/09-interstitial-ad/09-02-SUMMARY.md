---
phase: 09-interstitial-ad
plan: "02"
subsystem: game-screen-ad-integration
tags: [admob, interstitial, winmodal, gamescreen, react, typescript]
dependency_graph:
  requires: [09-01-adService-interstitial-functions, phase-08-banner-ad]
  provides: [WinModal-callback-driven, GameScreen-interstitial-preload, handleWinNavigate]
  affects:
    - src/screens/GameScreen/WinModal.tsx
    - src/screens/GameScreen/GameScreen.tsx
tech_stack:
  added: []
  patterns:
    - callback-injection (WinModal navigation props)
    - async wrap pattern (handleWinNavigate awaits showInterstitialIfDue before action())
    - mount-time preload (useEffect with isNativePlatform guard)
key_files:
  modified:
    - src/screens/GameScreen/WinModal.tsx
    - src/screens/GameScreen/GameScreen.tsx
decisions:
  - "WinModal drops useNavigate and becomes fully callback-driven — onNextPuzzle/onBackToSelection injected from GameScreen"
  - "difficulty and onClose removed from WinModalProps — new callbacks include setShowWinModal(false)"
  - "getNextPuzzle kept in both WinModal (button label) and GameScreen (navigation target)"
  - "handleWinNavigate fires-and-forgets via void from sync onClick — React never sees the Promise"
  - "Capacitor.isNativePlatform() guard in both preload useEffect and handleWinNavigate — no ad API calls on web"
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_modified: 2
---

# Phase 9 Plan 02: GameScreen & WinModal Interstitial Wiring Summary

**One-liner:** WinModal refactored to callback-driven navigation (dropping useNavigate) and GameScreen wired with interstitial preload on mount plus handleWinNavigate wrapper that awaits showInterstitialIfDue() before every post-win navigation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor WinModal.tsx — drop useNavigate, accept onNextPuzzle/onBackToSelection props | d65b723 | src/screens/GameScreen/WinModal.tsx |
| 2 | Wire GameScreen.tsx — preload useEffect + handleWinNavigate + updated WinModal JSX | 804467f | src/screens/GameScreen/GameScreen.tsx |

## What Was Built

### WinModal.tsx changes

- Removed `useNavigate` import (no longer owns navigation)
- Removed `difficulty` and `onClose` from `WinModalProps`
- Added `onNextPuzzle: () => void` and `onBackToSelection: () => void` props
- Removed `handleNextPuzzle` and `handleBackToSelection` internal handlers
- Wired `onClick={onNextPuzzle}` and `onClick={onBackToSelection}` directly on action buttons
- Kept `getNextPuzzle(puzzleId)` for computing "Next Puzzle" vs "More Puzzles" button label
- All leaderboard code (useLeaderboard, LeaderboardModal, rank display) preserved unchanged

### GameScreen.tsx changes

- Extended adService import: added `prepareInterstitial` and `showInterstitialIfDue`
- Extended puzzleIndex import: added `getNextPuzzle`
- Added interstitial preload useEffect (runs once on mount, guarded by `Capacitor.isNativePlatform()`) — satisfies INTER-01
- Added `handleWinNavigate` async wrapper: awaits `showInterstitialIfDue()` on native, then calls action() — satisfies INTER-02
- Updated `<WinModal>` JSX: removed `difficulty` and `onClose` props, added `onNextPuzzle` and `onBackToSelection` callbacks
- `onNextPuzzle` callback: calls `getNextPuzzle(puzzleId)` and navigates to next puzzle or puzzle selection fallback
- `onBackToSelection` callback: navigates to puzzle selection screen
- Both callbacks include `setShowWinModal(false)` — no separate onClose needed
- Phase 8 banner ad useEffect preserved exactly as-is

## Verification

- `npx tsc --noEmit` — exits 0, no errors
- `npm run test -- --run` — 150/150 tests pass across 10 test files (no regressions)
- `grep -c "useNavigate" src/screens/GameScreen/WinModal.tsx` → 0
- `grep -c "Capacitor.isNativePlatform()" src/screens/GameScreen/GameScreen.tsx` → 3 (banner + preload + handleWinNavigate)

## Deviations from Plan

None — plan executed exactly as written. All code matches CONTEXT.md locked design verbatim.

## Known Stubs

None. Both files are fully implemented. The interstitial will show Google test ads in dev builds; production ad ID is a Phase 10 concern (already documented in Plan 03).

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary surfaces introduced beyond the plan's threat model (T-09-05 through T-09-07).

## Self-Check: PASSED

- `src/screens/GameScreen/WinModal.tsx` — FOUND (verified acceptance criteria)
- `src/screens/GameScreen/GameScreen.tsx` — FOUND (verified acceptance criteria)
- Commit d65b723 — FOUND (Task 1: WinModal refactor)
- Commit 804467f — FOUND (Task 2: GameScreen wiring)
- `npx tsc --noEmit` — exits 0
- `npm run test -- --run` — 150/150 pass
