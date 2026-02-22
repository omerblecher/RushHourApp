# Phase 1: Game Engine - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure TypeScript game engine that models Rush Hour mechanics: 6x6 grid, vehicle placement, move validation with collision detection, win detection, move/timer tracking, and a BFS puzzle solver. Zero React or Firebase dependencies. Testable in isolation.

</domain>

<decisions>
## Implementation Decisions

### Puzzle Data Format
- Puzzles stored as 36-character grid strings (e.g., `"AA.O..B..OXXB..O..CPPP.CDDEEL.FFG.L"`) — standard Rush Hour encoding
- Target car identified by convention: always vehicle ID `X` in the grid string
- Vehicle colors auto-assigned from a palette based on vehicle index — not stored per-puzzle
- Puzzle layout data and metadata (difficulty, minMoves, name) stored in separate files — layout strings in one file, metadata index in another

### Move Semantics
- Any single slide of a vehicle = 1 move, regardless of how many cells it travels
- Engine records start and end position only, not intermediate cells during a drag
- Undo supported (no redo) — player can step back through move history
- Move counter does NOT decrement on undo — all moves count, including undone ones. Discourages undo spam on leaderboards while still allowing experimentation.

### Solver Behavior
- BFS solver returns optimal move count only — no solution path stored
- Solver runs at build time only — pre-compute optimal counts, bake results into puzzle metadata. Zero runtime cost.
- Solver lives in the engine/ module (shares types and grid model), but is only invoked during build-time validation, not shipped as a runtime feature
- Validation: verify every puzzle is solvable and record optimal move count. Reject unsolvable puzzles. No difficulty-classification cross-check.

### Engine API Surface
- Class-based engine (`GameEngine`) with immutable state snapshots — class manages internal state, exposes immutable views
- Pure function style where possible within the class (methods return new state objects)
- Invalid moves return a result object: `{ success: boolean, state: GameState, reason?: string }` — UI can show feedback on why a move failed
- Engine tracks timer internally — records startTime on first move, elapsed time on win. Timer is part of game state.

### Claude's Discretion
- Internal data structures for the occupancy grid and collision detection
- BFS solver optimization strategy (visited state hashing, etc.)
- Exact GameState interface shape beyond the decided properties
- Unit test framework choice and test organization
- How the grid string parser handles edge cases (invalid characters, wrong length)

</decisions>

<specifics>
## Specific Ideas

- Grid string format `"AA.O..B..OXXB..O..CPPP.CDDEEL.FFG.L"` is the standard used across academic and hobbyist Rush Hour implementations — maintain compatibility with this ecosystem
- The undo-counts-as-moves mechanic creates an interesting strategic tension: players can explore freely but their leaderboard score reflects total actions taken
- Result objects on invalid moves enable the UI layer to potentially show "blocked by [vehicle]" feedback later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-game-engine*
*Context gathered: 2026-02-16*
