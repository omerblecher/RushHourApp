import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './GameHUD.module.css';

/**
 * Formats elapsed milliseconds as M:SS (e.g., 2:05, 0:00).
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function GameHUD() {
  const moveCount = useGameStore((s) => s.state?.moveCount ?? 0);
  const minMoves = useGameStore((s) => s.minMoves);
  const startTime = useGameStore((s) => s.state?.startTime ?? null);
  const endTime = useGameStore((s) => s.state?.endTime ?? null);
  const isWon = useGameStore((s) => s.state?.isWon ?? false);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Reset elapsed when startTime becomes null (puzzle reset)
    if (startTime === null) {
      setElapsed(0);
      return;
    }

    // If already won, freeze elapsed at end time
    if (endTime !== null) {
      setElapsed(endTime - startTime);
      return;
    }

    // Active game: tick every second
    const update = () => setElapsed(Date.now() - startTime);
    update(); // immediate first update
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, isWon]);

  return (
    <div className={styles.hud} aria-label="Game status">
      <div className={styles.moves}>
        <span className={styles.label}>Moves</span>
        <span className={styles.value}>
          {moveCount}
          {minMoves > 0 && (
            <span className={styles.minMoves}> / {minMoves} min</span>
          )}
        </span>
      </div>
      <div className={styles.timer}>
        <span className={styles.label}>Time</span>
        <span className={styles.value}>{formatTime(elapsed)}</span>
      </div>
    </div>
  );
}
