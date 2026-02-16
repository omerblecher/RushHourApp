// Barrel export for the game engine module.
export type {
  Orientation,
  Position,
  Vehicle,
  MoveEntry,
  GameState,
  MoveResult,
  Difficulty,
  PuzzleDefinition,
} from './types.js';

export { parseGridString, buildOccupancyGrid, vehicleCells } from './board.js';

export { GameEngine } from './engine.js';

export { solvePuzzle } from './solver.js';
