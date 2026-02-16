/** Orientation of a vehicle on the board. */
export type Orientation = 'horizontal' | 'vertical';

/** Zero-indexed grid position. Row 0 is the top row. */
export interface Position {
  row: number;
  col: number;
}

/** A vehicle on the Rush Hour board. */
export interface Vehicle {
  /** Single character ID from the grid string (e.g., 'A', 'X', 'O'). */
  id: string;
  /** Top-left position of the vehicle. */
  position: Position;
  /** Number of cells the vehicle occupies. */
  size: 2 | 3;
  /** Direction the vehicle extends from its position. */
  orientation: Orientation;
}

/** A single recorded move in the game history. */
export interface MoveEntry {
  vehicleId: string;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

/** Complete state of a game in progress. */
export interface GameState {
  vehicles: Vehicle[];
  moveCount: number;
  moveHistory: MoveEntry[];
  /** Timestamp (ms) when the first move was made, or null if not started. */
  startTime: number | null;
  /** Timestamp (ms) when the puzzle was solved, or null if not yet won. */
  endTime: number | null;
  isWon: boolean;
}

/** Result of attempting a move. */
export interface MoveResult {
  success: boolean;
  state: GameState;
  /** Reason the move failed, if success is false. */
  reason?: string;
}

/** Difficulty levels for puzzles. */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Definition of a Rush Hour puzzle. */
export interface PuzzleDefinition {
  id: string;
  gridString: string;
  difficulty: Difficulty;
  minMoves: number;
  name?: string;
}
