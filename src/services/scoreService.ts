/**
 * Score service: handles all Firestore write operations for leaderboard scores
 * and display name management.
 *
 * Key behaviors:
 * - submitScore() is silent — never throws, never surfaces errors to callers
 * - setDisplayName() uses writeBatch for atomic username uniqueness enforcement
 * - mergeAnonymousScores() is best-effort (errors swallowed)
 * - updateScoreDisplayNames() is best-effort (errors swallowed)
 */

import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ALL_PUZZLES } from '../data/puzzleIndex';

// ---- Types ----

export interface ScoreDoc {
  userId: string;
  displayName: string;
  moves: number;
  timeMs: number;
  minMoves: number;
  solvedAt: number;
}

// ---- Display name helpers ----

const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 20;

/**
 * Read the user's display name from Firestore users/{uid}.
 * Falls back to the Google auth token display name, then "Player".
 */
export async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.displayName && typeof data.displayName === 'string') {
        return data.displayName;
      }
    }
  } catch {
    // Fall through to auth fallback
  }

  // Fallback: Google display name from auth token
  const currentUser = auth.currentUser;
  if (currentUser?.displayName) {
    return currentUser.displayName;
  }

  return 'Player';
}

/**
 * Check if a display name is available (not taken by another user).
 */
export async function isDisplayNameAvailable(name: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', name.toLowerCase()));
  return !snap.exists();
}

/**
 * Set the user's display name. Uses a writeBatch to atomically update
 * both users/{uid}.displayName and usernames/{lowercase} -> {uid}.
 *
 * Returns:
 * - 'ok'      — success
 * - 'taken'   — another user already has this name
 * - 'invalid' — name is empty, too short, too long, or user is not signed in
 *
 * Also triggers a best-effort background update of the user's existing
 * score documents to keep the denormalized displayName consistent.
 */
export async function setDisplayName(newName: string): Promise<'ok' | 'taken' | 'invalid'> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 'invalid';

  const trimmed = newName.trim();
  if (
    !trimmed ||
    trimmed.length < MIN_DISPLAY_NAME_LENGTH ||
    trimmed.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return 'invalid';
  }

  const lowercase = trimmed.toLowerCase();
  const usernameRef = doc(db, 'usernames', lowercase);
  const userRef = doc(db, 'users', uid);

  // Client-side availability check (race conditions handled server-side by getAfter rule)
  try {
    const existing = await getDoc(usernameRef);
    if (existing.exists() && existing.data()?.uid !== uid) {
      return 'taken';
    }
  } catch {
    return 'invalid';
  }

  const batch = writeBatch(db);
  batch.set(userRef, { displayName: trimmed }, { merge: true });
  batch.set(usernameRef, { uid });

  try {
    await batch.commit();
  } catch {
    // Likely security rule rejection (race condition or getAfter mismatch)
    return 'taken';
  }

  // Best-effort background update of existing score documents
  updateScoreDisplayNames(uid, trimmed).catch(() => {
    // Silently swallow — eventual consistency is acceptable
  });

  return 'ok';
}

// ---- Score submission ----

/**
 * Submit a puzzle score to Firestore. Silent — never throws.
 *
 * No-op if:
 * - User is not signed in
 * - User is anonymous (scores require a Google account)
 *
 * The security rule rejects non-improvements; this function writes
 * optimistically and swallows the rejection silently.
 */
export async function submitScore(
  puzzleId: string,
  moves: number,
  timeMs: number,
  minMoves: number,
): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;

  try {
    const displayName = await getUserDisplayName(user.uid);
    const scoreRef = doc(db, 'puzzles', puzzleId, 'scores', user.uid);

    const scoreDoc: ScoreDoc = {
      userId: user.uid,
      displayName,
      moves,
      timeMs,
      minMoves,
      solvedAt: Date.now(),
    };

    await setDoc(scoreRef, scoreDoc);
  } catch {
    // Silent failure per requirement (REQ score submission UX)
  }
}

// ---- Score display name propagation ----

/**
 * Update the displayName field in all of the user's existing score documents.
 * Called after a display name change. Best-effort — errors are swallowed.
 * Limits batch to 500 writes (Firestore maximum); with 100 puzzles this is safe.
 */
export async function updateScoreDisplayNames(uid: string, displayName: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const puzzle of ALL_PUZZLES) {
      if (writeCount >= 500) break;

      const scoreRef = doc(db, 'puzzles', puzzle.id, 'scores', uid);
      const snap = await getDoc(scoreRef);

      if (snap.exists()) {
        batch.update(scoreRef, { displayName });
        writeCount++;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }
  } catch {
    // Best-effort: silently swallow errors (eventual consistency is acceptable)
  }
}

// ---- Anonymous score merge ----

/**
 * Copy anonymous user's scores to a Google account where the Google account's
 * score is worse (or missing). Called during the credential-already-in-use
 * merge path after anonymous-to-Google upgrade.
 *
 * Best-effort — errors are silently swallowed.
 */
export async function mergeAnonymousScores(anonUid: string, googleUid: string): Promise<void> {
  try {
    const googleDisplayName = await getUserDisplayName(googleUid);

    for (const puzzle of ALL_PUZZLES) {
      try {
        const anonScoreRef = doc(db, 'puzzles', puzzle.id, 'scores', anonUid);
        const googleScoreRef = doc(db, 'puzzles', puzzle.id, 'scores', googleUid);

        const [anonSnap, googleSnap] = await Promise.all([
          getDoc(anonScoreRef),
          getDoc(googleScoreRef),
        ]);

        if (!anonSnap.exists()) continue;

        const anonScore = anonSnap.data() as ScoreDoc;

        const shouldMerge =
          !googleSnap.exists() ||
          (() => {
            const googleScore = googleSnap.data() as ScoreDoc;
            return (
              anonScore.moves < googleScore.moves ||
              (anonScore.moves === googleScore.moves && anonScore.timeMs < googleScore.timeMs)
            );
          })();

        if (shouldMerge) {
          const mergedScore: ScoreDoc = {
            ...anonScore,
            userId: googleUid,
            displayName: googleDisplayName,
          };
          await setDoc(googleScoreRef, mergedScore);
        }
      } catch {
        // Per-puzzle error: continue with remaining puzzles
      }
    }
  } catch {
    // Best-effort: silently swallow top-level errors
  }
}

// ---- Exports summary ----
// submitScore, mergeAnonymousScores, getUserDisplayName, setDisplayName,
// isDisplayNameAvailable, updateScoreDisplayNames
