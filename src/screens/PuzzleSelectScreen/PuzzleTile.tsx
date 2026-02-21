import { useNavigate } from 'react-router';
import type { PuzzleDefinition } from '../../engine/types';
import { useProgressStore } from '../../store/progressStore';
import styles from './PuzzleTile.module.css';

interface PuzzleTileProps {
  puzzle: PuzzleDefinition;
  onLeaderboard: (puzzleId: string) => void;
}

/** Extract the puzzle number from an ID like "beginner-03" -> 3 */
function extractPuzzleNumber(id: string): number {
  const match = id.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function PuzzleTile({ puzzle, onLeaderboard }: PuzzleTileProps) {
  const navigate = useNavigate();
  const isCompleted = useProgressStore((s) => s.isCompleted(puzzle.id));

  const puzzleNumber = extractPuzzleNumber(puzzle.id);

  const handleClick = () => {
    navigate(`/play/${puzzle.difficulty}/${puzzle.id}`);
  };

  const handleLeaderboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLeaderboard(puzzle.id);
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
      <span
        className={styles.leaderboardBtn}
        role="button"
        tabIndex={0}
        aria-label={`View leaderboard for puzzle ${puzzleNumber}`}
        onClick={handleLeaderboard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLeaderboard(e as unknown as React.MouseEvent);
          }
        }}
      >
        🏆
      </span>
    </button>
  );
}
