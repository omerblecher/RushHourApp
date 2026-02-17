import { create } from 'zustand';
import { GameEngine } from '../engine/engine';
import type { GameState, MoveResult } from '../engine/types';

interface GameStore {
  engine: GameEngine | null;
  state: GameState | null;
  minMoves: number;
  loadPuzzle: (grid: string, minMoves?: number) => void;
  move: (vehicleId: string, newRow: number, newCol: number) => MoveResult | null;
  undo: () => MoveResult | null;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,
  minMoves: 0,

  loadPuzzle: (grid: string, minMoves = 0) => {
    const engine = new GameEngine(grid);
    set({
      engine,
      state: engine.getState(),
      minMoves,
    });
  },

  move: (vehicleId: string, newRow: number, newCol: number) => {
    const { engine } = get();
    if (!engine) return null;
    const result = engine.move(vehicleId, newRow, newCol);
    set({ state: engine.getState() });
    return result;
  },

  undo: () => {
    const { engine } = get();
    if (!engine) return null;
    const result = engine.undo();
    set({ state: engine.getState() });
    return result;
  },

  reset: () => {
    const { engine } = get();
    if (!engine) return;
    engine.reset();
    set({ state: engine.getState() });
  },
}));
