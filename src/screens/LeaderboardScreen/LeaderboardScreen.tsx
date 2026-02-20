import { useNavigate } from 'react-router';
import styles from './LeaderboardScreen.module.css';

export function LeaderboardScreen() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <button
        className={styles.backButton}
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        ← Back
      </button>
      <div className={styles.content}>
        <h1 className={styles.title}>Leaderboard</h1>
        <p className={styles.comingSoon}>Coming in Phase 4</p>
      </div>
    </div>
  );
}
