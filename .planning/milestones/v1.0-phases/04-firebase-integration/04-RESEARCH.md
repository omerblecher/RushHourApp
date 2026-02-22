# Phase 4: Firebase Integration - Research

**Researched:** 2026-02-21
**Domain:** Firebase Auth (Google + Anonymous) + Firestore Leaderboards + Security Rules
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sign-in & identity flow**
- Sign-in prompt appears at **app launch**, before the user can play
- The prompt is **blocking** — user must choose: "Sign in with Google" or "Play anonymously"
- Anonymous users are prompted to link to Google **when they first try to view the leaderboard** (not after puzzles, not automatically)
- When an anonymous user links to Google, their **anonymous scores are preserved and merged** into the Google account

**Leaderboard presentation**
- From the win screen: leaderboard appears as a **modal/overlay** (no navigation away)
- From the puzzle selection screen: leaderboard is also accessible (modal or navigation — Claude decides)
- The signed-in user's row is **highlighted** (bold, accent color, or distinct background)
- If the user is **outside the top 50**, their personal best is **pinned at the bottom** of the leaderboard, visually separated (e.g., "... Your best: #83 — 14 moves, 1:32")
- Row columns: **Rank + Display Name + Moves + Time**

**Score submission UX**
- Scores are submitted **silently in the background** when a puzzle is solved — no explicit "Submit" button
- The **win screen shows** the user's current leaderboard rank (e.g., "#4 on this puzzle!") and a "View leaderboard" button
- **Anonymous users** — their scores are stored locally only and do not appear on the leaderboard; leaderboard participation requires a Google-linked account
- Score submission **failures are silent** — no error message shown to the user
- When a user **beats their personal best**, the win screen shows a "New personal best!" celebration callout

**Display names**
- Default display name is pulled from the user's **Google account name**
- Users can **edit their display name** in a dedicated profile/settings section
- Validation: **length limit** (max characters) AND **uniqueness** across all users — no two users can have the same name
- The **profile/settings section** contains: display name editing + sign out button + personal stats summary (scores/rankings across puzzles)

### Claude's Discretion
- Exact character limit for display names
- Visual design of the "Play anonymously" vs "Sign in with Google" launch prompt
- Loading/skeleton states while leaderboard data fetches
- Exact layout of personal stats summary in profile section
- How uniqueness conflicts are communicated when a user picks an already-taken name

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-038 | Google sign-in via Firebase Auth popup | `signInWithPopup(auth, googleProvider)` from `firebase/auth` modular SDK |
| REQ-039 | Anonymous auth as fallback for unauthenticated play | `signInAnonymously(auth)` called at app launch when user picks "Play anonymously" |
| REQ-040 | Anonymous-to-permanent account upgrade via linkWithPopup | `linkWithPopup(auth.currentUser, googleProvider)` — preserves UID; handle `auth/credential-already-in-use` for conflict |
| REQ-041 | Display name shown on leaderboard entries | Stored in Firestore `users/{uid}` document as `displayName`; unique enforcement via `usernames/{name}` collection |
| REQ-042 | Per-puzzle global leaderboard showing top 50 scores | Firestore collection `puzzles/{puzzleId}/scores`, queried with `orderBy('moves','asc'), orderBy('timeMs','asc'), limit(50)` |
| REQ-043 | Scores ranked by moves (ascending), time as tiebreaker (ascending) | Compound `orderBy` on `moves` then `timeMs` — requires composite Firestore index |
| REQ-044 | Only best attempt per user per puzzle stored | Document ID = `{uid}` under `puzzles/{puzzleId}/scores/` — setDoc overwrites; security rule blocks non-improvements |
| REQ-045 | Scores are immutable (no update/delete by users) | Security rule: only allow write if document doesn't exist OR new score improves on old (moves lower, or same+faster) |
| REQ-046 | Server-side score validation (moves >= puzzle's minimum moves) | Security rule on score doc: `request.resource.data.moves >= request.resource.data.minMoves` — store minMoves on write |
| REQ-047 | Leaderboard view accessible from puzzle completion and puzzle selection | Win screen: leaderboard modal (WinModal extended). Puzzle select: "View leaderboard" button per tile or per puzzle detail |
| NFR-006 | Firestore security rules enforce data integrity | Rules: auth required, non-anonymous only for scores, moves >= minMoves, only-if-better update, userId == auth.uid |
</phase_requirements>

---

## Summary

Phase 4 integrates Firebase Auth (Google Sign-In + Anonymous) and Firestore leaderboards into the existing React 19 + Zustand + react-router v7 app. The Firebase JavaScript SDK is currently at v12.9.0 and uses a fully modular (tree-shakeable) API — all imports come from subpaths like `firebase/auth` and `firebase/firestore`. The SDK is backward-compatible since v9's modular rewrite, so any v9–v12 pattern in documentation is valid.

The auth flow has two distinct entry points: (1) a blocking launch-time prompt choosing Google vs. anonymous, and (2) an anonymous-to-Google upgrade gate triggered only when viewing the leaderboard. The upgrade uses `linkWithPopup` which preserves the user's UID; when the Google account already exists in Firebase (`auth/credential-already-in-use`), a data merge is needed — anonymous scores get copied into the existing Google account via a Firestore transaction, then the anonymous user signs out and the Google user signs in. This merge path is the trickiest part of the phase.

Firestore leaderboard data lives in `puzzles/{puzzleId}/scores/{uid}` (one doc per user per puzzle). Security rules enforce: authenticated non-anonymous writes only, `userId == request.auth.uid`, `moves >= minMoves`, and only-if-better updates (lower moves, or same moves + faster time). The compound `orderBy('moves','asc').orderBy('timeMs','asc').limit(50)` query requires a manually created Firestore composite index. Display name uniqueness is enforced via a reverse-mapping `usernames/{displayName}` collection with batch writes and `getAfter` security rules.

**Primary recommendation:** Use the modular Firebase SDK v12 with a dedicated `src/firebase.ts` init module, a Zustand `authStore` driven by `onAuthStateChanged`, and Firestore security rules as the primary integrity layer (no Cloud Functions needed for this scope).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | ^12.9.0 | Auth + Firestore client SDK | Official Firebase JS SDK, modular API for tree-shaking |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| firebase-tools | CLI (devDep optional) | Deploy security rules, emulator | Local dev/emulator; CI deploy |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain Zustand authStore | React Context + useReducer | Context is fine but Zustand already used for game/progress state — consistent pattern |
| Firestore rules-only validation | Cloud Functions for score submission | Functions add cold-start latency, billing complexity, and deployment overhead; rules suffice for move-count validation |
| linkWithPopup for upgrade | linkWithRedirect | Redirect flows lose in-app state (navigation context); popup is better for SPA |

**Installation:**
```bash
npm install firebase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── firebase.ts              # initializeApp, export auth + db singletons
├── store/
│   ├── gameStore.ts         # existing — no changes
│   ├── progressStore.ts     # existing — no changes
│   └── authStore.ts         # NEW: user state driven by onAuthStateChanged
├── hooks/
│   └── useLeaderboard.ts    # NEW: Firestore query for top 50 + user rank
├── services/
│   └── scoreService.ts      # NEW: submitScore(), mergeAnonymousScores()
├── screens/
│   ├── AuthPromptScreen/    # NEW: blocking launch-time sign-in prompt
│   ├── ProfileScreen/       # NEW: display name edit + sign out + stats
│   ├── GameScreen/
│   │   ├── GameScreen.tsx   # MODIFY: trigger submitScore on win, show rank in WinModal
│   │   └── WinModal.tsx     # MODIFY: add rank display + "View leaderboard" button
│   ├── LeaderboardScreen/   # MODIFY: implement real leaderboard from stub
│   └── PuzzleSelectScreen/  # MODIFY: add leaderboard access per puzzle
└── components/
    └── LeaderboardModal/    # NEW: modal overlay for leaderboard (used from WinModal)
firestore.rules              # Firestore security rules (project root)
```

### Pattern 1: Firebase Singleton Initialization

**What:** Initialize Firebase once in `src/firebase.ts`, export `auth` and `db` singletons.
**When to use:** Always — prevents duplicate app initialization errors.

```typescript
// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

Environment file: `.env` (gitignored), `.env.example` (committed):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Pattern 2: Zustand Auth Store with onAuthStateChanged

**What:** Zustand store subscribes to Firebase auth state. One `onAuthStateChanged` subscription at app start keeps user state current.
**When to use:** As the single source of truth for auth state across all components.

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  initAuth: () => () => void; // returns unsubscribe
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  isAnonymous: false,

  initAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      set({
        user,
        isLoading: false,
        isAnonymous: user?.isAnonymous ?? false,
      });
    });
  },
}));
```

Call `initAuth()` in `main.tsx` or App root `useEffect` once, store the unsubscribe.

### Pattern 3: Auth Flow — Launch Prompt

**What:** Blocking UI rendered in `App.tsx` before routing — if `isLoading` show spinner, if `user === null` show `AuthPromptScreen`, else show `<Routes>`.
**When to use:** Phase decision — auth gates the entire app.

```typescript
// App.tsx structure
function App() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <AuthPromptScreen />;

  return (
    <div className={styles.app}>
      <Routes>...</Routes>
    </div>
  );
}
```

### Pattern 4: Sign In Actions

```typescript
// Sign in with Google (new user or returning)
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(auth);
}
```

### Pattern 5: Anonymous-to-Google Upgrade (linkWithPopup)

**What:** Called when anonymous user clicks "Sign in to compete" at leaderboard gate.
**When to use:** Only when `user.isAnonymous === true`.

```typescript
import { linkWithPopup, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import type { AuthError } from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();

export async function upgradeAnonymousToGoogle(): Promise<'linked' | 'merged' | 'error'> {
  const currentUser = auth.currentUser;
  if (!currentUser) return 'error';

  try {
    // Happy path: anonymous user gets Google linked, UID preserved
    await linkWithPopup(currentUser, googleProvider);
    // Migrate any locally-stored anonymous scores to Firestore
    await migrateAnonymousScores(currentUser.uid);
    return 'linked';
  } catch (err) {
    const error = err as AuthError;
    if (error.code === 'auth/credential-already-in-use') {
      // Google account already exists as a Firebase user
      // Must: save anonymous scores, sign in as Google user, merge scores
      const credential = (error as any).credential;
      const anonUid = currentUser.uid;
      // Sign in as existing Google user
      const result = await signInWithCredential(auth, credential);
      // Merge scores from anonUid -> result.user.uid via Firestore transaction
      await mergeAnonymousScoresToUser(anonUid, result.user.uid);
      return 'merged';
    }
    return 'error';
  }
}
```

**Merge implementation:** `mergeAnonymousScoresToUser` reads all score docs for `anonUid` across puzzles (requires a query or client-side iteration of known puzzles), then writes only if they beat the Google user's existing scores using a Firestore transaction.

Note: Since the requirement says "anonymous scores are preserved and merged," the merge must happen client-side (no Cloud Functions) by reading the anonymous user's scores from `puzzles/*/scores/{anonUid}` and writing them to `puzzles/*/scores/{googleUid}` where they improve the score.

### Pattern 6: Score Submission (Silent, Background)

**What:** Called from `GameScreen` after win is detected. Fails silently.
**When to use:** After puzzle win, for non-anonymous users only.

```typescript
// src/services/scoreService.ts
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface ScoreData {
  userId: string;
  displayName: string;
  moves: number;
  timeMs: number;
  minMoves: number;  // stored for server-side rule validation
  solvedAt: number;  // timestamp
}

export async function submitScore(
  puzzleId: string,
  moves: number,
  timeMs: number,
  minMoves: number,
): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return; // silent no-op for anonymous

  const displayName = await getUserDisplayName(user.uid);
  const scoreRef = doc(db, 'puzzles', puzzleId, 'scores', user.uid);

  // Firestore security rule enforces best-score-only — we write optimistically
  // The rule will reject if not an improvement
  try {
    await setDoc(scoreRef, {
      userId: user.uid,
      displayName,
      moves,
      timeMs,
      minMoves,
      solvedAt: Date.now(),
    });
  } catch {
    // Silent failure per requirement
  }
}
```

### Pattern 7: Leaderboard Query

**What:** Fetch top 50 scores for a puzzle sorted by moves then time. Also fetch the current user's own score for pinned display.
**When to use:** When LeaderboardModal opens.

```typescript
// src/hooks/useLeaderboard.ts
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface LeaderboardEntry {
  uid: string;
  rank: number;
  displayName: string;
  moves: number;
  timeMs: number;
}

export function useLeaderboard(puzzleId: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const scoresRef = collection(db, 'puzzles', puzzleId, 'scores');
      const q = query(
        scoresRef,
        orderBy('moves', 'asc'),
        orderBy('timeMs', 'asc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const top50 = snap.docs.map((d, i) => ({
        uid: d.id,
        rank: i + 1,
        ...(d.data() as Omit<LeaderboardEntry, 'uid' | 'rank'>),
      }));
      setEntries(top50);

      // Fetch current user's score (may be outside top 50)
      const uid = auth.currentUser?.uid;
      if (uid && !auth.currentUser?.isAnonymous) {
        const userInTop50 = top50.find((e) => e.uid === uid);
        if (!userInTop50) {
          const userScoreSnap = await getDoc(doc(scoresRef, uid));
          if (userScoreSnap.exists()) {
            // Compute approximate rank by counting docs with better scores
            // Simple approach: fetch all and count — or store rank on doc (deferred)
            // For now: show score without exact rank outside top 50
            setUserEntry({ uid, rank: -1, ...(userScoreSnap.data() as any) });
          }
        }
      }
      setIsLoading(false);
    }
    load();
  }, [puzzleId]);

  return { entries, userEntry, isLoading };
}
```

**Note on "rank outside top 50":** Getting the exact rank (e.g., "#83") for a user outside top 50 requires counting documents with fewer moves or same moves+less time. Firestore doesn't support `COUNT` with a `WHERE` filter efficiently without a Cloud Function. Practical approach: store rank on the score document (updated on each write) via a Cloud Function trigger — OR just show the score without an exact rank number ("Your best: 14 moves, 1:32" without "#83"). Given no Cloud Functions are needed per the stack decision, the pinned entry can omit the exact rank outside top 50, or use a best-effort approach of fetching a limited set to estimate.

**Recommendation (Claude's discretion):** Show "Your best" row with moves/time but without rank number when outside top 50. This is simpler and avoids Cloud Functions. The leaderboard codelab confirms exact rank for large datasets requires server logic.

### Pattern 8: Display Name Uniqueness

**What:** Two-collection approach — `users/{uid}` stores profile data, `usernames/{displayName}` stores `{uid}` as a reverse mapping. Batch write updates both atomically.
**When to use:** On first Google sign-in (seed from Google displayName) and on profile edits.

```typescript
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';

const MAX_DISPLAY_NAME_LENGTH = 20; // Claude's discretion

export async function isDisplayNameAvailable(name: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', name.toLowerCase()));
  return !snap.exists();
}

export async function setDisplayName(newName: string): Promise<'ok' | 'taken' | 'invalid'> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 'invalid';
  if (!newName || newName.length > MAX_DISPLAY_NAME_LENGTH) return 'invalid';

  const normalizedName = newName.trim();

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', normalizedName.toLowerCase());

  // Check availability first (race condition handled by security rules via getAfter)
  const existing = await getDoc(usernameRef);
  if (existing.exists() && existing.data()?.uid !== uid) return 'taken';

  batch.set(userRef, { displayName: normalizedName }, { merge: true });
  batch.set(usernameRef, { uid });

  try {
    await batch.commit();
    return 'ok';
  } catch {
    return 'taken'; // Likely security rule rejection (race condition)
  }
}
```

Security rules use `getAfter` to ensure both documents are committed together (no orphaned usernames).

### Anti-Patterns to Avoid

- **Calling `initializeApp` multiple times:** Hot module reload can trigger this. Guard with: `const app = getApps().length ? getApp() : initializeApp(config);`
- **Storing Firebase user object in Zustand with `persist`:** The `User` object contains non-serializable methods. Store only serializable fields if persistence is needed (avoid persisting auth state — Firebase SDK handles its own persistence via IndexedDB).
- **Using `onSnapshot` for leaderboard with 50+ entries:** One-time `getDocs` is sufficient and cheaper. Use `onSnapshot` only if real-time updates are explicitly needed.
- **Writing score without including `minMoves`:** The security rule needs `minMoves` to validate `moves >= minMoves`. Always include it on write.
- **Anonymous user writing to Firestore leaderboard:** Security rules must block `sign_in_provider == 'anonymous'`. Don't rely on client-side checks alone.

---

## Firestore Data Model

### Collections

```
/users/{uid}
  - displayName: string
  - createdAt: number
  - isAnonymous: boolean   // set to false after Google link

/usernames/{normalizedDisplayName}
  - uid: string            // reverse mapping for uniqueness

/puzzles/{puzzleId}/scores/{uid}
  - userId: string         // = uid (redundant but useful for rules)
  - displayName: string    // denormalized for leaderboard reads (no join needed)
  - moves: number
  - timeMs: number
  - minMoves: number       // stored to enable security rule validation
  - solvedAt: number       // timestamp
```

**Why denormalize `displayName` in score docs:** Leaderboard queries return score docs directly without a join to `users`. Firestore doesn't support joins. When a user updates their display name, a background update of existing score docs is needed (best-effort, eventually consistent is acceptable).

### Indexes Required

A composite index is required for the leaderboard query. Create it in the Firebase Console or `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "scores",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "moves", "order": "ASCENDING" },
        { "fieldPath": "timeMs", "order": "ASCENDING" }
      ]
    }
  ]
}
```
Firestore will prompt with a console link when the query first runs without the index — but it's better to deploy the index definition proactively.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state subscription | Manual re-fetch on navigation | `onAuthStateChanged` | Handles token refresh, session restore, sign-out across tabs |
| Anonymous auth persistence | localStorage user ID | Firebase SDK anonymous auth | SDK persists anonymous user across sessions via IndexedDB automatically |
| Score write conflict (best score) | Read-then-write in client code | Firestore security rules | Rules enforce atomically; client code can be bypassed |
| Display name uniqueness | Client-side array check | `usernames` collection + batch write + security rules | Race condition safety, server-enforced |
| Leaderboard sort | Client-side array sort after full fetch | Firestore `orderBy + limit` | Index-backed sort at server; only returns top N |

**Key insight:** Firestore security rules run server-side on Google infrastructure and cannot be bypassed by client code. They are the correct enforcement layer for data integrity — not client validation.

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Users ----
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == uid;
      allow update: if request.auth.uid == uid;
    }

    // ---- Usernames (uniqueness enforcement) ----
    match /usernames/{displayName} {
      allow read: if request.auth != null;
      // Only allow write if the users/{uid} doc is also being written in the same batch
      // and the uid matches the authenticated user
      allow write: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.displayName == displayName;
    }

    // ---- Leaderboard Scores ----
    match /puzzles/{puzzleId}/scores/{uid} {
      // Anyone can read (public leaderboard)
      allow read: if true;

      // Write rules:
      allow write: if
        // Must be authenticated and non-anonymous
        request.auth != null &&
        request.auth.token.firebase.sign_in_provider != 'anonymous' &&
        // Must be writing own score
        request.auth.uid == uid &&
        request.resource.data.userId == request.auth.uid &&
        // Must include required fields with correct types
        request.resource.data.moves is int &&
        request.resource.data.timeMs is int &&
        request.resource.data.minMoves is int &&
        // Server-side move count validation (REQ-046)
        request.resource.data.moves >= request.resource.data.minMoves &&
        // Only allow if document doesn't exist (first score) OR improvement (REQ-044, REQ-045)
        (
          !exists(/databases/$(database)/documents/puzzles/$(puzzleId)/scores/$(uid)) ||
          request.resource.data.moves < resource.data.moves ||
          (request.resource.data.moves == resource.data.moves &&
           request.resource.data.timeMs < resource.data.timeMs)
        );
    }
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Firebase App Re-initialization on Hot Reload

**What goes wrong:** Vite HMR triggers module re-execution; `initializeApp` throws "Firebase App named '[DEFAULT]' already exists."
**Why it happens:** Module-level `initializeApp` call runs again on each HMR cycle.
**How to avoid:**
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
```
**Warning signs:** Console error "Firebase App named '[DEFAULT]' already exists" during development.

### Pitfall 2: onAuthStateChanged Called Before initAuth

**What goes wrong:** Components read `user` from authStore while `isLoading: true` and render incorrect states (e.g., show AuthPromptScreen briefly to signed-in users).
**Why it happens:** `onAuthStateChanged` fires asynchronously; there's always a brief window where auth state is unknown.
**How to avoid:** Always gate rendering on `isLoading` check. Show a spinner until Firebase resolves the initial auth state. The callback fires once immediately on subscribe with the current user (or null).
**Warning signs:** AuthPromptScreen flashes briefly before app loads for returning users.

### Pitfall 3: linkWithPopup Merge Conflict Not Handled

**What goes wrong:** When `auth/credential-already-in-use` is thrown and not handled, the user sees an error and cannot sign in. Their anonymous session remains, but they can never access the leaderboard.
**Why it happens:** The anonymous user previously used a different browser/device where the Google account was signed in as a full Firebase user.
**How to avoid:** Always catch `auth/credential-already-in-use`, extract `error.credential`, call `signInWithCredential`, then merge Firestore data from old `anonUid` to new `uid`.
**Warning signs:** User reports being stuck on the "link account" screen.

### Pitfall 4: Composite Index Not Deployed

**What goes wrong:** Leaderboard query fails with Firestore error "The query requires an index." In development, Firestore provides a link to create it; in production, users see no leaderboard.
**Why it happens:** `orderBy('moves').orderBy('timeMs')` on a subcollection requires a composite index that isn't auto-created.
**How to avoid:** Deploy `firestore.indexes.json` alongside security rules. Test the leaderboard query before launch.
**Warning signs:** Console error "FirebaseError: The query requires an index" with a URL to create it.

### Pitfall 5: Storing Firebase User in Zustand with `persist`

**What goes wrong:** TypeScript errors or silent serialization failures because `User` is a class with methods, not a plain object.
**Why it happens:** Zustand's `persist` middleware uses `JSON.stringify`, which drops class methods.
**How to avoid:** Never persist the Firebase `User` object. Firebase SDK stores its own auth state in IndexedDB and restores it on load. Only keep the `User` reference in memory (non-persisted Zustand slice).
**Warning signs:** Auth state lost between page refreshes despite `persist` being configured.

### Pitfall 6: Display Name Denormalization Drift

**What goes wrong:** User changes display name in profile; old leaderboard entries still show the old name.
**Why it happens:** `displayName` is denormalized into each score document for join-free reads.
**How to avoid:** After a display name change, issue a batch update to all of the user's score documents. This is best-effort — if it fails, the leaderboard eventually shows the old name for old entries. Accept this as a known limitation or do a background sweep.
**Warning signs:** User reports their new name not showing on old puzzle leaderboards.

### Pitfall 7: Race Condition in Username Uniqueness Check

**What goes wrong:** Two users simultaneously pick the same display name; both pass the availability check; both write successfully, breaking uniqueness.
**Why it happens:** The "check then write" pattern is not atomic without transactions.
**How to avoid:** Use `writeBatch` with `getAfter` in the security rule, which validates the batch as an atomic unit. The Firestore security rule is the final enforcer, not the client-side `getDoc` check.
**Warning signs:** Two users appear on the leaderboard with identical display names.

---

## Code Examples

### Firebase Init with HMR Guard

```typescript
// src/firebase.ts
// Source: Firebase official docs + getApps() HMR pattern
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Auth Store Init in main.tsx

```typescript
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

// Start auth subscription before first render
const unsubscribe = useAuthStore.getState().initAuth();
// unsubscribe is available if cleanup is needed (e.g., in tests)

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### Leaderboard Query with Composite OrderBy

```typescript
// Source: Firebase Firestore docs — order-limit-data
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const scoresRef = collection(db, 'puzzles', puzzleId, 'scores');
const q = query(
  scoresRef,
  orderBy('moves', 'asc'),    // primary sort: fewer moves = better
  orderBy('timeMs', 'asc'),   // tiebreaker: faster time = better
  limit(50),
);
const snapshot = await getDocs(q);
```

### linkWithPopup for Anonymous Upgrade

```typescript
// Source: Firebase Auth docs — account-linking
import { linkWithPopup, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import type { AuthError } from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();

async function upgradeToGoogle() {
  try {
    await linkWithPopup(auth.currentUser!, googleProvider);
    // Success: same UID, now Google-linked
  } catch (err) {
    const error = err as AuthError;
    if (error.code === 'auth/credential-already-in-use') {
      const credential = (error as any).credential;
      const anonUid = auth.currentUser!.uid;
      const result = await signInWithCredential(auth, credential);
      // Now signed in as Google user — merge anonUid data into result.user.uid
      await mergeAnonymousScores(anonUid, result.user.uid);
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Namespaced SDK (`firebase.auth()`, `firebase.firestore()`) | Modular SDK (tree-shakeable imports) | Firebase v9 (2021) | Bundle size reduction; new project standard |
| `firebase@8.x` compat layer | `firebase@12.x` modular only | v9+ | No compat import should be used in new code |
| `signInWithRedirect` as default for mobile web | `signInWithPopup` preferred in SPA context | Ongoing (Google trend) | Redirect loses in-app state; popup is cleaner for React SPA |
| React Firebase Hooks library | Plain `onAuthStateChanged` + Zustand | Project-specific | Already using Zustand; additional library unnecessary |

**Deprecated/outdated:**
- Namespaced API (e.g., `import firebase from 'firebase/app'` then `firebase.auth()`): replaced by modular imports. Do NOT use.
- `firebase.auth().currentUser.linkWithPopup()`: replaced by `linkWithPopup(auth.currentUser, provider)` from `firebase/auth`.

---

## Open Questions

1. **Exact rank computation for users outside top 50**
   - What we know: Firestore doesn't support server-side COUNT with filters; Cloud Functions could compute it server-side.
   - What's unclear: Whether an approximate or "moves/time only (no rank #)" approach is acceptable.
   - Recommendation: Show moves/time without rank number for out-of-top-50 entries. Avoids Cloud Functions entirely. The CONTEXT.md shows "#83" as an example — flag this to the planner as a decision point: is the exact rank number required, or can it be approximate/omitted?

2. **Display name migration when changed (denormalization)**
   - What we know: Each score document stores `displayName` for join-free leaderboard reads.
   - What's unclear: How to handle retroactive updates to existing score documents when the user changes their display name.
   - Recommendation: Best-effort batch update of known puzzle score docs on name change (iterate puzzleIds from local progressStore). If write fails, accept eventual consistency.

3. **Firebase project setup (console configuration)**
   - What we know: The app needs a Firebase project with Auth (Google + Anonymous providers enabled) and Firestore (Native mode).
   - What's unclear: Whether the Firebase project has been created or if the planner should include a "setup Firebase console" task.
   - Recommendation: Include a first-task in the plan for Firebase project creation and `.env` setup.

---

## Sources

### Primary (HIGH confidence)
- Firebase official docs — https://firebase.google.com/docs/auth/web/anonymous-auth — signInAnonymously, linkWithPopup patterns
- Firebase official docs — https://firebase.google.com/docs/auth/web/google-signin — signInWithPopup, GoogleAuthProvider
- Firebase official docs — https://firebase.google.com/docs/auth/web/account-linking — linkWithPopup account linking
- Firebase official docs — https://firebase.google.com/docs/firestore/security/rules-conditions — security rule conditions
- Firebase official docs — https://firebase.google.com/docs/rules/data-validation — data validation in rules
- Firebase official docs — https://firebase.google.com/docs/web/setup — firebase.ts initialization pattern
- npm registry — firebase@12.9.0 (verified via `npm show firebase version`, 2026-02-21)

### Secondary (MEDIUM confidence)
- Firebase Blog (2023) — https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/ — anonymous auth best practices
- Fireship custom usernames tutorial — https://fireship.dev/lessons/custom-usernames-firebase/ — usernames collection + batch write pattern
- smarx.com (2021) — https://smarx.com/posts/2021/01/building-a-leaderboard-with-firestore-orderby-and-limit/ — leaderboard orderBy/limit pattern
- Firebase Codelabs — https://firebase.google.com/codelabs/build-leaderboards-with-firestore — leaderboard architecture options
- Zustand GitHub discussion #1450 — Firebase + Zustand auth store pattern
- Firebase Auth persistence docs — https://firebase.google.com/docs/auth/web/auth-state-persistence

### Tertiary (LOW confidence)
- Medium articles on Firebase + React TypeScript (multiple sources) — general patterns validated against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack (firebase@12.9.0 modular SDK): HIGH — verified from npm registry
- Architecture (Zustand authStore + onAuthStateChanged): HIGH — verified against Firebase docs and Zustand patterns
- Firestore data model (subcollection scores, usernames): HIGH — standard pattern per Firebase leaderboard codelab
- Security rules: MEDIUM-HIGH — rule syntax verified, but exact `getAfter` usage for batch uniqueness needs emulator testing
- Exact rank outside top 50: LOW — no practical approach without Cloud Functions; recommend dropping exact rank number
- Display name denormalization migration: MEDIUM — well-understood problem, solution is best-effort

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Firebase SDK evolves; security rule syntax is stable)
