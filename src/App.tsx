import { Routes, Route } from 'react-router';
import { useAuthStore } from './store/authStore';
import { AuthPromptScreen } from './screens/AuthPromptScreen/AuthPromptScreen';
import { MainMenuScreen } from './screens/MainMenuScreen/MainMenuScreen';
import { PuzzleSelectScreen } from './screens/PuzzleSelectScreen/PuzzleSelectScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen/ProfileScreen';
import styles from './App.module.css';

function App() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#1a0f00' }}>
        <p style={{ color: '#c8a96e', fontFamily: 'inherit', fontSize: '1rem' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPromptScreen />;
  }

  return (
    <div className={styles.app}>
      <Routes>
        <Route path="/" element={<MainMenuScreen />} />
        <Route path="/puzzles" element={<PuzzleSelectScreen />} />
        <Route path="/play/:difficulty/:puzzleId" element={<GameScreen />} />
        <Route path="/leaderboard/:difficulty/:puzzleId" element={<LeaderboardScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Routes>
    </div>
  );
}

export default App;
