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

  it('solves a classic beginner puzzle within a reasonable move range', () => {
    const grid = 'AA.O..B..OXXB..O..CPPP.CDDEEL.FFG.L';
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result.solvable).toBe(true);
    expect(result.minMoves).toBeGreaterThanOrEqual(5);
    expect(result.minMoves).toBeLessThanOrEqual(20);
  });

  it('returns unsolvable for a fully packed board where no vehicle can move', () => {
    // Every cell filled with horizontal size-2 vehicles, X stuck at row 2 cols 2-3
    const grid = 'AABBCCDDEEFFGGXXHHIIJJKKLLMMNNOOPPQQ';
    expect(grid.length).toBe(36);

    const result = solvePuzzle(grid);
    expect(result).toEqual({ solvable: false, minMoves: -1 });
  });

  it('completes within 5 seconds on a beginner puzzle (performance guard)', () => {
    const grid = 'AA.O..B..OXXB..O..CPPP.CDDEEL.FFG.L';
    const start = Date.now();
    solvePuzzle(grid);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
