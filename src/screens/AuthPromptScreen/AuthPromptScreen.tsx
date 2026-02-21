import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import styles from './AuthPromptScreen.module.css';

export function AuthPromptScreen() {
  const { signInWithGoogle, signInAsGuest } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('popup-blocked')
          ? 'Popup was blocked. Please allow popups for this site and try again.'
          : 'Sign-in failed. Please try again.';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInAsGuest();
    } catch {
      setError('Could not start a guest session. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Rush Hour</h1>
          <p className={styles.subtitle}>Sliding puzzle challenge</p>
        </div>

        <div className={styles.buttons}>
          <button
            className={styles.googleButton}
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            <span className={styles.googleIcon}>G</span>
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <button
            className={styles.guestButton}
            onClick={handleGuestSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Starting...' : 'Play anonymously'}
          </button>

          <p className={styles.guestNote}>
            Anonymous scores won&apos;t appear on leaderboards
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
