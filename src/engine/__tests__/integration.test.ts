import { describe, it, expect } from 'vitest';
import { GameEngine, solvePuzzle, parseGridString } from '../index.js';

describe('Integration: board + engine + solver', () => {
  // Simple puzzle: X at row 2 cols 3-4, one move right to win
  // Row 0: ......  Row 1: ......  Row 2: ...XX.  Row 3: ......  Row 4: ......  Row 5: ......
  // Indices: 0-5=row0, 6-11=row1, 12-17=row2(XX at 15,16), 18-23=row3, 24-29=row4, 30-35=row5
  const ONE_MOVE_PUZZLE = '............' + '...XX.' + '..................';

  // Puzzle with a vertical blocker that must move first
  // Row 0: ......  Row 1: ....O.  Row 2: .XX.O.  Row 3: ....O.  Row 4: ......  Row 5: ......
  const TWO_STEP_PUZZLE = '......' + '....O.' + '.XX.O.' + '....O.' + '......' + '......';

  it('parses, solves, and plays a one-move puzzle', () => {
    // Parse
    const vehicles = parseGridString(ONE_MOVE_PUZZLE);
    expect(vehicles.length).toBe(1);
    expect(vehicles[0].id).toBe('X');

    // Solve
    const solution = solvePuzzle(ONE_MOVE_PUZZLE);
    expect(solution.solvable).toBe(true);
    expect(solution.minMoves).toBe(1);

    // Play through
    const engine = new GameEngine(ONE_MOVE_PUZZLE);
    const state0 = engine.getState();
    expect(state0.isWon).toBe(false);
    expect(state0.moveCount).toBe(0);

    // Move X right to col 4 (occupies 4-5) -> win
    const result = engine.move('X', 2, 4);
    expect(result.success).toBe(true);
    expect(result.state.isWon).toBe(true);
    expect(result.state.moveCount).toBe(1);
    expect(result.state.moveCount).toBeGreaterThanOrEqual(solution.minMoves);
  });

  it('solver and engine agree on a multi-move puzzle', () => {
    const solution = solvePuzzle(TWO_STEP_PUZZLE);
    expect(solution.solvable).toBe(true);
    expect(solution.minMoves).toBeGreaterThanOrEqual(2);

    const engine = new GameEngine(TWO_STEP_PUZZLE);

    // Move O (vertical, col 4, rows 1-3) down to make room
    const r1 = engine.move('O', 3, 4);
    expect(r1.success).toBe(true);

    // Now move X right to col 4
    const r2 = engine.move('X', 2, 4);
    expect(r2.success).toBe(true);
    expect(r2.state.isWon).toBe(true);

    // Player's move count >= optimal
    expect(r2.state.moveCount).toBeGreaterThanOrEqual(solution.minMoves);
  });

  it('barrel export provides all public API symbols', () => {
    expect(GameEngine).toBeDefined();
    expect(solvePuzzle).toBeDefined();
    expect(parseGridString).toBeDefined();
  });

  it('engine rejects moves after win', () => {
    const engine = new GameEngine(ONE_MOVE_PUZZLE);
    engine.move('X', 2, 4);
    const state = engine.getState();
    expect(state.isWon).toBe(true);

    const afterWin = engine.move('X', 2, 3);
    expect(afterWin.success).toBe(false);
    expect(afterWin.reason).toBeDefined();
  });

  it('undo after win allows continued play', () => {
    const engine = new GameEngine(ONE_MOVE_PUZZLE);
    engine.move('X', 2, 4);
    expect(engine.getState().isWon).toBe(true);

    const undoResult = engine.undo();
    expect(undoResult.success).toBe(true);
    expect(undoResult.state.isWon).toBe(false);
    // Move count incremented (undo counts as a move per user decision)
    expect(undoResult.state.moveCount).toBe(2);
  });
});
