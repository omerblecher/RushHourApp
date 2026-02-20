import type { Difficulty } from '../../engine/types';
import { PUZZLES_BY_DIFFICULTY } from '../../data/puzzleIndex';
import { PuzzleTile } from './PuzzleTile';
import styles from './PuzzleGrid.module.css';

interface PuzzleGridProps {
  difficulty: Difficulty;
}

export function PuzzleGrid({ difficulty }: PuzzleGridProps) {
  const puzzles = PUZZLES_BY_DIFFICULTY[difficulty] ?? [];

  return (
    <div className={styles.grid}>
      {puzzles.map((puzzle) => (
        <PuzzleTile key={puzzle.id} puzzle={puzzle} />
      ))}
    </div>
  );
}
