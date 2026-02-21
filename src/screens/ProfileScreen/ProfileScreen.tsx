import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { getUserDisplayName, setDisplayName } from '../../services/scoreService';
import { formatTime } from '../../utils/formatTime';
import styles from './ProfileScreen.module.css';

export function ProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const upgradeAnonymousToGoogle = useAuthStore((s) => s.upgradeAnonymousToGoogle);
  const upgradeStatus = useAuthStore((s) => s.upgradeStatus);
  const progress = useProgressStore((s) => s.progress);

  const [displayName, setDisplayNameState] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'taken' | 'invalid'>('idle');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const isAnonymous = user?.isAnonymous === true;

  // Load display name on mount
  useEffect(() => {
    if (!user) return;
    getUserDisplayName(user.uid).then((name) => {
      setDisplayNameState(name);
      setNameInput(name);
    });
  }, [user]);

  // Compute personal stats from progressStore
  const solvedEntries = Object.values(progress);
  const puzzlesSolved = solvedEntries.length;
  const bestMoves =
    puzzlesSolved > 0
      ? Math.min(...solvedEntries.map((e) => e.bestMoves))
      : null;
  const bestTimeMs =
    puzzlesSolved > 0
      ? Math.min(...solvedEntries.map((e) => e.bestTimeMs))
      : null;

  const handleSave = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');

    const result = await setDisplayName(nameInput);

    if (result === 'ok') {
      setDisplayNameState(nameInput.trim());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else if (result === 'taken') {
      setSaveStatus('taken');
    } else {
      setSaveStatus('invalid');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    // onAuthStateChanged fires with null -> App.tsx shows AuthPromptScreen
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError(null);
    const result = await upgradeAnonymousToGoogle();
    setIsUpgrading(false);
    if (result === 'error') {
      setUpgradeError('Sign in failed. Please try again.');
    }
    // 'linked', 'merged', or 'cancelled' — store updates via onAuthStateChanged
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ← Back
          </button>
          <h1 className={styles.title}>Profile</h1>
        </div>

        {/* Anonymous notice */}
        {isAnonymous && (
          <div className={styles.anonNotice}>
            <p className={styles.anonText}>
              You are playing anonymously. Sign in to edit your profile and compete on leaderboards.
            </p>
            <button
              className={styles.googleButton}
              onClick={handleUpgrade}
              disabled={isUpgrading || upgradeStatus === 'upgrading'}
            >
              {isUpgrading || upgradeStatus === 'upgrading' ? 'Signing in...' : 'Sign in with Google'}
            </button>
            {upgradeError && <p className={styles.errorText}>{upgradeError}</p>}
          </div>
        )}

        {/* Display name section — only for authenticated (non-anon) users */}
        {!isAnonymous && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Display Name</h2>
            <div className={styles.nameForm}>
              <input
                className={styles.nameInput}
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (saveStatus !== 'idle') setSaveStatus('idle');
                }}
                maxLength={20}
                placeholder="Your display name"
                aria-label="Display name"
              />
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saveStatus === 'saving' || nameInput.trim() === displayName}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saveStatus === 'saved' && (
              <p className={styles.successText}>Saved!</p>
            )}
            {saveStatus === 'taken' && (
              <p className={styles.errorText}>Name already taken — try another.</p>
            )}
            {saveStatus === 'invalid' && (
              <p className={styles.errorText}>Name must be 2–20 characters.</p>
            )}
          </section>
        )}

        {/* Personal stats */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Stats</h2>
          {puzzlesSolved === 0 ? (
            <p className={styles.noStatsText}>No puzzles solved yet. Go play!</p>
          ) : (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{puzzlesSolved}</span>
                <span className={styles.statLabel}>Puzzles Solved</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {bestMoves !== null ? bestMoves : '—'}
                </span>
                <span className={styles.statLabel}>Best Overall (moves)</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {bestTimeMs !== null ? formatTime(bestTimeMs) : '—'}
                </span>
                <span className={styles.statLabel}>Fastest Time</span>
              </div>
            </div>
          )}
        </section>

        {/* Sign out */}
        <section className={styles.section}>
          <button className={styles.signOutButton} onClick={handleSignOut}>
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
