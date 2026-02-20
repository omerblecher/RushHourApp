import { useNavigate } from 'react-router';
import styles from './MainMenuScreen.module.css';

export function MainMenuScreen() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Rush Hour</h1>
        <p className={styles.subtitle}>Slide the cars. Free the red one.</p>
        <button
          className={styles.playButton}
          onClick={() => navigate('/puzzles')}
        >
          Play
        </button>
      </div>
    </div>
  );
}
