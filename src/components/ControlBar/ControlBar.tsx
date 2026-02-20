import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGameStore } from '../../store/gameStore';
import styles from './ControlBar.module.css';

const MUTE_KEY = 'rushhour_muted';

export function ControlBar() {
  const navigate = useNavigate();
  const undo = useGameStore((s) => s.undo);
  const reset = useGameStore((s) => s.reset);
  const moveCount = useGameStore((s) => s.state?.moveCount ?? 0);
  const historyLength = useGameStore((s) => s.state?.moveHistory.length ?? 0);

  const [isMuted, setIsMuted] = useState<boolean>(
    () => localStorage.getItem(MUTE_KEY) === 'true'
  );

  const canUndo = historyLength > 0;
  const canReset = moveCount > 0;

  const handleMenu = () => {
    navigate(-1);
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(MUTE_KEY, String(next));
  };

  return (
    <div className={styles.controlBar} role="toolbar" aria-label="Game controls">
      <button
        className={styles.button}
        onClick={() => undo()}
        disabled={!canUndo}
        title="Undo last move"
        aria-label="Undo last move"
      >
        <span className={styles.icon} aria-hidden="true">↩</span>
        <span className={styles.label}>Undo</span>
      </button>

      <button
        className={styles.button}
        onClick={() => reset()}
        disabled={!canReset}
        title="Reset puzzle"
        aria-label="Reset puzzle to initial state"
      >
        <span className={styles.icon} aria-hidden="true">↺</span>
        <span className={styles.label}>Reset</span>
      </button>

      <button
        className={styles.button}
        onClick={handleMenu}
        title="Back to menu"
        aria-label="Back to menu"
      >
        <span className={styles.icon} aria-hidden="true">☰</span>
        <span className={styles.label}>Menu</span>
      </button>

      <button
        className={styles.button}
        onClick={handleMute}
        title={isMuted ? 'Unmute sound' : 'Mute sound'}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={isMuted}
      >
        <span className={styles.icon} aria-hidden="true">{isMuted ? '🔇' : '🔊'}</span>
        <span className={styles.label}>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>
    </div>
  );
}
