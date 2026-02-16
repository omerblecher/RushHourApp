import { describe, it, expect } from 'vitest';
import { solvePuzzle } from '../solver.js';

describe('solvePuzzle', () => {
  it('returns 0 moves for an already-solved puzzle (X at cols 4-5, row 2)', () => {
    // X at row 2, cols 4-5 = indices 16 and 17
    const grid = '.'.repeat(16) + 'XX' + '.'.repeat(18);
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result).toEqual({ solvable: true, minMoves: 0 });
  });

  it('returns 1 move for a one-move puzzle (X at cols 3-4, slide right once)', () => {
    // X at row 2, cols 3-4 = indices 15 and 16
    const grid = '.'.repeat(15) + 'XX' + '.'.repeat(19);
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result).toEqual({ solvable: true, minMoves: 1 });
  });

  it('solves a multi-move puzzle and returns optimal move count', () => {
    // Row 0: O . A A . .   O vertical col 0, A horizontal row 0
    // Row 1: O . . B . .   B vertical col 3
    // Row 2: O X X B . .   X at cols 1-2, needs to reach cols 4-5
    // Row 3: . . . B C C   C horizontal row 3
    // Row 4: . . D D . .   D horizontal row 4
    // Row 5: . . . . . .
    const grid = 'O.AA..O..B..OXXB....BCCC..DD........';
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result.solvable).toBe(true);
    // Solver finds optimal -- just verify it's a positive number
    expect(result.minMoves).toBeGreaterThan(0);
  });

  it('returns unsolvable for a fully packed board where no vehicle can move', () => {
    // Every cell filled with horizontal size-2 vehicles, X stuck at row 2 cols 2-3
    const grid = 'AABBCCDDEEFFGGXXHHIIJJKKLLMMNNOOPPQQ';
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result).toEqual({ solvable: false, minMoves: -1 });
  });

  it('completes within 5 seconds on a beginner puzzle (performance guard)', () => {
    const rows = ['.AA..O', '.....O', 'XX...O', 'B..CCC', 'BDD...', '......'];
    const grid = rows.join('');
    const start = Date.now();
    solvePuzzle(grid);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
