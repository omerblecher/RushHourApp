# Milestones

## v1.0 Rush Hour MVP (Shipped: 2026-02-22)

**Phases completed:** 5 phases, 20 plans
**Timeline:** 2026-02-16 → 2026-02-22 (6 days)
**Source:** ~5,854 lines (TypeScript + CSS) | 146 files | 32 feature commits

**Key accomplishments:**
- Pure TypeScript game engine with 57 unit tests — 6×6 grid, move validation, collision detection, win condition, undo/reset, BFS solver computing optimal move counts
- 60fps React board UI with CSS-transform drag, touch support, real-time collision clamping, snap-to-grid animation, and CSS pseudo-element car art (19 colors, exit marker)
- 100 puzzles (25 per difficulty) validated at build time by BFS solver; React Router navigation, localStorage progress persistence, WinModal with personal best
- Firebase Auth (Google sign-in + anonymous), Firestore per-puzzle leaderboards with improvement-only security rules, ProfileScreen with display name and anonymous upgrade
- Howler.js sounds (slide/win/level-start), canvas-confetti win animation, GameHeader with mute/help/about, keyboard navigation (Tab/Arrow/Escape), ARIA accessibility
- Production bundle split to 197 KB gzip (under 200 KB target) via manualChunks + dynamic imports for Howler and confetti

**Tech debt carried forward:**
- Sound files are silent MP3 stubs — swap `public/sounds/*.mp3` for real audio (wiring complete)
- LeaderboardScreen component unreachable via UI navigation — accessible via LeaderboardModal instead
- `authStore.ts` needs 5-second timeout for first-visit-offline edge case
- REQUIREMENTS.md traceability table had stale "Pending" entries (archived as-is)

---

