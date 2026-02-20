/**
 * Puzzle index: aggregates all puzzle JSON files and provides lookup utilities.
 *
 * Exports:
 * - ALL_PUZZLES: flat array of all 80+ puzzles across all difficulties
 * - PUZZLES_BY_DIFFICULTY: puzzles grouped by difficulty level
 * - getPuzzleById: lookup a puzzle by its ID
 * - getNextPuzzle: get the next puzzle in the same difficulty (for "Next Puzzle" button)
 */

import type { PuzzleDefinition, Difficulty } from '../engine/types';
import beginnerRaw from './puzzles/beginner.json';
import intermediateRaw from './puzzles/intermediate.json';
import advancedRaw from './puzzles/advanced.json';
import expertRaw from './puzzles/expert.json';

// Type-cast the raw JSON imports to PuzzleDefinition[]
const beginner = beginnerRaw as PuzzleDefinition[];
const intermediate = intermediateRaw as PuzzleDefinition[];
const advanced = advancedRaw as PuzzleDefinition[];
const expert = expertRaw as PuzzleDefinition[];

/** All puzzles ordered: beginner -> intermediate -> advanced -> expert. */
export const ALL_PUZZLES: PuzzleDefinition[] = [
  ...beginner,
  ...intermediate,
  ...advanced,
  ...expert,
];

/** Puzzles grouped by difficulty level. */
export const PUZZLES_BY_DIFFICULTY: Record<Difficulty, PuzzleDefinition[]> = {
  beginner,
  intermediate,
  advanced,
  expert,
};

/** Lookup a puzzle by its ID. Returns undefined if not found. */
export function getPuzzleById(id: string): PuzzleDefinition | undefined {
  return ALL_PUZZLES.find((p) => p.id === id);
}

/**
 * Get the next puzzle in the same difficulty group.
 * If currentId is the last puzzle in its difficulty, returns undefined.
 */
export function getNextPuzzle(currentId: string): PuzzleDefinition | undefined {
  const current = getPuzzleById(currentId);
  if (!current) return undefined;

  const group = PUZZLES_BY_DIFFICULTY[current.difficulty];
  const currentIndex = group.findIndex((p) => p.id === currentId);
  if (currentIndex < 0 || currentIndex >= group.length - 1) return undefined;

  return group[currentIndex + 1];
}
