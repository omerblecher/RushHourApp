import type { Difficulty } from '../../engine/types';
import styles from './DifficultyTabs.module.css';

interface DifficultyTabsProps {
  activeDifficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const TABS: { label: string; value: Difficulty }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

export function DifficultyTabs({ activeDifficulty, onDifficultyChange }: DifficultyTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Difficulty">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={activeDifficulty === tab.value}
          className={`${styles.tab} ${activeDifficulty === tab.value ? styles.active : ''}`}
          onClick={() => onDifficultyChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
