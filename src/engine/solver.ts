/**
 * BFS solver for Rush Hour puzzles.
 * Computes the optimal (minimum) move count for any solvable configuration.
 *
 * Uses breadth-first search over the state space, with the 36-char grid string
 * as the canonical state representation for the visited set.
 */

import type { Vehicle } from './types.js';
import { parseGridString, buildOccupancyGrid } from './board.js';

const GRID_SIZE = 6;
const WIN_ROW = 2;
const WIN_COL = 4; // X must occupy cols 4-5 on row 2

/**
 * Serialize an array of vehicles back into a 36-char grid string.
 * Used as the canonical state key for BFS visited set.
 */
function vehiclesToGridString(vehicles: Vehicle[]): string {
  const cells = new Array<string>(GRID_SIZE * GRID_SIZE).fill('.');
  for (const v of vehicles) {
    for (let i = 0; i < v.size; i++) {
      if (v.orientation === 'horizontal') {
        cells[v.position.row * GRID_SIZE + v.position.col + i] = v.id;
      } else {
        cells[(v.position.row + i) * GRID_SIZE + v.position.col] = v.id;
      }
    }
  }
  return cells.join('');
}

/**
 * Check if X vehicle is at the winning position (cols 4-5, row 2).
 */
function isWinState(vehicles: Vehicle[]): boolean {
  const x = vehicles.find((v) => v.id === 'X');
  if (!x) return false;
  return x.position.row === WIN_ROW && x.position.col === WIN_COL && x.orientation === 'horizontal';
}

/**
 * Deep-clone vehicles array for state branching.
 */
function cloneVehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.map((v) => ({
    ...v,
    position: { ...v.position },
  }));
}

/**
 * Generate all valid successor states from the current vehicle configuration.
 * Each vehicle can slide 1..N cells along its axis until blocked or out of bounds.
 */
function generateMoves(vehicles: Vehicle[]): Vehicle[][] {
  const grid = buildOccupancyGrid(vehicles);
  const successors: Vehicle[][] = [];

  for (let vi = 0; vi < vehicles.length; vi++) {
    const v = vehicles[vi];

    if (v.orientation === 'horizontal') {
      // Try sliding left
      for (let newCol = v.position.col - 1; newCol >= 0; newCol--) {
        if (grid[v.position.row][newCol] !== null) break;
        const next = cloneVehicles(vehicles);
        next[vi].position.col = newCol;
        successors.push(next);
      }
      // Try sliding right
      for (let newCol = v.position.col + 1; newCol + v.size <= GRID_SIZE; newCol++) {
        if (grid[v.position.row][newCol + v.size - 1] !== null) break;
        const next = cloneVehicles(vehicles);
        next[vi].position.col = newCol;
        successors.push(next);
      }
    } else {
      // Try sliding up
      for (let newRow = v.position.row - 1; newRow >= 0; newRow--) {
        if (grid[newRow][v.position.col] !== null) break;
        const next = cloneVehicles(vehicles);
        next[vi].position.row = newRow;
        successors.push(next);
      }
      // Try sliding down
      for (let newRow = v.position.row + 1; newRow + v.size <= GRID_SIZE; newRow++) {
        if (grid[newRow + v.size - 1][v.position.col] !== null) break;
        const next = cloneVehicles(vehicles);
        next[vi].position.row = newRow;
        successors.push(next);
      }
    }
  }

  return successors;
}

/**
 * Solve a Rush Hour puzzle using BFS.
 *
 * @param gridString - 36-character grid string representing the board
 * @returns Object with `solvable` flag and `minMoves` (optimal count, or -1 if unsolvable)
 */
export function solvePuzzle(gridString: string): { solvable: boolean; minMoves: number } {
  const vehicles = parseGridString(gridString);

  // Check if already solved
  if (isWinState(vehicles)) {
    return { solvable: true, minMoves: 0 };
  }

  // BFS
  const visited = new Set<string>();
  visited.add(gridString);

  const queue: { vehicles: Vehicle[]; depth: number }[] = [{ vehicles, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const successors = generateMoves(current.vehicles);

    for (const nextVehicles of successors) {
      if (isWinState(nextVehicles)) {
        return { solvable: true, minMoves: current.depth + 1 };
      }

      const key = vehiclesToGridString(nextVehicles);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ vehicles: nextVehicles, depth: current.depth + 1 });
      }
    }
  }

  return { solvable: false, minMoves: -1 };
}
