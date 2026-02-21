# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** A fun, polished Rush Hour sliding puzzle game where players drag vehicles on a 6x6 grid to free the red car, competing on global leaderboards
**Current focus:** Phase 4 in progress — Firebase Auth + Leaderboards (Plan 03 complete)

## Current Position

Phase: 4 of 5 (Firebase Integration) — IN PROGRESS
Plan: 3 of 5 in current phase — Plan 04-03 complete
Status: Phase 04 Plan 03 complete; ready for Plan 04-04 (WinModal + leaderboard integration)
Last activity: 2026-02-21 -- Plan 04-03 executed (useLeaderboard hook, LeaderboardModal component, formatTime utility)

Progress: [█████████░] 85% (11/13 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 12 min
- Total execution time: 2.02 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-game-engine | 3/3 | 13 min | 4 min |
| 02-board-ui-and-drag-interaction | 3/3 | 10 min | 3 min |
| 03-puzzle-data-and-navigation | 4/4 | 87 min | 22 min |
| 04-firebase-integration | 3/5 | 20 min | 7 min |

**Recent Trend:**
- Last 5 plans: 03-04 (5 min), 04-01 (15 min), 04-02 (3 min), 04-03 (2 min)
- Trend: 04-03 very fast; hook and modal followed plan exactly with no deviations

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

### Pending Todos

None.

### Blockers/Concerns

- Verify Howler.js is still actively maintained; Web Audio API fallback exists if needed
- ~~80+ puzzle definitions need to be sourced or created with verified solvability~~ RESOLVED: 100 puzzles generated and validated

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed Phase 04 Plan 03 (useLeaderboard hook, LeaderboardModal component with loading/anon-gate/user-highlight, formatTime utility)
Resume file: .planning/phases/04-firebase-integration/04-03-SUMMARY.md
