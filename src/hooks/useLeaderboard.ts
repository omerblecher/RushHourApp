import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface LeaderboardEntry {
  uid: string;
  rank: number; // 1-based rank within top 50; -1 for pinned user entry outside top 50
  displayName: string;
  moves: number;
  timeMs: number;
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  isLoading: boolean;
}

/**
 * Fetches the top-50 leaderboard entries for a given puzzle, sorted by
 * moves ascending then timeMs ascending. If the current (non-anonymous)
 * user is outside the top 50, their personal best is fetched separately
 * and returned as `userEntry` with rank === -1.
 */
export function useLeaderboard(puzzleId: string): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setEntries([]);
    setUserEntry(null);

    const fetchLeaderboard = async () => {
      try {
        // Fetch top-50 scores sorted by moves asc, then timeMs asc
        const scoresQuery = query(
          collection(db, 'puzzles', puzzleId, 'scores'),
          orderBy('moves', 'asc'),
          orderBy('timeMs', 'asc'),
          limit(50)
        );

        const snapshot = await getDocs(scoresQuery);

        if (cancelled) return;

        const topEntries: LeaderboardEntry[] = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            rank: index + 1,
            displayName: data.displayName ?? 'Unknown',
            moves: data.moves ?? 0,
            timeMs: data.timeMs ?? 0,
          };
        });

        setEntries(topEntries);

        // Check if current user is in the top 50
        const currentUser = auth.currentUser;

        if (!currentUser || currentUser.isAnonymous) {
          // Anonymous users don't participate in the leaderboard
          setUserEntry(null);
        } else {
          const uid = currentUser.uid;
          const isInTop50 = topEntries.some((e) => e.uid === uid);

          if (!isInTop50) {
            // Fetch the user's own score doc (may not exist if they haven't solved this puzzle)
            const userDocRef = doc(db, 'puzzles', puzzleId, 'scores', uid);
            const userDocSnap = await getDoc(userDocRef);

            if (cancelled) return;

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              setUserEntry({
                uid,
                rank: -1, // outside top 50
                displayName: data.displayName ?? 'Unknown',
                moves: data.moves ?? 0,
                timeMs: data.timeMs ?? 0,
              });
            } else {
              setUserEntry(null);
            }
          } else {
            setUserEntry(null); // already visible in the top-50 list
          }
        }
      } catch {
        // Fail silently — index may not be deployed yet or network error
        if (!cancelled) {
          setEntries([]);
          setUserEntry(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [puzzleId]);

  return { entries, userEntry, isLoading };
}
