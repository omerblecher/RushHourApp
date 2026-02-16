# Architecture Patterns

**Domain:** React-based Rush Hour Sliding Puzzle Game with Firebase Backend
**Researched:** 2026-02-16
**Overall Confidence:** MEDIUM (based on training data; web verification unavailable)

---

## Recommended Architecture

### High-Level Overview

```
+--------------------------------------------------+
|                   React SPA                       |
|                                                   |
|  +------------+  +----------+  +--------------+   |
|  | Game Engine |  | UI Shell |  | Firebase SDK |   |
|  | (pure logic)|  | (React)  |  | (auth, db)   |   |
|  +------+-----+  +----+-----+  +------+-------+   |
|         |              |               |           |
|         +------+-------+-------+-------+           |
|                |               |                   |
|         React Context    Firestore Hooks           |
|         (game state)     (async data)              |
+--------------------------------------------------+
                         |
              +----------+----------+
              |     Firebase        |
              |  +------+ +------+ |
              |  | Auth | | Fire | |
              |  |      | |store | |
              |  +------+ +------+ |
              +---------------------+
```

**Key principle:** Separate pure game logic from React rendering and from Firebase I/O. The game engine is a plain TypeScript module with zero dependencies on React or Firebase. React components consume it. Firebase hooks handle persistence. This separation makes testing trivial and keeps the codebase navigable.

---

## Component Architecture

### Component Tree

```
App
+-- AuthProvider (context)
|   +-- GameStateProvider (context)
|       +-- Layout
|           +-- Header
|           |   +-- Logo
|           |   +-- UserMenu (login/logout/avatar)
|           |   +-- SoundToggle
|           |
|           +-- Routes
|               +-- HomePage
|               |   +-- DifficultySelector
|               |   +-- PuzzleGrid (thumbnail cards)
|               |       +-- PuzzleCard (per puzzle)
|               |
|               +-- GamePage
|               |   +-- GameBoard
|               |   |   +-- Grid (6x6 background)
|               |   |   +-- Vehicle (one per car/truck, draggable)
|               |   |   +-- ExitMarker
|               |   +-- GameHUD
|               |   |   +-- MoveCounter
|               |   |   +-- Timer
|               |   |   +-- ResetButton
|               |   |   +-- BackButton
|               |   +-- WinModal
|               |       +-- ScoreSummary
|               |       +-- NextPuzzleButton
|               |
|               +-- LeaderboardPage
|                   +-- PuzzleFilter (difficulty, puzzle ID)
|                   +-- LeaderboardTable
|                       +-- LeaderboardRow
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **AuthProvider** | Wraps Firebase Auth, exposes user object and login/logout actions via context | Firebase Auth SDK |
| **GameStateProvider** | Holds current puzzle state, move history, timer. Exposes dispatch actions. | Game engine (pure logic), AuthProvider (for user ID) |
| **GameBoard** | Renders the 6x6 grid and all vehicles. Handles drag/touch input. | GameStateProvider (reads state, dispatches moves) |
| **Vehicle** | Renders a single car or truck as CSS/SVG. Handles its own drag interaction. | GameBoard (receives position props, reports drag-end) |
| **Grid** | Renders the 6x6 background grid lines and exit marker. Pure presentational. | None (props only) |
| **PuzzleCard** | Thumbnail of a puzzle with difficulty badge and best-score indicator. | Router (navigates to game), Firestore (reads user best score) |
| **LeaderboardTable** | Fetches and displays top scores for a given puzzle. | Firestore (reads leaderboard collection) |
| **WinModal** | Shown on puzzle completion. Displays score, submits to leaderboard. | GameStateProvider, Firestore (writes score) |
| **SoundToggle** | Global mute/unmute. Persists preference to localStorage. | SoundManager (utility module) |

---

## State Management Architecture

### Three State Domains

Do NOT put all state in one store. Use the right tool for each domain:

| Domain | Tool | Why |
|--------|------|-----|
| **Game State** (board positions, moves, timer, win condition) | `useReducer` + Context | Complex state transitions with clear actions. Reducer is testable in isolation. |
| **Auth State** (current user, login status) | Context wrapping Firebase `onAuthStateChanged` | Firebase manages the actual state; React just subscribes. |
| **Server Data** (leaderboards, puzzle catalog metadata) | Direct Firestore hooks or a thin custom hook layer | Read-heavy, cache-friendly. No need for global store. |
| **UI State** (modal open, sound on, selected difficulty) | Local component state or `useState` | Ephemeral, no cross-component sharing needed. |

**Why not Redux/Zustand:** The game state is contained within a single page (GamePage). A reducer + context is sufficient. Adding a state management library would be over-engineering for this scope. If the project grows significantly (multiplayer, puzzle editor), reconsider.

### Game State Reducer

```typescript
// types/game.ts

interface Position {
  row: number;  // 0-5
  col: number;  // 0-5
}

interface VehicleState {
  id: string;
  type: 'car' | 'truck';        // car = 2 cells, truck = 3 cells
  orientation: 'horizontal' | 'vertical';
  position: Position;            // top-left cell of the vehicle
  color: string;
  isTarget: boolean;             // true for the red car
}

interface GameState {
  puzzleId: string;
  vehicles: VehicleState[];
  moveCount: number;
  moveHistory: Move[];           // for undo support
  startTime: number | null;      // Date.now() when first move made
  elapsedMs: number;
  status: 'idle' | 'playing' | 'won';
  gridSize: 6;                   // constant, but explicit
}

type GameAction =
  | { type: 'LOAD_PUZZLE'; puzzle: PuzzleDefinition }
  | { type: 'MOVE_VEHICLE'; vehicleId: string; newPosition: Position }
  | { type: 'UNDO' }
  | { type: 'RESET' }
  | { type: 'TICK'; now: number }
  | { type: 'WIN' };

interface Move {
  vehicleId: string;
  from: Position;
  to: Position;
}
```

```typescript
// engine/gameReducer.ts  (PURE -- no React imports)

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PUZZLE':
      return initializeFromPuzzle(action.puzzle);
    case 'MOVE_VEHICLE':
      return applyMove(state, action.vehicleId, action.newPosition);
    case 'UNDO':
      return undoLastMove(state);
    case 'RESET':
      return resetToInitial(state);
    case 'TICK':
      return { ...state, elapsedMs: action.now - (state.startTime ?? action.now) };
    case 'WIN':
      return { ...state, status: 'won' };
    default:
      return state;
  }
}
```

**Key design choice:** The reducer is a pure function in a plain `.ts` file (not a React hook). It can be unit tested with zero React dependencies. The `GameStateProvider` wraps it with `useReducer`.

### Move Validation (Game Engine)

```typescript
// engine/moveValidator.ts

/**
 * Given the current board state, returns valid positions
 * a vehicle can move to. Vehicles can only slide along
 * their orientation axis. They cannot pass through other vehicles.
 */
function getValidMoves(state: GameState, vehicleId: string): Position[] {
  // 1. Find the vehicle
  // 2. Determine slide axis (row for horizontal, col for vertical)
  // 3. Scan forward and backward along axis for empty cells
  // 4. Return all reachable positions
}

/**
 * Check if the target (red) car has reached column 4
 * (its front is at col 5, aligned with exit on row 2).
 */
function checkWinCondition(state: GameState): boolean {
  const target = state.vehicles.find(v => v.isTarget);
  // Target car is horizontal on row 2
  // Win when target.position.col === 4 (car occupies cols 4-5, front at exit)
  return target !== undefined && target.position.col === 4;
}
```

### Win Detection Flow

```
User drags vehicle -> MOVE_VEHICLE dispatched
  -> gameReducer applies move
  -> GameStateProvider effect checks checkWinCondition()
  -> If won: dispatch WIN, play sound, show WinModal
  -> WinModal submits score to Firestore
```

---

## Firebase Data Model

### Firestore Collections

```
firestore-root/
|
+-- puzzles/                          # Collection: puzzle definitions
|   +-- {puzzleId}/                   # Document: "beginner-01", "expert-15"
|       +-- difficulty: string        # "beginner" | "intermediate" | "advanced" | "expert"
|       +-- number: number            # Puzzle number within difficulty (1-20+)
|       +-- minMoves: number          # Optimal solution move count (for star rating)
|       +-- vehicles: [               # Array of initial vehicle positions
|       |     {
|       |       id: string,
|       |       type: "car" | "truck",
|       |       orientation: "horizontal" | "vertical",
|       |       row: number,
|       |       col: number,
|       |       color: string,
|       |       isTarget: boolean
|       |     }
|       |   ]
|       +-- createdAt: timestamp
|
+-- leaderboard/                      # Collection: per-puzzle leaderboard entries
|   +-- {entryId}/                    # Auto-generated document ID
|       +-- puzzleId: string          # Reference to puzzle
|       +-- difficulty: string        # Denormalized for filtering
|       +-- userId: string            # Firebase Auth UID
|       +-- displayName: string       # Denormalized (avoid extra reads)
|       +-- moves: number             # Move count achieved
|       +-- timeMs: number            # Time in milliseconds
|       +-- score: number             # Computed score (lower = better)
|       +-- submittedAt: timestamp    # Server timestamp
|
+-- userProfiles/                     # Collection: user data
    +-- {userId}/                     # Document ID = Firebase Auth UID
        +-- displayName: string
        +-- createdAt: timestamp
        +-- puzzleProgress: {         # Map: tracks completion per puzzle
        |     "beginner-01": {
        |       bestMoves: number,
        |       bestTimeMs: number,
        |       bestScore: number,
        |       completedAt: timestamp
        |     },
        |     ...
        |   }
        +-- stats: {                  # Aggregated stats
              totalPuzzlesSolved: number,
              totalMoves: number
            }
```

### Design Decisions

**Puzzles: Firestore collection vs. static JSON files?**

Use **static JSON files bundled in the app** for puzzle definitions, with a Firestore `puzzles` collection as an optional mirror.

Rationale:
- Puzzles are static data that never changes at runtime.
- Bundling as JSON avoids Firestore reads on every game load (saves reads quota and latency).
- 80 puzzles at ~500 bytes each = ~40KB total. Trivial bundle size.
- Firestore collection is useful only if you want to add puzzles without redeploying. For v1, static JSON is simpler.

```typescript
// data/puzzles/beginner.json
[
  {
    "id": "beginner-01",
    "difficulty": "beginner",
    "number": 1,
    "minMoves": 8,
    "vehicles": [
      { "id": "X", "type": "car", "orientation": "horizontal", "row": 2, "col": 0, "color": "#E74C3C", "isTarget": true },
      { "id": "A", "type": "truck", "orientation": "vertical", "row": 0, "col": 2, "color": "#3498DB", "isTarget": false },
      ...
    ]
  },
  ...
]
```

**Leaderboard: flat collection vs. subcollection per puzzle?**

Use a **flat `leaderboard` collection** with composite indexes on `(puzzleId, score)`.

Rationale:
- Subcollections (`puzzles/{id}/leaderboard`) make cross-puzzle queries (e.g., "show me a player's global rank") impossible in Firestore.
- A flat collection with `puzzleId` field supports both per-puzzle queries AND cross-puzzle queries.
- Composite index on `puzzleId + score` (ascending) makes "top 10 for puzzle X" a single indexed query.
- Keep documents small: denormalize `displayName` and `difficulty` to avoid joins.

**User progress: subcollection vs. map field?**

Use a **map field within the user document** (`puzzleProgress`).

Rationale:
- 80 puzzles max means the map will have at most 80 keys. Well within Firestore's 1MB document limit.
- Single document read to get all progress (vs. 80 subcollection reads).
- Atomic updates via dot notation: `userProfiles/{uid}.puzzleProgress.beginner-01.bestMoves`.

**Score computation:**

```typescript
// Lower score = better
// Weight moves more heavily than time to reward efficiency
function computeScore(moves: number, timeMs: number): number {
  const timeSeconds = Math.floor(timeMs / 1000);
  return (moves * 1000) + timeSeconds;
}
```

This gives move count ~1000x weight over seconds. A player with 12 moves in 120s (score: 12120) beats a player with 13 moves in 5s (score: 13005). Moves matter most; time is the tiebreaker.

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Puzzles: read-only for everyone ---
    match /puzzles/{puzzleId} {
      allow read: if true;
      allow write: if false;  // Admin-only via Firebase Admin SDK
    }

    // --- Leaderboard: authenticated users can create, nobody can update/delete ---
    match /leaderboard/{entryId} {
      allow read: if true;

      allow create: if
        // Must be authenticated
        request.auth != null
        // userId must match the authenticated user
        && request.resource.data.userId == request.auth.uid
        // Required fields must exist
        && request.resource.data.keys().hasAll([
          'puzzleId', 'difficulty', 'userId', 'displayName',
          'moves', 'timeMs', 'score', 'submittedAt'
        ])
        // Moves must be a positive integer
        && request.resource.data.moves is int
        && request.resource.data.moves > 0
        && request.resource.data.moves < 1000
        // Time must be positive
        && request.resource.data.timeMs is int
        && request.resource.data.timeMs > 0
        // Score must match the formula (server-side validation)
        && request.resource.data.score ==
           (request.resource.data.moves * 1000) +
           (request.resource.data.timeMs / 1000)
        // Timestamp must be server timestamp
        && request.resource.data.submittedAt == request.time;

      // No updates or deletes -- leaderboard entries are immutable
      allow update, delete: if false;
    }

    // --- User Profiles: owner can read/write their own ---
    match /userProfiles/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId
        // Prevent users from setting arbitrary fields
        && request.resource.data.keys().hasOnly([
          'displayName', 'createdAt', 'puzzleProgress', 'stats'
        ]);
      allow delete: if false;
    }
  }
}
```

**Integrity notes:**
- The score formula is validated in security rules so clients cannot submit fake low scores.
- `submittedAt` must equal `request.time` (server timestamp), preventing backdated submissions.
- Leaderboard entries are immutable (no update/delete) to prevent tampering.
- Move count is bounded (< 1000) as a basic sanity check.
- For stronger anti-cheat: consider Cloud Functions that validate the move sequence server-side. For a casual puzzle game, client-side validation with security rules is adequate.

**Firestore Indexes Required:**

```
Collection: leaderboard
  - puzzleId ASC, score ASC           (top scores per puzzle)
  - userId ASC, submittedAt DESC      (user's recent submissions)
  - difficulty ASC, score ASC         (top scores per difficulty)
```

---

## Routing Structure

Use **React Router v6** with three main routes:

```typescript
// App.tsx routes
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/play/:puzzleId" element={<GamePage />} />
  <Route path="/leaderboard" element={<LeaderboardPage />} />
  <Route path="/leaderboard/:puzzleId" element={<LeaderboardPage />} />
</Routes>
```

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Difficulty selector + puzzle grid. Default landing page. |
| `/play/:puzzleId` | `GamePage` | The game board for a specific puzzle. `puzzleId` like "beginner-01". |
| `/leaderboard` | `LeaderboardPage` | Global leaderboard view with puzzle filter dropdown. |
| `/leaderboard/:puzzleId` | `LeaderboardPage` | Pre-filtered leaderboard for a specific puzzle. |

**No `/login` route.** Use Firebase UI or a modal dialog for authentication. Login should not be a separate page -- it breaks flow. Show a login prompt when the user tries to submit a score while unauthenticated.

---

## File/Folder Organization

```
src/
+-- main.tsx                          # Entry point, renders App
+-- App.tsx                           # Router + providers
+-- vite-env.d.ts                     # Vite types
|
+-- components/                       # React components
|   +-- layout/
|   |   +-- Header.tsx
|   |   +-- Layout.tsx
|   |
|   +-- game/
|   |   +-- GameBoard.tsx             # The 6x6 board container
|   |   +-- Vehicle.tsx               # Individual car/truck (draggable)
|   |   +-- Grid.tsx                  # Grid lines + exit marker
|   |   +-- GameHUD.tsx               # Move counter, timer, buttons
|   |   +-- WinModal.tsx              # Victory overlay
|   |
|   +-- puzzle-select/
|   |   +-- DifficultySelector.tsx    # Beginner/Inter/Adv/Expert tabs
|   |   +-- PuzzleGrid.tsx            # Grid of puzzle cards
|   |   +-- PuzzleCard.tsx            # Single puzzle thumbnail
|   |
|   +-- leaderboard/
|   |   +-- LeaderboardTable.tsx
|   |   +-- LeaderboardRow.tsx
|   |   +-- PuzzleFilter.tsx
|   |
|   +-- auth/
|   |   +-- LoginModal.tsx
|   |   +-- UserMenu.tsx
|   |
|   +-- ui/                           # Shared/generic UI components
|       +-- Button.tsx
|       +-- Modal.tsx
|       +-- Spinner.tsx
|       +-- SoundToggle.tsx
|
+-- engine/                           # Pure game logic (NO React imports)
|   +-- gameReducer.ts                # State reducer
|   +-- moveValidator.ts              # Legal move computation
|   +-- boardUtils.ts                 # Grid helpers, collision detection
|   +-- scoreCalculator.ts            # Score formula
|   +-- types.ts                      # Game-related TypeScript types
|
+-- contexts/
|   +-- AuthContext.tsx                # Firebase auth state provider
|   +-- GameContext.tsx                # Game state provider (wraps useReducer)
|
+-- hooks/
|   +-- useGameState.ts               # Consumer hook for GameContext
|   +-- useAuth.ts                    # Consumer hook for AuthContext
|   +-- useLeaderboard.ts             # Firestore leaderboard queries
|   +-- useUserProgress.ts            # Firestore user progress
|   +-- useTimer.ts                   # requestAnimationFrame-based timer
|   +-- useDrag.ts                    # Pointer/touch drag logic for vehicles
|   +-- useSound.ts                   # Sound effect playback
|
+-- firebase/
|   +-- config.ts                     # Firebase initialization
|   +-- auth.ts                       # signIn, signOut, onAuthStateChanged wrappers
|   +-- leaderboardService.ts         # submitScore, getTopScores, getUserScores
|   +-- userService.ts                # createProfile, updateProgress
|
+-- data/
|   +-- puzzles/
|   |   +-- beginner.json
|   |   +-- intermediate.json
|   |   +-- advanced.json
|   |   +-- expert.json
|   +-- puzzleIndex.ts                # Aggregates all puzzles, provides lookup
|   +-- vehicleColors.ts              # Color palette for vehicles
|
+-- assets/
|   +-- sounds/
|   |   +-- slide.mp3
|   |   +-- win.mp3
|   |   +-- start.mp3
|   +-- vehicles/                     # SVG vehicle shapes (if not inline)
|       +-- car-horizontal.svg
|       +-- car-vertical.svg
|       +-- truck-horizontal.svg
|       +-- truck-vertical.svg
|
+-- styles/
|   +-- global.css                    # CSS reset, variables, fonts
|   +-- game.css                      # Game board specific styles
|   +-- vehicles.css                  # Vehicle colors, animations
|
+-- utils/
    +-- formatTime.ts                 # "1:23" from milliseconds
    +-- cn.ts                         # classNames helper (or use clsx)
```

**Folder rationale:**
- `engine/` is the most important separation. It contains zero framework dependencies. You can test it with plain `vitest` or `jest` without any React test utilities.
- `firebase/` wraps all Firebase SDK calls. Components never import `firebase/firestore` directly. This makes it possible to mock Firebase in tests and to swap backends later.
- `hooks/` contains all custom hooks. This avoids cluttering component files with complex logic.
- `data/` contains static puzzle definitions as JSON, imported at build time. Zero runtime cost after bundling.
- `components/` is organized by feature area (game, puzzle-select, leaderboard, auth, ui) rather than by component type (atoms, molecules, organisms). Feature-based organization scales better for this project size.

---

## Data Flow Patterns

### Pattern 1: Vehicle Drag-and-Drop

```
User touches/clicks vehicle
  -> useDrag hook captures pointer
  -> On pointer move: compute snapped grid position
  -> On pointer up:
     1. Call getValidMoves() from engine
     2. If move is valid: dispatch MOVE_VEHICLE
     3. Play slide sound
     4. GameBoard re-renders with updated positions
     5. Check win condition
```

**Implementation approach:** Use pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) rather than HTML5 drag-and-drop. Pointer events work on both mouse and touch, give pixel-level control, and avoid the quirks of the drag-and-drop API (ghost images, drop zones, etc.).

Constrain dragging to the vehicle's orientation axis. Snap to grid cells on release. Show a visual preview during drag (translate the vehicle element with CSS transform).

### Pattern 2: Score Submission

```
WIN detected
  -> WinModal shown with score summary
  -> User clicks "Submit Score"
  -> If not authenticated: show LoginModal first
  -> Call leaderboardService.submitScore({
       puzzleId, userId, displayName,
       moves, timeMs, score, difficulty
     })
  -> Firestore security rules validate the submission
  -> Update userProfiles/{uid}.puzzleProgress.{puzzleId}
  -> Refresh leaderboard display
```

**Optimistic vs. pessimistic:** Use pessimistic updates for score submission (wait for Firestore confirmation before showing "Submitted!"). Scores are important -- don't tell the user it worked if it didn't.

### Pattern 3: Puzzle Loading

```
User navigates to /play/beginner-05
  -> GamePage reads puzzleId from URL params
  -> Looks up puzzle in static JSON data (puzzleIndex.ts)
  -> Dispatches LOAD_PUZZLE to game reducer
  -> Board renders with initial vehicle positions
  -> Timer starts on first move (not on load)
```

No Firestore read needed. Instant.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Game Logic in Components
**What:** Putting move validation, win detection, or board state manipulation directly inside React components.
**Why bad:** Untestable without rendering React. Difficult to refactor. Logic gets duplicated across components.
**Instead:** Keep all game logic in `engine/`. Components only dispatch actions and render state.

### Anti-Pattern 2: Storing Full Board State in Firestore
**What:** Saving the complete board state (all vehicle positions) to Firestore on every move for "sync" or "resume" features.
**Why bad:** Firestore charges per write. 80+ moves per puzzle = 80+ writes. Expensive and unnecessary.
**Instead:** Store only the final score on completion. If you want resume functionality, use `localStorage` for in-progress games.

### Anti-Pattern 3: Fetching Leaderboard Data Without Pagination
**What:** Loading all leaderboard entries for a puzzle.
**Why bad:** If a popular puzzle has 10,000+ entries, you're loading and paying for all of them.
**Instead:** Always use `.limit(10)` or `.limit(25)` on leaderboard queries. Implement cursor-based pagination if users want to see beyond top 10.

### Anti-Pattern 4: Real-Time Listeners for Static Data
**What:** Using `onSnapshot` for puzzle definitions or leaderboard data.
**Why bad:** Puzzles never change. Leaderboards change infrequently. Real-time listeners keep connections open and consume read quota on every change.
**Instead:** Use `getDoc`/`getDocs` (one-time reads) for puzzles and leaderboards. Add a "Refresh" button for leaderboards rather than live updates.

### Anti-Pattern 5: CSS Pixel Positioning for Vehicles
**What:** Using absolute pixel values (`left: 120px`) for vehicle positioning.
**Why bad:** Breaks on different screen sizes. Requires complex responsive calculations.
**Instead:** Use CSS Grid for the board. Position vehicles using `grid-row` and `grid-column`. During drag, use CSS `transform: translate()` for smooth animation, then snap to grid on release.

---

## Rendering Strategy: CSS Grid + Transform

The board should be a CSS Grid, not absolute positioning:

```css
.game-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(6, 1fr);
  aspect-ratio: 1;              /* Always square */
  max-width: 500px;
  gap: 2px;
  position: relative;           /* For drag overlay */
}

.vehicle {
  border-radius: 8px;
  cursor: grab;
  transition: transform 0.15s ease;  /* Smooth snap animation */
  touch-action: none;                /* Prevent browser scroll during drag */
  z-index: 1;
}

.vehicle.dragging {
  z-index: 10;
  cursor: grabbing;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: none;             /* No transition during active drag */
}

.vehicle.car.horizontal {
  grid-column: span 2;
}

.vehicle.truck.horizontal {
  grid-column: span 3;
}

.vehicle.car.vertical {
  grid-row: span 2;
}

.vehicle.truck.vertical {
  grid-row: span 3;
}
```

**Vehicle placement via inline style (dynamic):**
```tsx
<div
  className={`vehicle ${type} ${orientation}`}
  style={{
    gridRowStart: position.row + 1,    // CSS grid is 1-indexed
    gridColumnStart: position.col + 1,
    transform: isDragging ? `translate(${dragOffsetX}px, ${dragOffsetY}px)` : 'none',
  }}
/>
```

---

## Sound Architecture

Use the **Web Audio API** through a simple singleton manager, not `<audio>` elements:

```typescript
// utils/soundManager.ts

class SoundManager {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private muted: boolean = false;

  async init() {
    this.context = new AudioContext();
    // Preload all sounds
    await Promise.all([
      this.load('slide', '/sounds/slide.mp3'),
      this.load('win', '/sounds/win.mp3'),
      this.load('start', '/sounds/start.mp3'),
    ]);
  }

  private async load(name: string, url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const audioBuffer = await this.context!.decodeAudioData(buffer);
    this.buffers.set(name, audioBuffer);
  }

  play(name: string) {
    if (this.muted || !this.context) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.start(0);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('soundMuted', String(this.muted));
  }
}

export const soundManager = new SoundManager();
```

**Why Web Audio API over `<audio>` elements:**
- Lower latency (important for slide sound feedback during drag)
- Can play the same sound overlapping
- Better mobile support
- No DOM elements needed

**Important:** AudioContext must be created after a user gesture (browser policy). Initialize on the first click/tap anywhere in the app.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Puzzle loading** | Static JSON, instant | Same (bundled) | Same (bundled) |
| **Leaderboard reads** | getDocs with limit(10), fast | Same, add caching | Cloud Functions to aggregate; cache top 10 in a single doc |
| **Leaderboard writes** | Direct Firestore write | Same | Cloud Functions with rate limiting; batch writes |
| **Auth** | Firebase free tier | Firebase free tier | Firebase Blaze plan |
| **Score integrity** | Security rules | Security rules | Cloud Functions validating move sequences |
| **Bundle size** | ~200KB gzipped | Same | Code-split routes with React.lazy |

**For v1 (targeting < 10K users), the simple architecture described above is sufficient.** No need for Cloud Functions, server-side rendering, or caching layers.

---

## Testing Strategy (Architecture Implications)

The separation of `engine/` from `components/` enables a clean testing pyramid:

| Layer | Tool | What to Test |
|-------|------|-------------|
| `engine/` | Vitest (unit) | Move validation, win detection, score calculation, reducer transitions |
| `hooks/` | React Testing Library | State transitions, Firestore mock integration |
| `components/` | React Testing Library | Rendering, user interactions, accessibility |
| E2E | Playwright | Full puzzle solve flow, leaderboard submission |

**Test priority:** `engine/` first (highest value, easiest to test), then component integration tests for GameBoard drag-and-drop, then E2E for the happy path.

---

## Sources

- React documentation (component patterns, hooks, context): HIGH confidence from training data
- Firebase Firestore documentation (data model, security rules, indexes): HIGH confidence from training data
- Web Audio API (MDN): HIGH confidence from training data
- CSS Grid layout patterns: HIGH confidence from training data
- React Router v6 patterns: HIGH confidence from training data
- NOTE: Web search and Context7 were unavailable during this research session. All recommendations are based on well-established patterns in the React and Firebase ecosystems that have been stable for 2+ years. Confidence is MEDIUM overall due to inability to verify against current documentation versions.
