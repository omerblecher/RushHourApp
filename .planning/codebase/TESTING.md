# Testing Patterns
*Generated: 2026-04-12*

## Summary
Tests cover only the pure game engine layer (`src/engine/`) using Vitest. There are no tests for React components, stores, services, hooks, or screens. The codebase has a pre-build validation script (`scripts/validate-puzzles.ts`) that acts as a data-integrity guard and runs automatically before every production build.

---

## Test Framework

**Runner:** Vitest 4.x
**Config:** `vitest.config.ts` (project root)
**Assertion library:** Vitest built-in (`expect`) — no separate assertion library
**Globals:** enabled via `globals: true` in vitest config (no need to import `describe`/`it`/`expect`)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, './src/engine'),
    },
  },
});
```

**Run commands:**
```bash
npm test              # vitest run (single pass, CI mode)
npx vitest            # watch mode (interactive dev)
npx vitest --coverage # coverage report (no threshold configured)
```

Note: `tsconfig.json` explicitly excludes `**/*.test.ts` from compilation — tests are compiled by Vitest directly, not `tsc`.

---

## Test File Organization

**Location:** `src/engine/__tests__/` — a dedicated `__tests__` subdirectory within the engine module. Tests are NOT co-located beside source files.

**Naming:** `<module>.test.ts` matching the source file name:
```
src/engine/
├── __tests__/
│   ├── board.test.ts       → tests src/engine/board.ts
│   ├── engine.test.ts      → tests src/engine/engine.ts
│   ├── integration.test.ts → cross-module integration tests
│   └── solver.test.ts      → tests src/engine/solver.ts
├── board.ts
├── engine.ts
├── index.ts
├── solver.ts
└── types.ts
```

**Imports in test files** use the `@engine` path alias with `.js` extensions (ESM compatibility):
```typescript
import { parseGridString, buildOccupancyGrid, vehicleCells } from '../board.js';
import { GameEngine } from '../engine.js';
import { solvePuzzle } from '../solver.js';

// integration.test.ts uses the barrel
import { GameEngine, solvePuzzle, parseGridString } from '../index.js';
```

---

## Test Structure

**Suite organization** uses `describe` blocks nested one or two levels deep:
```typescript
describe('GameEngine', () => {
  describe('constructor and getState', () => {
    it('initializes with parsed vehicles, moveCount 0, empty history, null times, not won', () => { ... });
  });
  describe('move validation', () => { ... });
  describe('win detection', () => { ... });
  describe('undo', () => { ... });
  describe('reset', () => { ... });
});
```

**Test naming** describes the exact behavior, including relevant inputs:
- "parses vehicle X as horizontal, size 2, at row 2 col 1"
- "rejects move that collides with another vehicle"
- "after win + undo: isWon becomes false, endTime resets to null"

**Test data** is defined as module-level constants in the test file:
```typescript
const KNOWN_PUZZLE = 'AABO....BO.L.XXO.LCPPP..CDD.GG.FFEE.';
const ONE_MOVE_PUZZLE = '............' + '...XX.' + '..................';
```
Inline grid comments describe the board layout for readability:
```typescript
// Row 0: A A B O . .
// Row 2: . X X O . L
```

**No beforeEach/afterEach** — each test constructs its own fresh `GameEngine` instance. No shared mutable state between tests.

---

## What Is Tested

### `board.test.ts` — `src/engine/board.ts`
- `parseGridString`: vehicle ID extraction, orientation detection, size detection, position detection, error on wrong length, edge cases (single vehicle, empty string)
- `buildOccupancyGrid`: 6x6 dimensions, correct vehicle placement, null for empty cells
- `vehicleCells`: correct cell list for horizontal and vertical vehicles

### `engine.test.ts` — `src/engine/engine.ts`
- Constructor: initial state values (moveCount=0, empty history, null times, isWon=false)
- `getState`: immutability (mutating snapshot doesn't affect engine)
- Move validation: valid horizontal moves (left/right), collision rejection, bounds rejection (negative, overflow), wrong-axis rejection, unknown vehicle ID rejection, path clearance (no teleporting past blockers)
- Win detection: X not at winning position = no win, X at row 2 col 4 = win, endTime set on win, moves rejected after win
- Move counter: increments on valid move, unchanged on invalid, multi-cell slide = 1 move
- Timer: startTime null before moves, set on first valid move, unchanged on subsequent moves
- Undo: returns MoveResult shape, restores position, increments moveCount (undo counts as a move), fails on empty history, multi-step undo, resets isWon/endTime on win undo, preserves startTime
- Reset: restores vehicles, zeros moveCount, clears history/times/isWon, allows timer to restart

### `solver.test.ts` — `src/engine/solver.ts`
- Already-solved puzzle (0 moves)
- One-move puzzle (1 move)
- Multi-move puzzle (optimal count > 0)
- Unsolvable board (`{ solvable: false, minMoves: -1 }`)
- Performance guard: beginner puzzle solves within 5 seconds

### `integration.test.ts` — cross-module
- Parse → solve → play a one-move puzzle end-to-end
- Solver and engine agree on a multi-move puzzle
- Barrel export (`src/engine/index.ts`) provides all public API symbols
- Engine rejects moves after win
- Undo after win allows continued play

---

## Assertion Patterns

**Exact equality:**
```typescript
expect(state.moveCount).toBe(0);
expect(result.state.isWon).toBe(true);
expect(result.state.vehicles[0].position).toEqual({ row: 0, col: 2 });
```

**Shape membership** for error messages (avoids locking to exact wording):
```typescript
expect(result.reason!.toLowerCase()).toMatch(/blocked|collision|occupied/);
expect(result.reason!.toLowerCase()).toMatch(/won|over|finished/);
expect(result.reason!.toLowerCase()).toMatch(/no moves/);
```

**Structural presence:**
```typescript
expect(result).toHaveProperty('success');
expect(result).toHaveProperty('state');
```

**Null checks with type confirmation:**
```typescript
expect(result.state.endTime).not.toBeNull();
expect(typeof result.state.endTime).toBe('number');
```

**Array checks:**
```typescript
expect(vehicles).toHaveLength(1);
expect(ids).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'P', 'X']);
```

**Throw assertion:**
```typescript
expect(() => parseGridString('ABC')).toThrow();
```

**Performance guard:**
```typescript
const start = Date.now();
solvePuzzle(grid);
const elapsed = Date.now() - start;
expect(elapsed).toBeLessThan(5000);
```

---

## Mocking

**No mocks used anywhere.** All tests run against real implementations. `GameEngine` directly calls `parseGridString`, `buildOccupancyGrid`, etc. — no dependency injection or stub boundaries.

`Date.now()` is not mocked; timer tests check for non-null / type-of-number rather than exact timestamps.

---

## Pre-Build Validation Hook

**Script:** `scripts/validate-puzzles.ts`
**Trigger:** `npm run prebuild` (runs automatically before `npm run build`)
**Purpose:** Validates puzzle JSON data integrity — ensures every puzzle definition in `src/data/puzzles/*.json` is parseable and solvable before a production build is allowed to proceed.

```json
// package.json
"scripts": {
  "validate-puzzles": "tsx scripts/validate-puzzles.ts",
  "prebuild": "npm run validate-puzzles"
}
```

This acts as a data-layer CI guard for the puzzle data files in `src/data/puzzles/` (`beginner.json`, `intermediate.json`, `advanced.json`, `expert.json`).

---

## Coverage

**No coverage threshold is configured** in `vitest.config.ts`. Coverage is available via `npx vitest --coverage` but is not enforced in CI or pre-commit.

**Covered:** All of `src/engine/` (board, engine, solver, index barrel).

**Not covered (zero test coverage):**
- `src/components/` — Board, Vehicle, BoardCell, GameHUD, GameHeader, ControlBar, all modals
- `src/screens/` — GameScreen, WinModal, PuzzleSelectScreen, MainMenuScreen, AuthPromptScreen, LeaderboardScreen, ProfileScreen
- `src/store/` — gameStore, authStore, progressStore
- `src/hooks/` — useDrag, useLeaderboard
- `src/services/` — scoreService, soundService
- `src/utils/` — formatTime, vehicleColors
- `src/firebase.ts`

---

## Gaps / Uncertainties

- No component tests (React Testing Library or similar) — the entire UI layer is untested.
- No E2E tests (Playwright, Cypress, etc.) — not installed or configured.
- `useDrag` hook has complex pointer event logic with no test coverage; bugs here would be silent.
- `authStore` upgrade flow (anonymous-to-Google with credential conflict) has no tests.
- Firebase service calls in `scoreService` and `useLeaderboard` are untested and unmocked.
- The `validate-puzzles` prebuild script is not itself tested.
