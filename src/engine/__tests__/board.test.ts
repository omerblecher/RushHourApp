import { describe, it, expect } from 'vitest';
import { parseGridString, buildOccupancyGrid, vehicleCells } from '../board.js';
import type { Vehicle } from '../types.js';

// 6x6 grid layout:
// Row 0: A A B O . .
// Row 1: . . B O . L
// Row 2: . X X O . L
// Row 3: C P P P . .
// Row 4: C D D . G G
// Row 5: . F F E E .
const KNOWN_PUZZLE = 'AABO....BO.L.XXO.LCPPP..CDD.GG.FFEE.';

describe('parseGridString', () => {
  it('returns correct vehicle IDs from known puzzle', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const ids = vehicles.map((v) => v.id).sort();
    expect(ids).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'P', 'X']);
  });

  it('parses vehicle X as horizontal, size 2, at row 2 col 1', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const x = vehicles.find((v) => v.id === 'X')!;
    expect(x).toBeDefined();
    expect(x.orientation).toBe('horizontal');
    expect(x.size).toBe(2);
    expect(x.position).toEqual({ row: 2, col: 1 });
  });

  it('parses vehicle P as horizontal, size 3', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const p = vehicles.find((v) => v.id === 'P')!;
    expect(p).toBeDefined();
    expect(p.orientation).toBe('horizontal');
    expect(p.size).toBe(3);
  });

  it('parses vehicle O as vertical, size 3', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const o = vehicles.find((v) => v.id === 'O')!;
    expect(o).toBeDefined();
    expect(o.orientation).toBe('vertical');
    expect(o.size).toBe(3);
  });

  it('dot cells produce no vehicle', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const dot = vehicles.find((v) => v.id === '.');
    expect(dot).toBeUndefined();
  });

  it('rejects strings with wrong length', () => {
    expect(() => parseGridString('ABC')).toThrow();
    expect(() => parseGridString('A'.repeat(37))).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => parseGridString('')).toThrow();
  });

  it('parses single-vehicle puzzle', () => {
    const grid = 'XX' + '.'.repeat(34);
    const vehicles = parseGridString(grid);
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].id).toBe('X');
    expect(vehicles[0].size).toBe(2);
    expect(vehicles[0].orientation).toBe('horizontal');
    expect(vehicles[0].position).toEqual({ row: 0, col: 0 });
  });
});

describe('buildOccupancyGrid', () => {
  it('returns 6x6 grid with vehicle IDs and nulls', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const grid = buildOccupancyGrid(vehicles);
    expect(grid).toHaveLength(6);
    grid.forEach((row) => expect(row).toHaveLength(6));
  });

  it('maps target car X correctly at cells [2][1] and [2][2]', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const grid = buildOccupancyGrid(vehicles);
    expect(grid[2][1]).toBe('X');
    expect(grid[2][2]).toBe('X');
  });

  it('maps empty cells as null', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const grid = buildOccupancyGrid(vehicles);
    // Cell [0][4] is '.' in the grid string
    expect(grid[0][4]).toBeNull();
  });

  it('maps all vehicles correctly for known puzzle', () => {
    const vehicles = parseGridString(KNOWN_PUZZLE);
    const grid = buildOccupancyGrid(vehicles);
    // Row 0: A A B O . .
    expect(grid[0][0]).toBe('A');
    expect(grid[0][1]).toBe('A');
    expect(grid[0][2]).toBe('B');
    expect(grid[0][3]).toBe('O');
    // Row 4: C D D . G G
    expect(grid[4][0]).toBe('C');
    expect(grid[4][1]).toBe('D');
    expect(grid[4][2]).toBe('D');
    expect(grid[4][3]).toBeNull();
    expect(grid[4][4]).toBe('G');
    expect(grid[4][5]).toBe('G');
  });
});

describe('vehicleCells', () => {
  it('returns correct positions for horizontal car size 2 at (0,0)', () => {
    const vehicle: Vehicle = { id: 'A', position: { row: 0, col: 0 }, size: 2, orientation: 'horizontal' };
    const cells = vehicleCells(vehicle);
    expect(cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('returns correct positions for vertical truck size 3 at (1,3)', () => {
    const vehicle: Vehicle = { id: 'O', position: { row: 1, col: 3 }, size: 3, orientation: 'vertical' };
    const cells = vehicleCells(vehicle);
    expect(cells).toEqual([
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ]);
  });
});
