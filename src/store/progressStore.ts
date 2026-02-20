/**
 * Progress store: tracks player completion data for all puzzles.
 *
 * Uses Zustand with persist middleware to store data in localStorage
 * under the key "rushhour_progress".
 *
 * Records best completion (fewest moves, then fastest time) per puzzle.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Completion record for a single puzzle. */
export interface PuzzleProgress {
  /** Timestamp (ms since epoch) of the most recent completion. */
  completedAt: number;
  /** Best (fewest) moves used to complete this puzzle. */
  bestMoves: number;
  /** Best (fastest) time in milliseconds for the best-moves run. */
  bestTimeMs: number;
}

interface ProgressStore {
  /** Map of puzzleId -> best completion record. */
  progress: Record<string, PuzzleProgress>;

  /**
   * Record a puzzle completion.
   * - If no previous record: store this attempt.
   * - If previous record exists: update only if new attempt is better
   *   (fewer moves, or same moves but faster time).
   * - Always updates completedAt to the current timestamp.
   */
  recordCompletion: (puzzleId: string, moves: number, timeMs: number) => void;

  /** Returns true if the puzzle has been completed at least once. */
  isCompleted: (puzzleId: string) => boolean;

  /** Returns the best completion record for the puzzle, or undefined. */
  getBest: (puzzleId: string) => PuzzleProgress | undefined;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      recordCompletion: (puzzleId: string, moves: number, timeMs: number) => {
        const now = Date.now();
        set((state) => {
          const existing = state.progress[puzzleId];

          let updatedRecord: PuzzleProgress;

          if (!existing) {
            // First completion
            updatedRecord = {
              completedAt: now,
              bestMoves: moves,
              bestTimeMs: timeMs,
            };
          } else {
            // Compare against existing best
            const isBetter =
              moves < existing.bestMoves ||
              (moves === existing.bestMoves && timeMs < existing.bestTimeMs);

            updatedRecord = {
              completedAt: now,
              bestMoves: isBetter ? moves : existing.bestMoves,
              bestTimeMs: isBetter ? timeMs : existing.bestTimeMs,
            };
          }

          return {
            progress: {
              ...state.progress,
              [puzzleId]: updatedRecord,
            },
          };
        });
      },

      isCompleted: (puzzleId: string) => {
        return puzzleId in get().progress;
      },

      getBest: (puzzleId: string) => {
        return get().progress[puzzleId];
      },
    }),
    {
      name: 'rushhour_progress',
    }
  )
);
