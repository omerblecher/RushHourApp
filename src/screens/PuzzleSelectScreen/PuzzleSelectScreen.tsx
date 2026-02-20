import { useSearchParams, useNavigate } from 'react-router';
import type { Difficulty } from '../../engine/types';
import { DifficultyTabs } from './DifficultyTabs';
import { PuzzleGrid } from './PuzzleGrid';
import styles from './PuzzleSelectScreen.module.css';

const VALID_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

function isValidDifficulty(value: string | null): value is Difficulty {
  return VALID_DIFFICULTIES.includes(value as Difficulty);
}

export function PuzzleSelectScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawDifficulty = searchParams.get('difficulty');
  const difficulty: Difficulty = isValidDifficulty(rawDifficulty) ? rawDifficulty : 'beginner';

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setSearchParams({ difficulty: newDifficulty }, { replace: true });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
          aria-label="Back to main menu"
        >
          ← Home
        </button>
        <h1 className={styles.title}>Select Puzzle</h1>
      </header>

      <DifficultyTabs
        activeDifficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
      />

      <PuzzleGrid difficulty={difficulty} />
    </div>
  );
}
