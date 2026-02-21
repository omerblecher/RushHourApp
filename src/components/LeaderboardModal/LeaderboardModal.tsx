import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { formatTime } from '../../utils/formatTime';
import styles from './LeaderboardModal.module.css';

interface LeaderboardModalProps {
  puzzleId: string;
  onClose: () => void;
  onSignInToCompete?: () => void; // kept for backward compatibility; internal upgrade flow is used if not provided
}

export function LeaderboardModal({ puzzleId, onClose, onSignInToCompete }: LeaderboardModalProps) {
  const user = useAuthStore((s) => s.user);
  const upgradeStatus = useAuthStore((s) => s.upgradeStatus);
  const upgradeAnonymousToGoogle = useAuthStore((s) => s.upgradeAnonymousToGoogle);
  const { entries, userEntry, isLoading } = useLeaderboard(puzzleId);

  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const isAnonymous = user?.isAnonymous === true;
  const isUpgrading = upgradeStatus === 'upgrading';

  const handleSignInToCompete = async () => {
    if (onSignInToCompete) {
      onSignInToCompete();
      return;
    }
    setUpgradeError(null);
    const result = await upgradeAnonymousToGoogle();
    if (result === 'error') {
      setUpgradeError('Sign in failed. Please try again.');
    } else if (result === 'cancelled') {
      // User dismissed the popup — no error shown
    }
    // 'linked' or 'merged': onAuthStateChanged updates store, modal re-renders
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Leaderboard"
      onClick={handleBackdropClick}
    >
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.heading}>Leaderboard</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            ×
          </button>
        </div>

        {/* Anonymous gate — shown above the table if user is signed in anonymously */}
        {isAnonymous && (
          <div className={styles.anonGate}>
            <p className={styles.anonMessage}>
              Sign in to compete on the global leaderboard
            </p>
            <button
              className={styles.signInButton}
              onClick={handleSignInToCompete}
              disabled={isUpgrading}
            >
              {isUpgrading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            {upgradeError && (
              <p className={styles.upgradeError}>{upgradeError}</p>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className={styles.skeletonList} aria-label="Loading leaderboard">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCell} style={{ width: '2rem' }} />
                <div className={styles.skeletonCell} style={{ flex: 1 }} />
                <div className={styles.skeletonCell} style={{ width: '3.5rem' }} />
                <div className={styles.skeletonCell} style={{ width: '3.5rem' }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className={styles.emptyMessage}>No scores yet — be the first!</p>
        ) : (
          <>
            {/* Leaderboard table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thRank}>#</th>
                    <th className={styles.thName}>Name</th>
                    <th className={styles.thMoves}>Moves</th>
                    <th className={styles.thTime}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.uid}
                      className={`${styles.row} ${
                        entry.uid === user?.uid ? styles.userRow : ''
                      }`}
                    >
                      <td className={styles.tdRank}>{entry.rank}</td>
                      <td className={styles.tdName}>{entry.displayName}</td>
                      <td className={styles.tdMoves}>{entry.moves}</td>
                      <td className={styles.tdTime}>{formatTime(entry.timeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pinned "Your best" row — shown when user is outside top 50 */}
              {userEntry && (
                <>
                  <div className={styles.separator} aria-hidden="true">
                    &hellip;
                  </div>
                  <table className={styles.table}>
                    <tbody>
                      <tr className={`${styles.row} ${styles.pinnedRow}`}>
                        <td className={styles.tdRank}>—</td>
                        <td className={styles.tdName}>
                          <span className={styles.yourBestLabel}>Your best</span>
                          {userEntry.displayName}
                        </td>
                        <td className={styles.tdMoves}>{userEntry.moves}</td>
                        <td className={styles.tdTime}>{formatTime(userEntry.timeMs)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </>
        )}

        {/* Footer close button */}
        <button className={styles.footerCloseButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
