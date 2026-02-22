---
phase: 04-firebase-integration
plan: 01
subsystem: auth
tags: [firebase, zustand, react, typescript, google-auth, anonymous-auth]

# Dependency graph
requires:
  - phase: 03-puzzle-data-and-navigation
    provides: App.tsx routing structure and screen components that auth gate wraps
provides:
  - Firebase app singleton with HMR-safe initialization (auth + db exports)
  - Zustand auth store subscribed to onAuthStateChanged
  - Blocking AuthPromptScreen with Google and anonymous sign-in
  - App.tsx auth gate pattern (isLoading spinner -> AuthPromptScreen -> Routes)
affects:
  - 04-02 (score submission needs auth.currentUser)
  - 04-03 (leaderboard display needs user identity for highlighting)
  - 04-04 (anonymous-to-Google account linking builds on this auth flow)
  - 04-05 (profile/settings needs useAuthStore)

# Tech tracking
tech-stack:
  added: [firebase@12.9.0]
  patterns:
    - HMR-safe Firebase init with getApps().length guard
    - initAuth() called in main.tsx before first React render
    - onAuthStateChanged drives all auth state via Zustand
    - isLoading gate prevents AuthPromptScreen flash for returning users

key-files:
  created:
    - src/firebase.ts
    - src/store/authStore.ts
    - src/screens/AuthPromptScreen/AuthPromptScreen.tsx
    - src/screens/AuthPromptScreen/AuthPromptScreen.module.css
    - .env.example
  modified:
    - src/main.tsx
    - src/App.tsx

key-decisions:
  - "Firebase SDK: modular imports from subpaths only (no deprecated namespaced API)"
  - "No Zustand persist for auth — Firebase SDK owns persistence in IndexedDB"
  - "initAuth() called in main.tsx outside React tree so listener is active before first render"
  - "isLoading spinner prevents AuthPromptScreen flash for returning Google/anonymous users"

patterns-established:
  - "HMR guard: const app = getApps().length ? getApp() : initializeApp(config)"
  - "Auth listener pattern: initAuth returns unsubscribe fn, called before React render"
  - "Auth gate in App.tsx: isLoading -> spinner | !user -> AuthPromptScreen | user -> Routes"

requirements-completed: [REQ-038, REQ-039, REQ-041]

# Metrics
duration: 15min
completed: 2026-02-21
---

# Phase 4 Plan 01: Firebase Auth Integration Summary

**Firebase SDK installed with HMR-safe singleton, Zustand auth store driven by onAuthStateChanged, and blocking AuthPromptScreen with Google + anonymous sign-in gating all app routes**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-21T00:00:00Z
- **Completed:** 2026-02-21T00:15:00Z
- **Tasks:** 2 (Task 1 completed by user before session; Tasks 2-3 executed)
- **Files modified:** 7

## Accomplishments

- Firebase SDK (already in package.json) connected with HMR-safe `src/firebase.ts` exporting `auth` and `db` singletons
- Zustand `authStore` subscribed to `onAuthStateChanged` — auth state flows automatically from Firebase to React
- `AuthPromptScreen` blocks all app routing until user picks Google or anonymous sign-in, with loading and error states
- `App.tsx` auth gate: spinner during Firebase session check -> AuthPromptScreen if no user -> Routes if authenticated
- Auth state persists across page refresh (Firebase IndexedDB) — returning users skip prompt immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: Firebase project setup and .env configuration** - completed by user before session (no commit)
2. **Task 2: Install Firebase SDK and create firebase.ts** - `cdb3156` (feat)
3. **Task 3: Auth store + AuthPromptScreen + App.tsx auth gate** - `ad09a7b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/firebase.ts` - Firebase app init with HMR guard, exports `auth` (Auth) and `db` (Firestore) singletons
- `src/store/authStore.ts` - Zustand store with user/isLoading state, initAuth/signInWithGoogle/signInAsGuest actions
- `src/screens/AuthPromptScreen/AuthPromptScreen.tsx` - Blocking launch UI with Google + anonymous buttons, loading/error states
- `src/screens/AuthPromptScreen/AuthPromptScreen.module.css` - Dark theme card layout matching app palette (#1a0f00 bg, #f5c842 primary)
- `src/main.tsx` - Added initAuth() call before first React render
- `src/App.tsx` - Added auth gate: isLoading spinner -> AuthPromptScreen -> Routes
- `.env.example` - Committed template with empty VITE_FIREBASE_* placeholders

## Decisions Made

- Used modular Firebase API (subpath imports) — deprecated namespaced API avoided per plan spec
- No Zustand `persist` middleware for auth — Firebase SDK owns its own persistence in browser IndexedDB; storing User object in memory only prevents stale serialized state issues
- `initAuth()` called in `main.tsx` before `createRoot()` so the `onAuthStateChanged` listener is active immediately; `isLoading` starts as `true` so the app shows a spinner (not the auth prompt) while Firebase resolves the existing session
- Error messages in AuthPromptScreen auto-clear after 3 seconds to avoid persistent UI clutter; popup-blocked errors get a specific helpful message

## Deviations from Plan

None - plan executed exactly as written. Firebase was already installed in package.json (included by user before session), so `npm install firebase` was skipped as a no-op.

## Issues Encountered

None. TypeScript checks passed immediately, build succeeded on first attempt.

## User Setup Required

Task 1 was completed by the user before this session:
- Firebase project created with Google + Anonymous auth providers enabled
- Firestore database created in Native mode
- Web app registered and `.env` populated with real VITE_FIREBASE_* values

No further external configuration required for this plan.

## Next Phase Readiness

- `auth` and `db` singletons ready for use in all subsequent Firebase plans
- `useAuthStore()` exposes `user` (User | null) for identity checks in score submission and leaderboard
- Auth gate ensures `user` is always non-null by the time Routes render — downstream plans can read `auth.currentUser` safely
- Ready for Plan 02: score submission on puzzle solve

---
*Phase: 04-firebase-integration*
*Completed: 2026-02-21*
