# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** A fun, polished Rush Hour sliding puzzle game where players drag vehicles on a 6x6 grid to free the red car, competing on global leaderboards
**Current focus:** Phase 5 in progress — audio triggers and win celebration sequence complete

## Current Position

Phase: 5 of 5 (Sound and Polish) — IN PROGRESS
Plan: 3 of 5 in current phase — Plan 05-03 complete
Status: Phase 05 keyboard navigation and ARIA accessibility implemented; Tab/Arrow/Escape navigation wired; gold focus ring + screen reader labels added; ready for 05-04
Last activity: 2026-02-22 -- Plan 05-03 executed (keyboard navigation, ARIA grid/gridcell roles, focused vehicle ring, REQ-016 + NFR-005 satisfied)

Progress: [██████████] 84% (16/19 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 10 min
- Total execution time: 2.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-game-engine | 3/3 | 13 min | 4 min |
| 02-board-ui-and-drag-interaction | 3/3 | 10 min | 3 min |
| 03-puzzle-data-and-navigation | 4/4 | 87 min | 22 min |
| 04-firebase-integration | 5/5 | 26 min | 5 min |

**By Phase (continued):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 05-sound-and-polish | 3/5 | 45 min | 15 min |

**Recent Trend:**
- Last 5 plans: 04-05 (3 min), 05-01 (27 min), 05-02 (10 min), 05-03 (8 min)
- Trend: Phase 05 stabilizing fast; 05-03 clean execution (TypeScript compiled first pass, no deviations)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Pure game engine (engine/ folder) with zero React/Firebase deps built first, enabling isolated unit testing
- [Roadmap]: Vite + React 19 + TypeScript + Zustand + Firebase + Howler.js stack confirmed by research
- [Roadmap]: Custom Pointer Events for drag (not a library) -- Rush Hour only needs axis-constrained sliding
- [Roadmap]: Puzzles stored as local JSON (~16KB for 80 puzzles), not in Firestore
- [Roadmap]: REQ-016 (keyboard nav) and REQ-023 (win animation) deferred to Phase 5 polish
- [01-01]: Corrected plan's puzzle grid string from 35 to 36 chars with X on row 2 (exit row)
- [01-01]: Added Difficulty type alias for cleaner PuzzleDefinition interface
- [01-02]: Path validation checks ALL intermediate cells, not just destination -- prevents teleporting past blockers
- [01-02]: GameEngine as single cohesive class owning all state mutations (move, undo, reset)
- [02-01]: Gap-aware vehicle positioning: cellSize=(100%-15px)/6, left=col*(cellSize+3px) to align chips over cells despite 3px gaps
- [02-01]: vehicleLayer uses inset:var(--grid-padding) so 100% reference equals grid area exactly
- [02-01]: Removed rootDir from tsconfig (TS6059 conflict with vite.config.ts inclusion)
- [02-01]: Vehicle.size typed as 2|3 not 1 -- size===1 comparison is a TypeScript error
- [02-02]: data-board attribute on boardWrapper lets useDrag resolve board rect via closest() -- no prop drilling needed
- [02-02]: data-row/data-col on Vehicle div provide drag start position without store reads in event handler
- [02-02]: 150ms snap delay before store commit so React re-renders after CSS transition completes (no visual jump)
- [02-02]: Timer freeze via endTime branch in useEffect dependency array -- clean interval cleanup on win/reset
- [02-03]: Phase 2 board UI and drag interaction approved by user -- ready to proceed to Phase 3 routing and puzzle selection
- [03-01]: Expert difficulty classified by density (13+ vehicles AND 15+ moves) rather than pure minMoves (25+) -- 25+ move puzzles are combinatorially rare in random generation
- [03-01]: Generated 100 puzzles (25 per difficulty) exceeding the 80+ minimum requirement
- [03-01]: Build-time validation via prebuild hook ensures corrupt puzzle data never reaches production build
- [03-02]: Import from "react-router" not "react-router-dom" -- v7 merged packages
- [03-02]: DifficultyTabs use replace:true setSearchParams to avoid polluting browser history with tab switches
- [03-02]: ControlBar navigate(-1) replaces alert() placeholder -- generic back navigation works in any routing context
- [03-04]: Mute toggle is Phase 3 stub; Phase 5 reads 'rushhour_muted' localStorage key on Howler.js init
- [03-04]: REQ-032 false positive -- personal best shown in WinModal per locked CONTEXT.md decision (tiles show checkmark only)
- [04-01]: No Zustand persist for auth -- Firebase SDK owns persistence in IndexedDB; user object stored in memory only
- [04-01]: initAuth() called in main.tsx before createRoot() so listener is active before first React render
- [04-01]: isLoading gate in App.tsx prevents AuthPromptScreen flash for returning users with valid sessions
- [04-01]: Modular Firebase imports only -- deprecated namespaced API not used
- [04-02]: submitScore() uses optimistic write + silent rejection: security rule rejects non-improvements, client swallows error silently
- [04-02]: mergeAnonymousScores() iterates ALL_PUZZLES client-side (no collectionGroup query) -- anon user docs can't be queried by uid server-side
- [04-02]: Display name length: 2-20 chars (Claude's discretion per CONTEXT.md)
- [04-02]: ScoreDoc interface exported from scoreService for consistent typing in leaderboard hook
- [04-03]: getDocs over onSnapshot for leaderboard -- one-time read is cheaper; live updates not needed since modal is ephemeral
- [04-03]: formatTime extracted to src/utils/formatTime.ts -- avoids duplication between WinModal and LeaderboardModal
- [04-03]: rank=-1 sentinel for pinned out-of-top-50 entry -- consumers check rank === -1 to skip rank display
- [04-04]: isNewPersonalBest computed before recordCompletion() mutates progressStore -- read prevBest before store update
- [04-04]: WinModal owns useLeaderboard call internally -- avoids threading rank state through GameScreen
- [04-04]: PuzzleSelectScreen opens LeaderboardModal as overlay (not navigation) for consistency with WinModal
- [04-04]: Leaderboard trophy button visible only on tile hover (opacity:0 -> opacity:0.8) to avoid cluttering the grid
- [04-05]: Anonymous upgrade wired internally in LeaderboardModal (onSignInToCompete prop kept for backward compat)
- [04-05]: ProfileScreen shows display name form only for non-anonymous users; anon users see upgrade notice
- [04-05]: Personal stats sourced from progressStore (localStorage), not Firestore leaderboard data
- [Phase 05-01]: soundService is a module-level singleton (Howl instances created once at load) to prevent audio context exhaustion; Howler.mute() used for global mute with localStorage persistence
- [Phase 05-02]: playSlide() fires in snapTimerRef callback ONLY when cell changed -- prevents 60fps audio spam during drag
- [Phase 05-02]: Win sequence uses setTimeout(2000) with useEffect cleanup to prevent memory leak if user navigates during animation
- [Phase 05-02]: Board input locked via pointer-events:none on both boardWrapper and vehicleLayer during win animation (belt-and-suspenders)
- [Phase 05-02]: ControlBar mute button removed; GameHeader is single mute control surface
- [Phase 05-03]: selectedVehicleId state lives in Board; Board orchestrates keyboard moves, Vehicle is display-only
- [Phase 05-03]: focusedShadow applied as inline style to override inline shadowStyle (inline wins over CSS class)
- [Phase 05-03]: Invalid-axis arrow key presses silently ignored — no beep, no feedback, early return
- [Phase 05-03]: onFocus on Vehicle auto-selects via Tab, enabling immediate arrow-key moves without extra click

### Pending Todos

None.

### Blockers/Concerns

- Verify Howler.js is still actively maintained; Web Audio API fallback exists if needed
- ~~80+ puzzle definitions need to be sourced or created with verified solvability~~ RESOLVED: 100 puzzles generated and validated

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 05-03-PLAN.md (keyboard navigation, ARIA accessibility, REQ-016 + NFR-005)
Resume file: .planning/phases/05-sound-and-polish/05-03-SUMMARY.md
