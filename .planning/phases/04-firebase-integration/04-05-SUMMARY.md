---
phase: 04-firebase-integration
plan: 05
subsystem: auth
tags: [firebase, react, zustand, firestore, typescript]

# Dependency graph
requires:
  - phase: 04-02
    provides: scoreService (setDisplayName, getUserDisplayName, mergeAnonymousScores)
  - phase: 04-03
    provides: LeaderboardModal component with anon gate prop
provides:
  - upgradeAnonymousToGoogle action in authStore (happy path + credential-already-in-use merge + cancelled)
  - signOut action in authStore
  - upgradeStatus tracking field in authStore
  - LeaderboardModal anonymous gate wired internally to upgradeAnonymousToGoogle
  - ProfileScreen with display name editing, sign out, personal stats
  - /profile route in App.tsx
  - Profile navigation button in MainMenuScreen
affects: [05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [linkWithPopup for anonymous upgrade, credential-already-in-use merge pattern]

key-files:
  created:
    - src/screens/ProfileScreen/ProfileScreen.tsx
    - src/screens/ProfileScreen/ProfileScreen.module.css
  modified:
    - src/store/authStore.ts
    - src/components/LeaderboardModal/LeaderboardModal.tsx
    - src/components/LeaderboardModal/LeaderboardModal.module.css
    - src/App.tsx
    - src/screens/MainMenuScreen/MainMenuScreen.tsx
    - src/screens/MainMenuScreen/MainMenuScreen.module.css

key-decisions:
  - "Anonymous upgrade wired internally in LeaderboardModal — no onSignInToCompete prop needed; prop kept for backward compat"
  - "ProfileScreen shows display name form only for non-anonymous users; anonymous users see upgrade-to-Google notice instead"
  - "Personal stats (puzzles solved, best moves, fastest time) sourced from progressStore (localStorage), not Firestore"
  - "signOut uses firebaseSignOut; auth gate in App.tsx (user===null check) handles redirect to AuthPromptScreen automatically"
  - "credential-already-in-use path extracts credential via AuthError.credential, signs in as Google user, merges anon scores"

patterns-established:
  - "upgradeStatus: 'idle'|'upgrading'|'success'|'error' for tracking async upgrade state across components"
  - "Anon-gate UI pattern: show notice + Google button when isAnonymous, disable form sections"

requirements-completed: [REQ-040, REQ-041]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 4 Plan 05: Profile + Upgrade Flow Summary

**Anonymous-to-Google upgrade flow with score merge, ProfileScreen with display name editing and personal stats, and sign-out wired to auth gate redirect**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T11:12:40Z
- **Completed:** 2026-02-21T11:15:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `upgradeAnonymousToGoogle` in authStore handles all three branches: happy path (linkWithPopup preserves UID), user-cancelled popup, credential-already-in-use (mergeAnonymousScores anonUid -> googleUid)
- `signOut` action delegates to Firebase signOut; auth gate in App.tsx handles redirect automatically via onAuthStateChanged
- LeaderboardModal anonymous gate now calls upgradeAnonymousToGoogle internally with loading state ("Signing in...") and error feedback
- ProfileScreen: display name editing with 'ok'/'taken'/'invalid' feedback, anonymous notice with Google sign-in button, personal stats grid (puzzles solved, best moves, fastest time from progressStore), sign-out button
- /profile route added to App.tsx; profile button added to MainMenuScreen (absolute positioned top-right, muted styling)

## Task Commits

Each task was committed atomically:

1. **Task 1: Anonymous-to-Google upgrade flow + sign out in authStore** - `256f312` (feat)
2. **Task 2: ProfileScreen + navigation link in MainMenuScreen + App route** - `c659ae9` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/store/authStore.ts` - Added upgradeAnonymousToGoogle, signOut, upgradeStatus
- `src/components/LeaderboardModal/LeaderboardModal.tsx` - Wired upgradeAnonymousToGoogle internally; loading + error state
- `src/components/LeaderboardModal/LeaderboardModal.module.css` - Added .signInButton:disabled and .upgradeError styles
- `src/screens/ProfileScreen/ProfileScreen.tsx` - Created: display name form, anon notice, stats grid, sign-out
- `src/screens/ProfileScreen/ProfileScreen.module.css` - Created: dark-theme profile screen styles
- `src/App.tsx` - Added /profile route with ProfileScreen
- `src/screens/MainMenuScreen/MainMenuScreen.tsx` - Added profile button navigating to /profile
- `src/screens/MainMenuScreen/MainMenuScreen.module.css` - Added .profileButton and .container position:relative

## Decisions Made
- Anonymous upgrade wired internally in LeaderboardModal — the `onSignInToCompete` prop is kept for backward compatibility but not required; the modal reads from authStore directly
- ProfileScreen shows display name form only for non-anonymous users; anonymous users see an upgrade notice + Google sign-in button instead (editing profile is pointless for anon users who have no persistent identity)
- Personal stats (puzzles solved, best moves, fastest time) sourced from progressStore (localStorage) — these are local stats, not Firestore leaderboard data
- `signOut` action is simple (one-liner): firebaseSignOut(auth) then onAuthStateChanged handles the null -> App.tsx shows AuthPromptScreen
- `credential-already-in-use` path extracts credential via `(error as AuthError & { credential? }).credential`, signs in as Google user, then merges anonymous scores to the Google UID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log.

## Next Phase Readiness
- Phase 4 is now complete: auth, score submission, leaderboard display, display name management, profile/settings, and identity upgrade flow are all implemented
- Phase 5 (polish) can proceed: Howler.js sound integration, keyboard navigation, win animations, and any remaining UX polish
- Sound mute toggle reads `rushhour_muted` localStorage key (established in Phase 3 stub)

---
*Phase: 04-firebase-integration*
*Completed: 2026-02-21*
