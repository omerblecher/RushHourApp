import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getNextPuzzle } from '../../data/puzzleIndex';
import { useAuthStore } from '../../store/authStore';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardModal } from '../../components/LeaderboardModal/LeaderboardModal';
import { formatTime } from '../../utils/formatTime';
import styles from './WinModal.module.css';

interface WinModalProps {
  puzzleId: string;
  difficulty: string;
  moveCount: number;
  minMoves: number;
  timeMs: number;
  isNewPersonalBest: boolean;
  onClose: () => void;
}

export function WinModal({
  puzzleId,
  difficulty,
  moveCount,
  minMoves,
  timeMs,
  isNewPersonalBest,
  onClose,
}: WinModalProps) {
  const navigate = useNavigate();
  const nextPuzzle = getNextPuzzle(puzzleId);
  const isOptimal = moveCount === minMoves;

  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { entries } = useLeaderboard(puzzleId);

  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Compute user's rank from leaderboard entries (1-based; 0 means not in top 50)
  const currentUid = user?.uid;
  const userRank =
    currentUid
      ? (() => {
          const idx = entries.findIndex((e) => e.uid === currentUid);
          return idx >= 0 ? idx + 1 : 0;
        })()
      : 0;

  const handleNextPuzzle = () => {
    if (nextPuzzle) {
      navigate(`/play/${nextPuzzle.difficulty}/${nextPuzzle.id}`);
    } else {
      navigate(`/puzzles?difficulty=${difficulty}`);
    }
    onClose();
  };

  const handleBackToSelection = () => {
    navigate(`/puzzles?difficulty=${difficulty}`);
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Puzzle complete">
      <div className={styles.card}>
        <h2 className={styles.heading}>Puzzle Complete!</h2>

        {/* Personal best banner */}
        {isNewPersonalBest && (
          <div className={styles.personalBestBanner} aria-label="New personal best">
            New personal best!
          </div>
        )}

        {isOptimal && (
          <div className={styles.optimalBadge} aria-label="Optimal solution">
            Optimal!
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Your Moves</span>
            <span className={styles.statValue}>{moveCount}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Minimum Moves</span>
            <span className={styles.statValue}>{minMoves}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Your Time</span>
            <span className={styles.statValue}>{formatTime(timeMs)}</span>
          </div>
        </div>

        {/* Rank display for authenticated non-anonymous users in top 50 */}
        {!user?.isAnonymous && userRank > 0 && (
          <div className={styles.rankDisplay} aria-label={`Ranked #${userRank} on this puzzle`}>
            #{userRank} on this puzzle!
          </div>
        )}

        {/* View leaderboard button */}
        <button
          className={styles.viewLeaderboardButton}
          onClick={() => setShowLeaderboard(true)}
        >
          View leaderboard
        </button>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleNextPuzzle}>
            {nextPuzzle ? 'Next Puzzle' : 'More Puzzles'}
          </button>
          <button className={styles.secondaryButton} onClick={handleBackToSelection}>
            Back to Selection
          </button>
        </div>
      </div>

      {/* LeaderboardModal stacks on top of WinModal */}
      {showLeaderboard && (
        <LeaderboardModal
          puzzleId={puzzleId}
          onClose={() => setShowLeaderboard(false)}
          onSignInToCompete={() => void signInWithGoogle()}
        />
      )}
    </div>
  );
}
