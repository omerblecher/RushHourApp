import { useNavigate } from 'react-router';
import type { PuzzleDefinition } from '../../engine/types';
import { useProgressStore } from '../../store/progressStore';
import styles from './PuzzleTile.module.css';

interface PuzzleTileProps {
  puzzle: PuzzleDefinition;
}

/** Extract the puzzle number from an ID like "beginner-03" → 3 */
function extractPuzzleNumber(id: string): number {
  const match = id.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function PuzzleTile({ puzzle }: PuzzleTileProps) {
  const navigate = useNavigate();
  const isCompleted = useProgressStore((s) => s.isCompleted(puzzle.id));

  const puzzleNumber = extractPuzzleNumber(puzzle.id);

  const handleClick = () => {
    navigate(`/play/${puzzle.difficulty}/${puzzle.id}`);
  };

  return (
    <button
      className={`${styles.tile} ${isCompleted ? styles.completed : ''}`}
      onClick={handleClick}
      aria-label={`Puzzle ${puzzleNumber}${isCompleted ? ' (completed)' : ''}`}
    >
      <span className={styles.number}>{puzzleNumber}</span>
      {isCompleted && (
        <span className={styles.checkmark} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
