---
phase: 04-firebase-integration
plan: 04
subsystem: ui
tags: [react, firebase, firestore, typescript, css-modules, leaderboard]

# Dependency graph
requires:
  - phase: 04-02
    provides: submitScore() in scoreService.ts, Firestore composite index
  - phase: 04-03
    provides: useLeaderboard hook, LeaderboardModal component, formatTime utility
provides:
  - GameScreen silently submits score to Firestore on puzzle win
  - WinModal: personal best banner, rank display, "View leaderboard" button opening LeaderboardModal
  - LeaderboardScreen: real Firestore-backed leaderboard replacing the Phase 3 stub
  - PuzzleSelectScreen: per-tile leaderboard trophy button opening LeaderboardModal overlay
affects:
  - 04-05 (ProfileScreen — sign-in upgrade flow triggered from LeaderboardModal's onSignInToCompete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - fire-and-forget score submission: void submitScore() in win useEffect — no await, no error surface
    - isNewPersonalBest computed before recordCompletion (reads store state before mutation)
    - LeaderboardModal stacked on top of WinModal via z-index layering (both use position:fixed)
    - onLeaderboard prop chain: PuzzleSelectScreen -> PuzzleGrid -> PuzzleTile

key-files:
  created: []
  modified:
    - src/screens/GameScreen/GameScreen.tsx
    - src/screens/GameScreen/WinModal.tsx
    - src/screens/GameScreen/WinModal.module.css
    - src/screens/LeaderboardScreen/LeaderboardScreen.tsx
    - src/screens/LeaderboardScreen/LeaderboardScreen.module.css
    - src/screens/PuzzleSelectScreen/PuzzleSelectScreen.tsx
    - src/screens/PuzzleSelectScreen/PuzzleGrid.tsx
    - src/screens/PuzzleSelectScreen/PuzzleTile.tsx
    - src/screens/PuzzleSelectScreen/PuzzleTile.module.css

key-decisions:
  - "isNewPersonalBest computed before recordCompletion() mutates progressStore — read prevBest before store update"
  - "WinModal uses useLeaderboard internally to compute rank — avoids threading rank state through GameScreen"
  - "PuzzleSelectScreen opens LeaderboardModal as overlay (not navigation) for consistency with WinModal"
  - "PuzzleGrid threaded as prop chain (PuzzleSelectScreen -> PuzzleGrid -> PuzzleTile) — no context used"
  - "formatTime local duplicate removed from WinModal; now imports shared src/utils/formatTime.ts"
  - "Leaderboard trophy button visible only on tile hover (opacity:0 -> opacity:0.8) to avoid cluttering the grid"

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 4 Plan 04: WinModal + Leaderboard Integration Summary

**Score submission wired silently on win, WinModal enhanced with personal best banner + rank display + leaderboard overlay, LeaderboardScreen replaced Phase 3 stub with real Firestore data, PuzzleSelectScreen gained per-tile leaderboard trophy button**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T11:12:42Z
- **Completed:** 2026-02-21T11:15:42Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

### Task 1: GameScreen + WinModal Leaderboard Integration

- `GameScreen.tsx`: reads `getBest(puzzleId)` before `recordCompletion()` to compute `isNewPersonalBest` accurately (before the store mutates), then calls `void submitScore(puzzleId, moves, timeMs, minMoves)` fire-and-forget
- `WinModal.tsx`: added `isNewPersonalBest` prop, `useLeaderboard(puzzleId)` internal hook call, `showLeaderboard` state
  - "New personal best!" gold gradient banner shown when `isNewPersonalBest` is true
  - Rank display (`#N on this puzzle!`) for non-anonymous users found in top 50 entries
  - "View leaderboard" button opens `LeaderboardModal` as an overlay stacked on top of WinModal
  - Removed local `formatTime` duplicate; now imports from `src/utils/formatTime.ts`
- `WinModal.module.css`: added `.personalBestBanner` (gold gradient), `.rankDisplay` (1.5rem amber), `.viewLeaderboardButton` (secondary style)

### Task 2: Real LeaderboardScreen + PuzzleSelectScreen Access

- `LeaderboardScreen.tsx`: completely replaced Phase 3 stub with real implementation using `useLeaderboard`
  - Puzzle title derived from `puzzleId` param (e.g. "Puzzle 3 Leaderboard")
  - Loading skeleton, empty state, full table with user row highlighting, pinned out-of-top-50 row
  - Anonymous user note at bottom
- `LeaderboardScreen.module.css`: full styling with shimmer skeleton animation, table layout, user/pinned row colors
- `PuzzleTile.tsx`: added `onLeaderboard` prop and trophy icon button (top-left, opacity:0 → visible on hover)
  - `event.stopPropagation()` prevents tile click/navigation when trophy is clicked
- `PuzzleGrid.tsx`: threaded `onLeaderboard` prop from parent to `PuzzleTile`
- `PuzzleSelectScreen.tsx`: added `leaderboardPuzzleId` state; renders `LeaderboardModal` overlay when non-null

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GameScreen score submission + WinModal leaderboard integration | `d02c42c` | GameScreen.tsx, WinModal.tsx, WinModal.module.css |
| 2 | Real LeaderboardScreen + PuzzleSelectScreen leaderboard access | `6f79c2e` | LeaderboardScreen.tsx, LeaderboardScreen.module.css, PuzzleSelectScreen.tsx, PuzzleGrid.tsx, PuzzleTile.tsx, PuzzleTile.module.css |

## Decisions Made

- `isNewPersonalBest` is computed **before** `recordCompletion()` is called, because `recordCompletion` mutates the progressStore — reading `getBest()` after would always return the just-submitted record
- `WinModal` owns the `useLeaderboard` call internally rather than receiving `userRank` as a prop — avoids added state management complexity in `GameScreen`
- From `PuzzleSelectScreen`, leaderboard opens as a modal overlay (not route navigation) — consistent with the in-game WinModal experience and no back-navigation needed
- `PuzzleGrid` updated to thread the `onLeaderboard` prop chain — chosen over React context to keep the prop flow explicit and simple (only 2 levels deep)

## Deviations from Plan

None - plan executed exactly as written.

The plan noted that for `onSignInToCompete` in `WinModal`, passing `signInWithGoogle` (or a no-op) was acceptable for now. The full upgrade flow (anonymous-to-Google linking) was implemented in a pre-existing working-tree change for plan 04-05. The `signInWithGoogle` function from `authStore` was passed directly as `onSignInToCompete`, consistent with the plan's guidance.

## Self-Check: PASSED

- All 9 modified files confirmed on disk
- Commits d02c42c and 6f79c2e confirmed in git log
- TypeScript compiles clean (npm run typecheck: 0 errors)
