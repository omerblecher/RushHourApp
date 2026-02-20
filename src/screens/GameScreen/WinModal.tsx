import { useNavigate } from 'react-router';
import { getNextPuzzle } from '../../data/puzzleIndex';
import styles from './WinModal.module.css';

interface WinModalProps {
  puzzleId: string;
  difficulty: string;
  moveCount: number;
  minMoves: number;
  timeMs: number;
  onClose: () => void;
}

/** Formats milliseconds as M:SS */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function WinModal({ puzzleId, difficulty, moveCount, minMoves, timeMs, onClose }: WinModalProps) {
  const navigate = useNavigate();
  const nextPuzzle = getNextPuzzle(puzzleId);
  const isOptimal = moveCount === minMoves;

  const handleNextPuzzle = () => {
    if (nextPuzzle) {
      navigate(`/play/${nextPuzzle.difficulty}/${nextPuzzle.id}`);
    } else {
      navigate(`/puzzles?difficulty=${difficulty}`);
    }
    onClose();
  };

  const handleBackToSelection = () => {
    navigate(`/puzzles?difficulty=${difficulty}`);
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Puzzle complete">
      <div className={styles.card}>
        <h2 className={styles.heading}>Puzzle Complete!</h2>

        {isOptimal && (
          <div className={styles.optimalBadge} aria-label="Optimal solution">
            Optimal!
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Your Moves</span>
            <span className={styles.statValue}>{moveCount}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Minimum Moves</span>
            <span className={styles.statValue}>{minMoves}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Your Time</span>
            <span className={styles.statValue}>{formatTime(timeMs)}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleNextPuzzle}>
            {nextPuzzle ? 'Next Puzzle' : 'More Puzzles'}
          </button>
          <button className={styles.secondaryButton} onClick={handleBackToSelection}>
            Back to Selection
          </button>
        </div>
      </div>
    </div>
  );
}
