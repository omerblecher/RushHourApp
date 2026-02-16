import type { Vehicle, Position, Orientation } from './types.js';

const GRID_SIZE = 6;
const GRID_LENGTH = GRID_SIZE * GRID_SIZE; // 36
const EMPTY_CELL = '.';

/**
 * Returns the grid positions occupied by a vehicle.
 */
export function vehicleCells(vehicle: Vehicle): Position[] {
  const cells: Position[] = [];
  for (let i = 0; i < vehicle.size; i++) {
    if (vehicle.orientation === 'horizontal') {
      cells.push({ row: vehicle.position.row, col: vehicle.position.col + i });
    } else {
      cells.push({ row: vehicle.position.row + i, col: vehicle.position.col });
    }
  }
  return cells;
}

/**
 * Parses a 36-character grid string into an array of vehicles.
 *
 * The grid string represents a 6x6 board read left-to-right, top-to-bottom.
 * Each character is either a vehicle ID letter or '.' for empty cells.
 *
 * @throws Error if the grid string is not exactly 36 characters.
 */
export function parseGridString(gridString: string): Vehicle[] {
  if (gridString.length !== GRID_LENGTH) {
    throw new Error(
      `Invalid grid string: expected ${GRID_LENGTH} characters, got ${gridString.length}`
    );
  }

  // Collect positions for each unique vehicle ID
  const vehiclePositions = new Map<string, Position[]>();

  for (let i = 0; i < GRID_LENGTH; i++) {
    const char = gridString[i];
    if (char === EMPTY_CELL) continue;

    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;

    if (!vehiclePositions.has(char)) {
      vehiclePositions.set(char, []);
    }
    vehiclePositions.get(char)!.push({ row, col });
  }

  // Convert collected positions into Vehicle objects
  const vehicles: Vehicle[] = [];

  for (const [id, positions] of vehiclePositions) {
    const size = positions.length as 2 | 3;
    const orientation: Orientation =
      positions[0].row === positions[1].row ? 'horizontal' : 'vertical';

    // Top-left position is the first position (grid is read left-to-right, top-to-bottom)
    const position = positions[0];

    vehicles.push({ id, position, size, orientation });
  }

  return vehicles;
}

/**
 * Builds a 6x6 occupancy grid from an array of vehicles.
 *
 * Each cell contains the vehicle ID occupying it, or null if empty.
 */
export function buildOccupancyGrid(vehicles: Vehicle[]): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );

  for (const vehicle of vehicles) {
    for (const cell of vehicleCells(vehicle)) {
      grid[cell.row][cell.col] = vehicle.id;
    }
  }

  return grid;
}
