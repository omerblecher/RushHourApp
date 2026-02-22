# Roadmap: Rush Hour Puzzle Game

## Overview

Deliver a fully playable Rush Hour sliding puzzle game as a React SPA with Firebase-backed leaderboards. The build order follows a strict dependency chain: pure game engine first (testable in isolation), then interactive UI on top, then puzzle content and navigation, then cloud features, then polish. Each phase delivers a coherent, verifiable capability. The game is fully playable offline after Phase 3; Firebase and polish layer on top.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Game Engine** - Pure TypeScript game logic with unit-tested collision detection, move validation, win detection, and BFS solver
- [x] **Phase 2: Board UI and Drag Interaction** - Visual game board with CSS-styled vehicles and pointer-event-driven drag system
- [x] **Phase 3: Puzzle Data and Navigation** - 80+ puzzle definitions, difficulty-grouped selection UI, routing, and localStorage progress tracking (completed 2026-02-20)
- [ ] **Phase 4: Firebase Integration** - Google authentication, anonymous auth, Firestore leaderboards with security rules
- [x] **Phase 5: Sound and Polish** - Howler.js sound effects, win animations, keyboard accessibility, and cross-browser verification (completed 2026-02-22)

## Phase Details

### Phase 1: Game Engine
**Goal**: A pure TypeScript game engine that correctly models Rush Hour mechanics, validatable and testable with zero UI dependencies
**Depends on**: Nothing (first phase)
**Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-028, REQ-029, NFR-004
**Success Criteria** (what must be TRUE):
  1. A 6x6 grid model exists where vehicles (2-cell cars and 3-cell trucks) can be placed at specific positions and orientations
  2. Move validation correctly constrains vehicles to their orientation axis and rejects moves that would cause overlap or go out of bounds
  3. Win condition fires when the red target car (horizontal, row 3) reaches the right edge exit
  4. Move counter increments on each valid move and timer tracking starts/stops correctly in the engine state
  5. BFS solver can take any puzzle configuration and return the optimal move count, or report unsolvable
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Types, grid parser, and board model (TDD)
- [x] 01-02-PLAN.md -- GameEngine class: moves, collision, win, undo, reset (TDD)
- [x] 01-03-PLAN.md -- BFS solver and barrel export with integration test (TDD)

### Phase 2: Board UI and Drag Interaction
**Goal**: Users can see and interact with the puzzle board -- dragging vehicles with mouse or touch on a responsive, visually polished game board
**Depends on**: Phase 1
**Requirements**: REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-024, NFR-001, NFR-008
**Success Criteria** (what must be TRUE):
  1. User sees a square 6x6 game board with visible grid cells, an exit marker on the right side of row 3, and colorful CSS-styled vehicles with rounded corners and pseudo-element details
  2. User can drag any vehicle with mouse or touch, constrained to its orientation axis, with real-time collision prevention during the drag
  3. Vehicle snaps to the nearest valid grid cell on release with visual drag feedback (elevation shadow, z-index lift)
  4. Board renders responsively from 320px viewport width up to desktop, maintaining square aspect ratio
  5. Drag interaction runs at 60fps using CSS transforms without layout thrashing
**Plans**: TBD

Plans:
- [x] 02-01: Board grid, Vehicle CSS art, exit marker, and static rendering
- [x] 02-02: Drag interaction system, collision bounds, snap animation, GameHUD, and ControlBar
- [x] 02-03: Human verification of complete board UI and drag interaction (approved)

### Phase 3: Puzzle Data and Navigation
**Goal**: Users can browse 80+ puzzles organized by difficulty, select and play any puzzle, and have their progress saved locally
**Depends on**: Phase 2
**Requirements**: REQ-025, REQ-026, REQ-027, REQ-030, REQ-031, REQ-032, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053
**Success Criteria** (what must be TRUE):
  1. User can navigate from main menu to difficulty selection to puzzle grid to game board and back, with URL-based routing
  2. 80+ puzzles are available across 4 difficulty levels (Beginner, Intermediate, Advanced, Expert) with 20+ per level
  3. Puzzle selection screen shows completed/uncompleted status and personal best moves/time per puzzle
  4. All puzzles are validated as solvable at build time by the BFS solver, and each has a known minimum move count
  5. Game board screen includes working reset and back controls, and progress persists in localStorage across sessions
**Plans:** 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md -- Puzzle data pipeline (80+ puzzles, validation script, puzzleIndex, progressStore)
- [x] 03-02-PLAN.md -- Routing + all screens (MainMenu, PuzzleSelect, GameScreen, WinModal, LeaderboardStub)
- [ ] 03-03-PLAN.md -- Human verification of complete Phase 3 navigation and puzzle experience

### Phase 4: Firebase Integration
**Goal**: Users can sign in and compete on global per-puzzle leaderboards with server-enforced data integrity
**Depends on**: Phase 3
**Requirements**: REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, NFR-006
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google via popup, or play anonymously and later link their anonymous account to a Google account
  2. Per-puzzle leaderboard shows top 50 scores ranked by moves (ascending) then time (ascending), with display names
  3. Only the user's best attempt per puzzle is stored; scores are immutable (no user update or delete)
  4. Firestore security rules enforce that users can only submit their own scores, moves are positive integers, and scores cannot be tampered with
  5. Leaderboard view is accessible from both puzzle completion and puzzle selection screens
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Firebase init, authStore, AuthPromptScreen (blocking launch auth gate)
- [ ] 04-02-PLAN.md — Firestore security rules, composite index, scoreService + displayName service
- [ ] 04-03-PLAN.md — useLeaderboard hook + LeaderboardModal component
- [ ] 04-04-PLAN.md — Game integration: score submission, WinModal rank/PB, LeaderboardScreen, PuzzleSelect leaderboard
- [ ] 04-05-PLAN.md — ProfileScreen, anonymous-to-Google upgrade flow, sign out
- [ ] 04-06-PLAN.md — Deploy rules + human verification of all Phase 4 flows

### Phase 5: Sound and Polish
**Goal**: The game feels complete with sound feedback, celebration animations, keyboard accessibility, and cross-browser quality
**Depends on**: Phase 4
**Requirements**: REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-016, REQ-023, NFR-002, NFR-003, NFR-005, NFR-007
**Success Criteria** (what must be TRUE):
  1. Slide sound plays on vehicle movement, win sound on puzzle completion, and level start sound when loading a new puzzle
  2. Global mute/unmute toggle works and persists across sessions via localStorage; audio context initializes on first user gesture
  3. Win celebration animation plays on puzzle completion
  4. User can select a vehicle and move it with arrow keys as a keyboard alternative
  5. Game works correctly on Chrome, Firefox, Safari, and Edge (latest 2 versions) and degrades gracefully when Firebase is unavailable
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Install deps, soundService singleton, source sound files, GameHeader + HelpModal + AboutModal
- [x] 05-02-PLAN.md — Wire slide/win/start sounds, win celebration sequence, GameHeader integration, remove mute from ControlBar
- [x] 05-03-PLAN.md — Keyboard navigation (Tab/Arrow/Escape), Vehicle ARIA + tabIndex + focus ring
- [ ] 05-04-PLAN.md — Bundle size measurement + human verification of all Phase 5 features

## Requirement Coverage

All 61 v1 requirements mapped. No orphans.

| Requirement | Phase | Category |
|-------------|-------|----------|
| REQ-001 | 1 | Core Game Mechanics |
| REQ-002 | 1 | Core Game Mechanics |
| REQ-003 | 1 | Core Game Mechanics |
| REQ-004 | 1 | Core Game Mechanics |
| REQ-005 | 1 | Core Game Mechanics |
| REQ-006 | 1 | Core Game Mechanics |
| REQ-007 | 1 | Core Game Mechanics |
| REQ-008 | 1 | Core Game Mechanics |
| REQ-009 | 1 | Core Game Mechanics |
| REQ-010 | 1 | Core Game Mechanics |
| REQ-011 | 2 | Drag and Touch Interaction |
| REQ-012 | 2 | Drag and Touch Interaction |
| REQ-013 | 2 | Drag and Touch Interaction |
| REQ-014 | 2 | Drag and Touch Interaction |
| REQ-015 | 2 | Drag and Touch Interaction |
| REQ-016 | 5 | 4/4 | Complete   | 2026-02-22 | 2 | Drag and Touch Interaction |
| REQ-018 | 2 | Visual Design |
| REQ-019 | 2 | Visual Design |
| REQ-020 | 2 | Visual Design |
| REQ-021 | 2 | Visual Design |
| REQ-022 | 2 | Visual Design |
| REQ-023 | 5 | Win Animation |
| REQ-024 | 2 | Visual Design |
| REQ-025 | 3 | Puzzles | Complete    | 2026-02-20 | 3 | Puzzles |
| REQ-027 | 3 | Puzzles |
| REQ-028 | 1 | Puzzles (Engine) |
| REQ-029 | 1 | Puzzles (Engine) |
| REQ-030 | 3 | Puzzles |
| REQ-031 | 3 | Puzzles |
| REQ-032 | 3 | Puzzles |
| REQ-033 | 5 | Sound Effects |
| REQ-034 | 5 | Sound Effects |
| REQ-035 | 5 | Sound Effects |
| REQ-036 | 5 | Sound Effects |
| REQ-037 | 5 | Sound Effects |
| REQ-038 | 4 | 5/6 | In Progress|  | 4 | Firebase Auth |
| REQ-040 | 4 | Firebase Auth |
| REQ-041 | 4 | Firebase Auth |
| REQ-042 | 4 | Global Leaderboards |
| REQ-043 | 4 | Global Leaderboards |
| REQ-044 | 4 | Global Leaderboards |
| REQ-045 | 4 | Global Leaderboards |
| REQ-046 | 4 | Global Leaderboards |
| REQ-047 | 4 | Global Leaderboards |
| REQ-048 | 3 | Navigation and UI |
| REQ-049 | 3 | Navigation and UI |
| REQ-050 | 3 | Navigation and UI |
| REQ-051 | 3 | Navigation and UI |
| REQ-052 | 3 | Navigation and UI |
| REQ-053 | 3 | Navigation and UI |
| NFR-001 | 2 | Performance |
| NFR-002 | 5 | Bundle Size |
| NFR-003 | 5 | Offline Graceful Degradation |
| NFR-004 | 1 | Architecture |
| NFR-005 | 5 | Accessibility |
| NFR-006 | 4 | Security |
| NFR-007 | 5 | Cross-Browser |
| NFR-008 | 2 | Responsive |

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Engine | 3/3 | Complete | 2026-02-17 |
| 2. Board UI and Drag Interaction | 3/3 | Complete | 2026-02-19 |
| 3. Puzzle Data and Navigation | 4/4 | Complete | 2026-02-20 |
| 4. Firebase Integration | 1/6 | In Progress | - |
| 5. Sound and Polish | 3/4 | In Progress | - |
