# Requirements: Rush Hour Puzzle Game

## Scope

### v1 (MVP)
Core playable game with Firebase leaderboards.

### v2 (Future)
Themes, daily challenges, multiplayer race mode, puzzle editor.

### Out of Scope
Hints/solver for players, offline PWA mode, native mobile app, monetization.

---

## Functional Requirements

### Core Game Mechanics

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | 6x6 grid board with cells displayed as a square game board | MUST |
| REQ-002 | Vehicles occupy 2 cells (car) or 3 cells (truck), oriented horizontally or vertically | MUST |
| REQ-003 | Vehicles slide along their orientation axis only (horizontal or vertical) | MUST |
| REQ-004 | Vehicles cannot overlap or pass through each other (collision detection) | MUST |
| REQ-005 | Vehicles cannot move outside the 6x6 grid boundaries | MUST |
| REQ-006 | Red target car is always horizontal on row 3 (0-indexed row 2) | MUST |
| REQ-007 | Win condition: red car reaches the right edge exit of the board | MUST |
| REQ-008 | Move counter increments on each valid vehicle move | MUST |
| REQ-009 | Timer starts on first move and stops on win | MUST |
| REQ-010 | Reset button restores puzzle to initial state | MUST |

### Drag & Touch Interaction

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-011 | Vehicles are draggable via mouse pointer events | MUST |
| REQ-012 | Vehicles are draggable via touch on mobile devices | MUST |
| REQ-013 | Drag is constrained to vehicle's orientation axis | MUST |
| REQ-014 | Vehicle snaps to nearest valid grid cell on release | MUST |
| REQ-015 | Real-time collision detection during drag (no overlap while dragging) | MUST |
| REQ-016 | Click-to-select + arrow-key movement as keyboard alternative | SHOULD |
| REQ-017 | Visual feedback during drag (elevation shadow, z-index lift) | SHOULD |

### Visual Design

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-018 | Vehicles rendered as colorful CSS rectangles with rounded corners | MUST |
| REQ-019 | 12+ distinct vehicle colors, red reserved for target car | MUST |
| REQ-020 | CSS/SVG car details (windows, wheels) via pseudo-elements — no image assets | MUST |
| REQ-021 | Exit marker visible on right side of row 3 | MUST |
| REQ-022 | Board background with visible grid cells | MUST |
| REQ-023 | Win celebration animation | SHOULD |
| REQ-024 | Responsive board sizing (works on mobile and desktop) | MUST |

### Puzzles

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-025 | 80+ pre-built puzzles stored as local JSON data | MUST |
| REQ-026 | 4 difficulty levels: Beginner, Intermediate, Advanced, Expert | MUST |
| REQ-027 | 20+ puzzles per difficulty level | MUST |
| REQ-028 | Each puzzle has a known minimum move count (optimal solution) | MUST |
| REQ-029 | All puzzles validated as solvable by BFS solver at build time | MUST |
| REQ-030 | Puzzle selection screen grouped by difficulty | MUST |
| REQ-031 | Visual indicator of completed/uncompleted puzzles | SHOULD |
| REQ-032 | Personal best moves/time shown per puzzle (shown in WinModal per user decision; tiles show checkmark only) | SHOULD |

### Sound Effects

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-033 | Car slide sound on vehicle movement | MUST |
| REQ-034 | Win celebration sound on puzzle completion | MUST |
| REQ-035 | Level start sound when loading a new puzzle | MUST |
| REQ-036 | Global mute/unmute toggle persisted to localStorage | MUST |
| REQ-037 | Audio context initialized on first user gesture (autoplay policy compliance) | MUST |

### Firebase Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-038 | Google sign-in via Firebase Auth popup | MUST |
| REQ-039 | Anonymous auth as fallback for unauthenticated play | SHOULD |
| REQ-040 | Anonymous-to-permanent account upgrade via linkWithPopup | SHOULD |
| REQ-041 | Display name shown on leaderboard entries | MUST |

### Global Leaderboards

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-042 | Per-puzzle global leaderboard showing top 50 scores | MUST |
| REQ-043 | Scores ranked by moves (ascending), time as tiebreaker (ascending) | MUST |
| REQ-044 | Only best attempt per user per puzzle stored | MUST |
| REQ-045 | Scores are immutable (no update/delete by users) | MUST |
| REQ-046 | Server-side score validation (moves >= puzzle's minimum moves) | SHOULD |
| REQ-047 | Leaderboard view accessible from puzzle completion and puzzle selection | MUST |

### Navigation & UI

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-048 | Main menu / home screen | MUST |
| REQ-049 | Difficulty selection screen | MUST |
| REQ-050 | Puzzle selection grid per difficulty | MUST |
| REQ-051 | Game board screen with controls (reset, back, mute) | MUST |
| REQ-052 | Leaderboard screen per puzzle | MUST |
| REQ-053 | Client-side routing between screens | MUST |

---

## Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | 60fps drag interaction (CSS transform only, no layout thrashing) | MUST |
| NFR-002 | Bundle size < 200KB gzipped | SHOULD |
| NFR-003 | Game playable offline (puzzles bundled locally, Firebase graceful degradation) | SHOULD |
| NFR-004 | Pure game engine with zero React/Firebase dependencies (testable in isolation) | MUST |
| NFR-005 | ARIA labels on vehicles and grid for screen reader accessibility | SHOULD |
| NFR-006 | Firestore security rules enforce data integrity | MUST |
| NFR-007 | Works on Chrome, Firefox, Safari, Edge (latest 2 versions) | MUST |
| NFR-008 | Mobile-responsive from 320px viewport width | MUST |

---

## Tech Stack (from research)

| Layer | Technology |
|-------|-----------|
| Build | Vite + TypeScript |
| UI | React 19 |
| State | Zustand |
| Backend | Firebase (Auth + Firestore) |
| Sound | Howler.js |
| Routing | react-router-dom |
| Styling | CSS Modules |
| Interaction | Custom Pointer Events API |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-001 | Phase 1 | Pending |
| REQ-002 | Phase 1 | Pending |
| REQ-003 | Phase 1 | Pending |
| REQ-004 | Phase 1 | Pending |
| REQ-005 | Phase 1 | Pending |
| REQ-006 | Phase 1 | Pending |
| REQ-007 | Phase 1 | Pending |
| REQ-008 | Phase 1 | Pending |
| REQ-009 | Phase 1 | Pending |
| REQ-010 | Phase 1 | Pending |
| REQ-011 | Phase 2 | Pending |
| REQ-012 | Phase 2 | Pending |
| REQ-013 | Phase 2 | Pending |
| REQ-014 | Phase 2 | Pending |
| REQ-015 | Phase 2 | Pending |
| REQ-016 | Phase 5 | Pending |
| REQ-017 | Phase 2 | Pending |
| REQ-018 | Phase 2 | Pending |
| REQ-019 | Phase 2 | Pending |
| REQ-020 | Phase 2 | Pending |
| REQ-021 | Phase 2 | Pending |
| REQ-022 | Phase 2 | Pending |
| REQ-023 | Phase 5 | Pending |
| REQ-024 | Phase 2 | Pending |
| REQ-025 | Phase 3 | Complete |
| REQ-026 | Phase 3 | Complete |
| REQ-027 | Phase 3 | Complete |
| REQ-028 | Phase 1 | Pending |
| REQ-029 | Phase 1 | Pending |
| REQ-030 | Phase 3 | Complete |
| REQ-031 | Phase 3 | Complete |
| REQ-032 | Phase 3 | Complete — satisfied via WinModal (tiles show checkmark only per CONTEXT.md) |
| REQ-033 | Phase 5 | Pending |
| REQ-034 | Phase 5 | Pending |
| REQ-035 | Phase 5 | Pending |
| REQ-036 | Phase 5 | Pending |
| REQ-037 | Phase 5 | Pending |
| REQ-038 | Phase 4 | Complete — Google sign-in via signInWithPopup in AuthPromptScreen |
| REQ-039 | Phase 4 | Complete — Anonymous auth via signInAnonymously in AuthPromptScreen |
| REQ-040 | Phase 4 | Complete |
| REQ-041 | Phase 4 | Complete — displayName from Google user object used in authStore |
| REQ-042 | Phase 4 | Complete |
| REQ-043 | Phase 4 | Complete |
| REQ-044 | Phase 4 | Complete |
| REQ-045 | Phase 4 | Complete |
| REQ-046 | Phase 4 | Complete |
| REQ-047 | Phase 4 | Complete |
| REQ-048 | Phase 3 | Complete |
| REQ-049 | Phase 3 | Complete |
| REQ-050 | Phase 3 | Complete |
| REQ-051 | Phase 3 | Complete |
| REQ-052 | Phase 3 | Complete |
| REQ-053 | Phase 3 | Complete |
| NFR-001 | Phase 2 | Pending |
| NFR-002 | Phase 5 | Pending |
| NFR-003 | Phase 5 | Pending |
| NFR-004 | Phase 1 | Pending |
| NFR-005 | Phase 5 | Pending |
| NFR-006 | Phase 4 | Complete |
| NFR-007 | Phase 5 | Pending |
| NFR-008 | Phase 2 | Pending |
