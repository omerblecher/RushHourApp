import type { Vehicle, GameState, MoveResult, MoveEntry } from './types.js';
import { parseGridString, buildOccupancyGrid, vehicleCells } from './board.js';

const GRID_SIZE = 6;
const WIN_ROW = 2;
const WIN_COL = 4;

/**
 * Core game engine for Rush Hour.
 *
 * Manages all game state: move validation with collision detection,
 * win detection, move counting, timer tracking, undo, and reset.
 */
export class GameEngine {
  private vehicles: Vehicle[];
  private moveCount: number;
  private moveHistory: MoveEntry[];
  private startTime: number | null;
  private endTime: number | null;
  private isWon: boolean;
  private readonly initialGridString: string;

  constructor(gridString: string) {
    this.initialGridString = gridString;
    this.vehicles = parseGridString(gridString);
    this.moveCount = 0;
    this.moveHistory = [];
    this.startTime = null;
    this.endTime = null;
    this.isWon = false;
  }

  /**
   * Returns an immutable snapshot of the current game state.
   * Modifying the returned object does not affect engine internals.
   */
  getState(): GameState {
    return {
      vehicles: this.vehicles.map((v) => ({
        ...v,
        position: { ...v.position },
      })),
      moveCount: this.moveCount,
      moveHistory: this.moveHistory.map((m) => ({ ...m })),
      startTime: this.startTime,
      endTime: this.endTime,
      isWon: this.isWon,
    };
  }

  /**
   * Attempt to move a vehicle to a new position.
   *
   * Validates axis constraints, bounds, and path clearance.
   * On success: updates position, records move, increments counter,
   * sets timer, checks win condition.
   */
  move(vehicleId: string, newRow: number, newCol: number): MoveResult {
    // 1. Check game not already won
    if (this.isWon) {
      return { success: false, state: this.getState(), reason: 'Game already won' };
    }

    // 2. Find vehicle by id
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, state: this.getState(), reason: `Vehicle "${vehicleId}" not found` };
    }

    // 3. Validate axis constraint
    if (vehicle.orientation === 'horizontal' && newRow !== vehicle.position.row) {
      return {
        success: false,
        state: this.getState(),
        reason: 'Horizontal vehicle cannot change row',
      };
    }
    if (vehicle.orientation === 'vertical' && newCol !== vehicle.position.col) {
      return {
        success: false,
        state: this.getState(),
        reason: 'Vertical vehicle cannot change column',
      };
    }

    // 4. Validate bounds
    if (vehicle.orientation === 'horizontal') {
      if (newCol < 0 || newCol + vehicle.size > GRID_SIZE) {
        return { success: false, state: this.getState(), reason: 'Move out of bounds' };
      }
    } else {
      if (newRow < 0 || newRow + vehicle.size > GRID_SIZE) {
        return { success: false, state: this.getState(), reason: 'Move out of bounds' };
      }
    }

    // 5. Build occupancy grid and validate path is clear
    const grid = buildOccupancyGrid(this.vehicles);

    // Check all intermediate AND destination cells
    if (vehicle.orientation === 'horizontal') {
      const row = vehicle.position.row;
      const fromCol = vehicle.position.col;
      const toCol = newCol;

      if (toCol < fromCol) {
        // Moving left: check cells from toCol to fromCol-1
        for (let c = toCol; c < fromCol; c++) {
          if (grid[row][c] !== null && grid[row][c] !== vehicleId) {
            return {
              success: false,
              state: this.getState(),
              reason: `Path blocked by vehicle "${grid[row][c]}"`,
            };
          }
        }
      } else {
        // Moving right: check cells from fromCol+size to toCol+size-1
        for (let c = fromCol + vehicle.size; c < toCol + vehicle.size; c++) {
          if (grid[row][c] !== null && grid[row][c] !== vehicleId) {
            return {
              success: false,
              state: this.getState(),
              reason: `Path blocked by vehicle "${grid[row][c]}"`,
            };
          }
        }
      }
    } else {
      const col = vehicle.position.col;
      const fromRow = vehicle.position.row;
      const toRow = newRow;

      if (toRow < fromRow) {
        // Moving up: check cells from toRow to fromRow-1
        for (let r = toRow; r < fromRow; r++) {
          if (grid[r][col] !== null && grid[r][col] !== vehicleId) {
            return {
              success: false,
              state: this.getState(),
              reason: `Path blocked by vehicle "${grid[r][col]}"`,
            };
          }
        }
      } else {
        // Moving down: check cells from fromRow+size to toRow+size-1
        for (let r = fromRow + vehicle.size; r < toRow + vehicle.size; r++) {
          if (grid[r][col] !== null && grid[r][col] !== vehicleId) {
            return {
              success: false,
              state: this.getState(),
              reason: `Path blocked by vehicle "${grid[r][col]}"`,
            };
          }
        }
      }
    }

    // 6. Valid move: update state
    const moveEntry: MoveEntry = {
      vehicleId,
      fromRow: vehicle.position.row,
      fromCol: vehicle.position.col,
      toRow: newRow,
      toCol: newCol,
    };

    vehicle.position.row = newRow;
    vehicle.position.col = newCol;

    this.moveHistory.push(moveEntry);
    this.moveCount++;

    // Set startTime on first move
    if (this.startTime === null) {
      this.startTime = Date.now();
    }

    // Check win condition: vehicle X at col 4, row 2 (occupying cols 4-5)
    this.checkWin();

    return { success: true, state: this.getState() };
  }

  /**
   * Undo the last move. Restores vehicle position but increments move counter.
   */
  undo(): MoveResult {
    if (this.moveHistory.length === 0) {
      return { success: false, state: this.getState(), reason: 'No moves to undo' };
    }

    const lastMove = this.moveHistory.pop()!;
    const vehicle = this.vehicles.find((v) => v.id === lastMove.vehicleId)!;

    vehicle.position.row = lastMove.fromRow;
    vehicle.position.col = lastMove.fromCol;

    // Undo increments moveCount per user decision
    this.moveCount++;

    // Re-check win (in case undo reverses a win)
    if (this.isWon) {
      this.isWon = false;
      this.endTime = null;
    }

    return { success: true, state: this.getState() };
  }

  /**
   * Reset the puzzle to its initial state.
   */
  reset(): GameState {
    this.vehicles = parseGridString(this.initialGridString);
    this.moveCount = 0;
    this.moveHistory = [];
    this.startTime = null;
    this.endTime = null;
    this.isWon = false;
    return this.getState();
  }

  private checkWin(): void {
    const xVehicle = this.vehicles.find((v) => v.id === 'X');
    if (!xVehicle) return;

    if (
      xVehicle.position.row === WIN_ROW &&
      xVehicle.position.col === WIN_COL &&
      xVehicle.orientation === 'horizontal'
    ) {
      this.isWon = true;
      this.endTime = Date.now();
    }
  }
}
