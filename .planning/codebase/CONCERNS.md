# Codebase Concerns
*Generated: 2026-04-12*

## Summary

The codebase is in good overall health following a clean v1.0 ship. Technical debt is low and well-documented. The main concerns are known carry-forwards from v1.0: silent audio stubs, a dead LeaderboardScreen route, an offline auth edge case, and a handful of dependency and security gaps worth addressing in v1.1.

## Technical Debt

| Concern | Severity | Detail |
|---------|----------|--------|
| Silent MP3 stubs | MED | `public/sounds/*.mp3` files are empty stubs — audio wiring is complete, but no real audio plays |
| Dead LeaderboardScreen route | MED | `LeaderboardScreen` component exists and has a route, but no UI nav link points to it; only accessible via `LeaderboardModal` |
| `authStore` offline timeout missing | HIGH | First-visit-offline causes permanent loading spinner — `isLoading` never resolves to `false` without a 5-second timeout guard |
| Score submission offline gap | MED | Scores silently dropped if Firestore is unreachable during play; no retry queue exists |
| No CI/CD pipeline | LOW | No GitHub Actions or equivalent — tests run locally only via `npm test` |

## Performance Concerns

- **Bundle headroom:** Initial load is 197 KB gzip (target: 200 KB) — only 3 KB of headroom; any significant new dependency could breach the target
- **Firestore read costs:** Each leaderboard open triggers a `getDocs` (up to 50 docs per puzzle). At scale, this could approach Firebase free-tier limits (50K daily reads)
- **No caching for leaderboard reads:** Repeated opens of the same puzzle's leaderboard always re-fetch; a short TTL cache would reduce costs

## Security Concerns

- **Client-written `minMoves`:** Scores are submitted with a `minMoves` field computed client-side by the BFS solver. A motivated attacker could submit artificially low `minMoves` to appear to solve puzzles "perfectly." Firestore security rules check for score improvement but not `minMoves` validity.
- **Display name validation:** Server-side Firestore rules should validate display name length; currently enforced only in the UI (2–20 chars)
- **Anonymous auth upgrade:** Works correctly, but mergeAnonymousScores iterates ALL_PUZZLES client-side — not a security risk, but a privacy consideration (anonymous history is fully transferred)

## Scalability Concerns

- **Leaderboard top-50 cap:** Fixed at 50 entries per puzzle; works for current scale but has no per-user rate-limiting on score submissions
- **100 puzzle limit:** Puzzle data is a local JSON bundle (~16 KB); adding significantly more puzzles (300+) would increase bundle size
- **No pagination on PuzzleSelect:** All 100 puzzle tiles render at once; at 400+ puzzles this would need virtualization

## Maintainability Concerns

- **`mergeAnonymousScores` complexity:** Iterates all puzzles client-side to find anonymous user docs — works but is O(N) Firestore reads on sign-in upgrade (100 puzzles = 100 reads)
- **Puzzle generation script:** The generator (`scripts/generatePuzzles.ts`) is a one-time tool with no documentation on re-running or adjusting difficulty thresholds
- **`useDrag` hook complexity:** The drag hook manages pointer events, collision clamping, snap timing, and audio all in one place — high cognitive load for future modifications
- **Zustand store count:** 4 stores (game, progress, sound, auth) — well-separated but no documented ownership boundaries

## Dependency Risks

| Package | Risk | Detail |
|---------|------|--------|
| Howler.js | MED | Project STATE.md flagged "verify still actively maintained" — last major release was 2.2.x; no v3 in sight |
| Vite | LOW | Vite 6.x in use; Vite 7/8 may require migration work |
| TypeScript | LOW | Likely on 5.x; TypeScript 6 may bring breaking strict changes |
| React Router v7 | LOW | Recently merged react-router-dom; API is stable but docs are still consolidating |
| canvas-confetti | LOW | Small, stable package; low risk |

## Gaps / Uncertainties

- No Firestore index deployment files (`.firestore/indexes.json`) found — index may have been created manually in the console
- No `firestore.rules` file committed to the repo — security rules may exist only in the Firebase console
- No E2E tests (Playwright/Cypress) — only 57 Vitest unit tests covering the engine layer; all UI behavior is untested automatically
- No error boundary components — an uncaught render error would show a blank screen
