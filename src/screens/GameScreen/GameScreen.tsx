import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import { getPuzzleById } from '../../data/puzzleIndex';
import { submitScore } from '../../services/scoreService';
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
  const getBest = useProgressStore((s) => s.getBest);

  const [showWinModal, setShowWinModal] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);

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
    setIsNewPersonalBest(false);
  }, [puzzleId, loadPuzzle, navigate]);

  // Detect win
  useEffect(() => {
    if (state?.isWon && puzzleId && state.startTime && state.endTime) {
      const timeMs = state.endTime - state.startTime;
      const moves = state.moveCount;

      // Compute personal best BEFORE recordCompletion updates the store
      const prevBest = getBest(puzzleId);
      const newPB =
        !prevBest ||
        moves < prevBest.bestMoves ||
        (moves === prevBest.bestMoves && timeMs < prevBest.bestTimeMs);

      setIsNewPersonalBest(newPB);

      recordCompletion(puzzleId, moves, timeMs);

      // Submit score silently in the background (no await — fire-and-forget)
      void submitScore(puzzleId, moves, timeMs, minMoves);

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
          isNewPersonalBest={isNewPersonalBest}
          onClose={() => setShowWinModal(false)}
        />
      )}
    </div>
  );
}
