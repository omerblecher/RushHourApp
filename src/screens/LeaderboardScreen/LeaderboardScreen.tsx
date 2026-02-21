import { useNavigate, useParams } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { formatTime } from '../../utils/formatTime';
import styles from './LeaderboardScreen.module.css';

/** Extract puzzle number from an ID like "beginner-03" -> 3 */
function extractPuzzleNumber(id: string): number {
  const match = id.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const { puzzleId } = useParams<{ puzzleId: string; difficulty: string }>();

  const user = useAuthStore((s) => s.user);
  const { entries, userEntry, isLoading } = useLeaderboard(puzzleId ?? '');

  const puzzleNumber = puzzleId ? extractPuzzleNumber(puzzleId) : 0;
  const puzzleTitle = puzzleNumber > 0 ? `Puzzle ${puzzleNumber} Leaderboard` : 'Leaderboard';

  if (!puzzleId) {
    return (
      <div className={styles.container}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          Back
        </button>
        <div className={styles.content}>
          <p className={styles.errorMessage}>No puzzle selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.backButton}
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        Back
      </button>

      <div className={styles.content}>
        <h1 className={styles.title}>{puzzleTitle}</h1>

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
                <div className={styles.separator} aria-hidden="true">&hellip;</div>
                <table className={styles.table}>
                  <tbody>
                    <tr className={`${styles.row} ${styles.pinnedRow}`}>
                      <td className={styles.tdRank}>—</td>
                      <td className={styles.tdName}>
                        <span className={styles.yourBestLabel}>Your best </span>
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
        )}

        {/* Anonymous user note */}
        {user?.isAnonymous && (
          <p className={styles.anonNote}>Sign in with Google to compete on the leaderboard.</p>
        )}
      </div>
    </div>
  );
}
