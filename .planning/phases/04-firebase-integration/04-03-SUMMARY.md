---
phase: 04-firebase-integration
plan: 03
subsystem: ui
tags: [react, firebase, firestore, typescript, css-modules]

# Dependency graph
requires:
  - phase: 04-01
    provides: authStore with user/isAnonymous, firebase.ts exports auth and db
  - phase: 04-02
    provides: Firestore composite index on puzzles/{id}/scores (moves asc, timeMs asc)
provides:
  - useLeaderboard hook — fetches top-50 scores + pinned user entry via Firestore getDocs/getDoc
  - LeaderboardModal component — full modal UI with loading skeleton, anon gate, user row highlight
  - formatTime utility — shared M:SS time formatter extracted from WinModal
affects:
  - 04-04 (WinModal integration — imports LeaderboardModal and opens it on "View leaderboard")
  - 04-04 (PuzzleSelectScreen integration — opens LeaderboardModal per puzzle)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getDocs (one-time read) over onSnapshot for leaderboard — cheaper Firestore reads
    - Two-fetch pattern: top-50 query then conditional getDoc for out-of-top-50 user
    - cancelled flag in useEffect cleanup to prevent setState after unmount
    - Silent error handling (catch sets empty arrays) for missing Firestore index during development

key-files:
  created:
    - src/hooks/useLeaderboard.ts
    - src/components/LeaderboardModal/LeaderboardModal.tsx
    - src/components/LeaderboardModal/LeaderboardModal.module.css
    - src/utils/formatTime.ts
  modified: []

key-decisions:
  - "getDocs over onSnapshot for leaderboard — one-time read is cheaper; live updates not needed since modal is ephemeral"
  - "formatTime extracted to src/utils/formatTime.ts — avoids duplication between WinModal and LeaderboardModal"
  - "Anonymous users see the anon gate + leaderboard table (read access preserved); only score submission and highlighting are gated"
  - "rank=-1 sentinel for pinned out-of-top-50 entry — consumers check rank === -1 to skip rank display"

patterns-established:
  - "Cancelled flag pattern: let cancelled = false; return () => { cancelled = true; } in useEffect for async fetch safety"
  - "Silent Firestore error catch: catch block sets empty state, isLoading false — missing index fails gracefully"

requirements-completed: [REQ-042, REQ-043]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 4 Plan 03: Leaderboard Hook and Modal Summary

**useLeaderboard hook (getDocs top-50 query with rank=-1 pinned entry) and LeaderboardModal component (loading skeleton, anonymous gate, user row highlighting) for Firestore-backed puzzle leaderboards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T11:06:31Z
- **Completed:** 2026-02-21T11:08:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `useLeaderboard` hook fetches top-50 scores from `puzzles/{puzzleId}/scores` with compound orderBy(moves, timeMs) + limit(50)
- Second `getDoc` fetch for users outside the top 50, returning entry with rank=-1 sentinel value
- `LeaderboardModal` renders all three states: loading skeleton (5 pulsing rows), anonymous gate with sign-in prompt, and ranked table with user row highlighted in amber
- Pinned "Your best" row appears below a `...` separator when user is outside top 50
- Extracted shared `formatTime(ms)` utility to `src/utils/formatTime.ts` to avoid duplication

## Task Commits

Each task was committed atomically:

1. **Task 1: useLeaderboard hook** - `839d8ff` (feat)
2. **Task 2: LeaderboardModal component** - `5182310` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/hooks/useLeaderboard.ts` - Firestore top-50 query hook with two-fetch pattern and anonymous user handling
- `src/components/LeaderboardModal/LeaderboardModal.tsx` - Modal overlay with loading, anon gate, table, and pinned row
- `src/components/LeaderboardModal/LeaderboardModal.module.css` - Dark wood/amber theme styles matching WinModal
- `src/utils/formatTime.ts` - Shared M:SS time formatter extracted from WinModal

## Decisions Made
- Used `getDocs` (one-time read) instead of `onSnapshot` — leaderboard modal is ephemeral; live updates not needed and `onSnapshot` would be more expensive
- Extracted `formatTime` to shared utility rather than duplicating in both modal files
- Anonymous users can still view the leaderboard (read access preserved per context decision); only score submission and user row highlighting are gated behind auth
- rank=-1 as sentinel for pinned out-of-top-50 entry — `LeaderboardModal` renders "—" for rank column, distinguishes from ranked entries

## Deviations from Plan

None - plan executed exactly as written.

The plan mentioned "copy from WinModal or extract to `src/utils/formatTime.ts` if that file doesn't already exist." The file did not exist, so it was created as a shared utility. This was within the plan's explicit guidance.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required beyond the Firestore composite index deployed in plan 04-02.

## Next Phase Readiness
- `useLeaderboard` and `LeaderboardModal` are ready to be wired into WinModal (plan 04-04) and PuzzleSelectScreen (plan 04-04)
- Consuming components need to pass `puzzleId` and `onSignInToCompete` (optional) to `LeaderboardModal`
- No blockers

---
*Phase: 04-firebase-integration*
*Completed: 2026-02-21*
