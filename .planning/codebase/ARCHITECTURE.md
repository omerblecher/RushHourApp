# Architecture
*Generated: 2026-04-12*

## Summary

Rush Hour uses a strict layered architecture: a pure TypeScript game engine at the bottom, Zustand stores as the state layer, and React components at the top. A separate service layer handles side effects (Firebase, audio). This separation allows the engine to be tested in isolation with zero UI dependencies.

## Overall Pattern

```
┌─────────────────────────────────────┐
│           React UI Layer            │
│  screens/ + components/ + hooks/    │
├─────────────────────────────────────┤
│         Zustand Store Layer         │
│  gameStore · authStore · progress   │
├──────────────────┬──────────────────┤
│   Engine Layer   │  Service Layer   │
│  engine/Game     │  scoreService    │
│  engine/solver   │  soundService    │
└──────────────────┴──────────────────┘
         ↕ Firebase / Howler.js
```

- **Engine layer** — pure TypeScript, zero React/Firebase deps, fully unit-tested
- **Store layer** — Zustand stores wrap engine + external services; single source of truth
- **Service layer** — side effects only (Firestore reads/writes, audio playback)
- **UI layer** — React components consume stores; no direct engine access

## Game Engine Design

**File:** `src/engine/GameEngine.ts`

- Board state represented as a 36-character string (6×6 grid)
- `GameEngine` class owns all state mutations: `move()`, `undo()`, `reset()`
- Move validation pipeline: axis-constrained → bounds-checked → collision-detected (occupancy grid)
- Win condition: vehicle `X` (red car) reaches row 2 col 4 (exit position)
- Undo costs a move (move counter increments, not decrements)
- `PuzzleDefinition` interface: `{ id, grid, difficulty, minMoves }`
- `Difficulty` type alias: `'easy' | 'medium' | 'hard' | 'expert'`

**File:** `src/engine/solver.ts`

- BFS solver computes `minMoves` for each puzzle at build time (prebuild hook)
- Used offline only — not called during gameplay
- Validates all 100 puzzles are solvable before production build

**File:** `src/engine/types.ts`

- Shared types: `Vehicle`, `PuzzleDefinition`, `MoveResult`, `Difficulty`
- `Vehicle.size` typed as `2 | 3` (never 1)

## Zustand Store Architecture

| Store | File | Persisted | Owns |
|-------|------|-----------|------|
| `gameStore` | `src/store/gameStore.ts` | No | Active `GameEngine` instance, move/timer state, drag state |
| `authStore` | `src/store/authStore.ts` | No (Firebase owns session) | Firebase `User` object, `isLoading` flag |
| `progressStore` | `src/store/progressStore.ts` | Yes (localStorage) | Completed puzzles map, personal best times/moves per puzzle |

No Zustand `persist` for auth — Firebase SDK persists session in IndexedDB. Auth store holds in-memory reference only.

## Service Layer

**`src/services/scoreService.ts`**
- `submitScore()` — optimistic Firestore write; security rules reject non-improvements silently
- `getLeaderboard()` — `getDocs` (one-time read, not `onSnapshot`); returns top-50 sorted
- `mergeAnonymousScores()` — iterates ALL_PUZZLES client-side to transfer anon user docs on sign-in upgrade
- `ScoreDoc` interface exported for consistent typing in leaderboard hook

**`src/services/soundService.ts`**
- Module-level singleton (Howl instances created once to prevent audio context exhaustion)
- `Howler.mute()` for global mute with localStorage persistence (key: `rushhour_muted`)
- Lazy-initialized via dynamic `import()` — deferred from initial bundle
- Sounds: `slide`, `win`, `levelStart`

## Data Flow: Key Sequences

**Puzzle Load:**
`PuzzleSelect tile click` → `navigate('/game/:id')` → `GameScreen` reads puzzle JSON → `gameStore.loadPuzzle()` → new `GameEngine(puzzle)` → board renders from engine state

**Drag Move:**
`pointerdown` on vehicle → `useDrag` hook captures board rect via `closest('[data-board]')` → `pointermove` computes delta → collision-clamped to valid range → `pointerup` snaps to nearest cell → 150ms CSS transition → `gameStore.move()` commits to engine

**Keyboard Move:**
`Tab` focuses vehicle → `Board` owns `selectedVehicleId` state → arrow key → `gameStore.move()` → engine validates → `playSlide()` if cell changed

**Win Sequence:**
`gameStore.move()` returns `isWin: true` → `progressStore.recordCompletion()` → `submitScore()` (async, silent fail) → 2-second `setTimeout` → `WinModal` renders with leaderboard data

**Auth Gate:**
`initAuth()` in `main.tsx` before `createRoot()` → `authStore` sets user → `isLoading: false` → `App.tsx` renders routes (no flash for returning users)

## Routing Table

| Route | Screen | Auth Required |
|-------|--------|--------------|
| `/` | `MainMenuScreen` | No |
| `/select/:difficulty` | `PuzzleSelectScreen` | No |
| `/game/:id` | `GameScreen` | No |
| `/profile` | `ProfileScreen` | Yes (redirects to login) |
| `/leaderboard` | `LeaderboardScreen` | No (but route unreachable from UI) |

Auth gate lives in `App.tsx` — `isLoading` prevents flash, auth redirect per-route.

## Error Handling Philosophy

- **Engine moves:** Return `MoveResult` objects (result pattern, not exceptions)
- **Score submission:** Silent rejection — Firestore security rules block non-improvements; client swallows error
- **Leaderboard fetch:** Silent fail — modal shows empty state
- **Firebase offline:** Silently fails; puzzles and gameplay fully offline via local JSON
- **No error boundaries** — uncaught render errors would blank-screen

## Gaps / Uncertainties

- `authStore.isLoading` has no timeout — first-visit-offline causes permanent spinner (known debt)
- `LeaderboardScreen` route is unreachable from UI navigation (dead route, known debt)
