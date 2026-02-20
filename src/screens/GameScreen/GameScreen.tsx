import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import { getPuzzleById } from '../../data/puzzleIndex';
import { Board } from '../../components/Board/Board';
import { GameHUD } from '../../components/GameHUD/GameHUD';
import { ControlBar } from '../../components/ControlBar/ControlBar';
import { WinModal } from './WinModal';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const { difficulty, puzzleId } = useParams<{ difficulty: string; puzzleId: string }>();
  const navigate = useNavigate();

  const loadPuzzle = useGameStore((s) => s.loadPuzzle);
  const state = useGameStore((s) => s.state);
  const minMoves = useGameStore((s) => s.minMoves);
  const recordCompletion = useProgressStore((s) => s.recordCompletion);

  const [showWinModal, setShowWinModal] = useState(false);

  // Load puzzle when puzzleId changes
  useEffect(() => {
    if (!puzzleId) {
      navigate('/puzzles', { replace: true });
      return;
    }

    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) {
      navigate('/puzzles', { replace: true });
      return;
    }

    loadPuzzle(puzzle.gridString, puzzle.minMoves);
    setShowWinModal(false);
  }, [puzzleId, loadPuzzle, navigate]);

  // Detect win
  useEffect(() => {
    if (state?.isWon && puzzleId && state.startTime && state.endTime) {
      const timeMs = state.endTime - state.startTime;
      recordCompletion(puzzleId, state.moveCount, timeMs);
      setShowWinModal(true);
    }
  }, [state?.isWon]);

  if (!state) {
    return (
      <div className={styles.loading}>
        <p>Loading puzzle...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <GameHUD />
      <Board />
      <ControlBar />
      {showWinModal && puzzleId && (
        <WinModal
          puzzleId={puzzleId}
          difficulty={difficulty ?? 'beginner'}
          moveCount={state.moveCount}
          minMoves={minMoves}
          timeMs={(state.endTime ?? Date.now()) - (state.startTime ?? Date.now())}
          onClose={() => setShowWinModal(false)}
        />
      )}
    </div>
  );
}
