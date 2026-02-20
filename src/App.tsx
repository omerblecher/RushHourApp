import { Routes, Route } from 'react-router';
import { MainMenuScreen } from './screens/MainMenuScreen/MainMenuScreen';
import { PuzzleSelectScreen } from './screens/PuzzleSelectScreen/PuzzleSelectScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen/LeaderboardScreen';
import styles from './App.module.css';

function App() {
  return (
    <div className={styles.app}>
      <Routes>
        <Route path="/" element={<MainMenuScreen />} />
        <Route path="/puzzles" element={<PuzzleSelectScreen />} />
        <Route path="/play/:difficulty/:puzzleId" element={<GameScreen />} />
        <Route path="/leaderboard/:difficulty/:puzzleId" element={<LeaderboardScreen />} />
      </Routes>
    </div>
  );
}

export default App;
