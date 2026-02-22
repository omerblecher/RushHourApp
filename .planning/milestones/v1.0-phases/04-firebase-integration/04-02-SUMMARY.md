---
phase: 04-firebase-integration
plan: 02
subsystem: database
tags: [firestore, security-rules, typescript, firebase, leaderboard, display-name]

# Dependency graph
requires:
  - phase: 04-01
    provides: firebase.ts singleton (auth + db), authStore with user state

provides:
  - firestore.rules: server-side data integrity enforcement for all collections
  - firestore.indexes.json: composite index for leaderboard compound sort query
  - src/services/scoreService.ts: submitScore, mergeAnonymousScores, setDisplayName, getUserDisplayName, isDisplayNameAvailable, updateScoreDisplayNames

affects:
  - 04-04 (game integration will call submitScore from GameScreen on win)
  - 04-05 (profile screen will call setDisplayName, getUserDisplayName)
  - 04-03 (leaderboard hook depends on the scores collection structure defined here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Firestore security rules as the primary integrity layer (not Cloud Functions)
    - writeBatch for atomic multi-document writes (usernames + users)
    - Silent score submission: try/catch swallows all errors, returns void
    - Best-effort background updates for denormalized displayName in score docs
    - getAfter() in security rules for batch atomicity verification

key-files:
  created:
    - firestore.rules
    - firestore.indexes.json
    - src/services/scoreService.ts
  modified: []

key-decisions:
  - "submitScore() uses optimistic write + silent rejection: security rule rejects non-improvements, client swallows the error silently"
  - "updateScoreDisplayNames() uses individual getDoc per puzzle (not a collection query) to check existence before updating denormalized displayName"
  - "mergeAnonymousScores() iterates ALL_PUZZLES client-side (no collectionGroup query) since anonymous user scores cannot be queried (rules block anon reads by uid-based doc)"
  - "setDisplayName() minimum length set to 2 chars, maximum 20 chars (Claude's discretion per CONTEXT.md)"
  - "ScoreDoc interface exported for use by leaderboard hook in 04-03"

patterns-established:
  - "Pattern: All Firestore write services return void and swallow errors for user-facing operations"
  - "Pattern: writeBatch for atomic cross-collection writes (users + usernames)"
  - "Pattern: getUserDisplayName() multi-tier fallback: Firestore > auth token > 'Player'"

requirements-completed: [REQ-044, REQ-045, REQ-046, NFR-006]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 4 Plan 02: Score Service and Security Rules Summary

**Firestore security rules enforcing auth/ownership/minMoves/improvement-only writes, composite leaderboard index, and scoreService with silent submitScore, atomic setDisplayName, and best-effort mergeAnonymousScores**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-21T11:06:23Z
- **Completed:** 2026-02-21T11:08:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Firestore security rules covering all 5 integrity requirements: authentication, non-anonymous enforcement, ownership (userId == uid), minMoves server validation, improvement-only writes
- Composite index definition for leaderboard `orderBy(moves,asc).orderBy(timeMs,asc)` compound query
- `submitScore()` silent, includes minMoves in payload, no-ops for anonymous users, swallows security rule rejections
- `setDisplayName()` uses writeBatch for atomic users + usernames update, returns 'ok'|'taken'|'invalid'
- `mergeAnonymousScores()` iterates ALL_PUZZLES, copies anon scores to Google account where score is better
- `updateScoreDisplayNames()` best-effort batch update of denormalized displayName across all existing score docs

## Task Commits

Each task was committed atomically:

1. **Task 1: Firestore security rules and composite index** - `c2411d0` (feat)
2. **Task 2: Score service and display name service** - `24bb98d` (feat)

**Plan metadata:** (final docs commit below)

## Files Created/Modified
- `firestore.rules` - Security rules: auth, non-anonymous, ownership, minMoves validation, improvement-only writes, usernames batch atomicity via getAfter
- `firestore.indexes.json` - Composite index on scores(moves ASC, timeMs ASC) for leaderboard compound sort
- `src/services/scoreService.ts` - Full score and display name service: submitScore, getUserDisplayName, isDisplayNameAvailable, setDisplayName, updateScoreDisplayNames, mergeAnonymousScores

## Decisions Made
- `submitScore()` writes optimistically — the security rule is the enforcement layer; client swallows the rejection silently (requirement: silent failures)
- `updateScoreDisplayNames()` reads each puzzle doc individually rather than a collectionGroup query, keeping the implementation simple and avoiding index requirements for the update path
- `mergeAnonymousScores()` uses per-puzzle error handling so a single puzzle failure doesn't abort the entire merge
- Display name length: 2-20 characters (minimum 2 prevents single-char names, maximum 20 matches RESEARCH.md recommendation)
- `ScoreDoc` interface is exported so the leaderboard hook (04-03) can type-cast Firestore documents consistently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Firestore rules and index are deployed via `firebase deploy --only firestore` (handled in human verification checkpoint, not this plan).

## Next Phase Readiness
- `submitScore()` is ready to be called from GameScreen on puzzle win (04-04)
- `setDisplayName()` and `getUserDisplayName()` are ready for ProfileScreen (04-05)
- `mergeAnonymousScores()` is ready to be called from the auth upgrade flow (04-03)
- Security rules must be deployed to Firebase before integration can be tested end-to-end

---
*Phase: 04-firebase-integration*
*Completed: 2026-02-21*
