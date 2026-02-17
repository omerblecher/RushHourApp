import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { Board } from './components/Board/Board';
import styles from './App.module.css';

// Test puzzle for Phase 2 development (36 chars, X on row 2 = exit row)
// Row 0: . . A A . .
// Row 1: . . . . . B
// Row 2: X X . . . B   <- X at (2,0)-(2,1), path open to exit
// Row 3: . . . . C C
// Row 4: . D D . . .
// Row 5: . . . . . .
const DEV_PUZZLE = '..AA.......BXX...B....CC.DD.........';

function App() {
  const loadPuzzle = useGameStore((s) => s.loadPuzzle);

  useEffect(() => {
    loadPuzzle(DEV_PUZZLE);
  }, [loadPuzzle]);

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Rush Hour</h1>
      <Board />
    </div>
  );
}

export default App;
