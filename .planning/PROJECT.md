# Rush Hour Puzzle Game

## What This Is

A fully playable Rush Hour sliding puzzle game as a React SPA — players drag (or keyboard-navigate) colorful vehicles on a 6×6 grid to free the red car through the exit. 100 hand-validated puzzles across 4 difficulty levels. Firebase-backed global leaderboards with Google and anonymous authentication. Sound effects, confetti win animation, keyboard accessibility, and a bundle under 200 KB.

## Core Value

An accessible, polished puzzle game that feels satisfying to play — the drag mechanics, snap animation, and progression feedback keep players coming back.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Zustand + CSS Modules
- **Backend:** Firebase Auth + Firestore
- **Audio:** Howler.js (lazy-loaded)
- **Animation:** canvas-confetti (lazy-loaded)
- **Testing:** Vitest (57 engine unit tests)
- **Routing:** React Router v7

## Requirements

### Validated (v1.0)

- ✓ 6×6 grid board with vehicle types (2-cell cars, 3-cell trucks) — v1.0
- ✓ Move validation: axis-constrained, collision-detected, bounds-checked — v1.0
- ✓ Win condition: red car reaches right edge of row 3 — v1.0
- ✓ Move counter + timer (start on first move, stop on win, reset on reset) — v1.0
- ✓ BFS solver computing optimal move count for all puzzles — v1.0
- ✓ 60fps CSS-transform drag with real-time collision clamping and snap-to-grid — v1.0
- ✓ Touch support via Pointer Events API — v1.0
- ✓ 19 vehicle colors, CSS pseudo-element car art, exit marker, responsive board (320px+) — v1.0
- ✓ 100 puzzles (25 per difficulty), BFS-validated at build time — v1.0
- ✓ React Router navigation: MainMenu → PuzzleSelect → GameScreen → WinModal — v1.0
- ✓ LocalStorage progress persistence (completed puzzles, personal best) — v1.0
- ✓ WinModal with moves, time, minimum moves, personal best indicator — v1.0
- ✓ Firebase Auth (Google + anonymous) with session persistence — v1.0
- ✓ Firestore per-puzzle leaderboards (top 50, improvement-only, security rules) — v1.0
- ✓ ProfileScreen with display name editing and anonymous-to-Google upgrade — v1.0
- ✓ Slide sound, win sound, level-start sound via Howler.js — v1.0
- ✓ Global mute toggle with localStorage persistence — v1.0
- ✓ Canvas-confetti win animation + board glow + 2-second WinModal delay — v1.0
- ✓ Keyboard navigation: Tab to select, Arrow to move, Escape to deselect — v1.0
- ✓ ARIA: role=grid, role=gridcell, aria-label, aria-selected — v1.0
- ✓ Production bundle ≤ 200 KB gzipped (197 KB achieved) — v1.0
- ✓ Offline graceful degradation: puzzles and game fully offline, Firebase silently fails — v1.0
- ✓ Cross-browser: Chrome, Firefox, Safari, Edge — v1.0
- ✓ Pure TypeScript engine with zero React/Firebase dependencies — v1.0

### Active (v1.1 candidates)

- [ ] Real MP3 audio assets (current stubs are silent)
- [ ] LeaderboardScreen navigable from UI (currently only LeaderboardModal accessible)
- [ ] authStore offline timeout (first-visit-offline causes permanent loading spinner)
- [ ] Score submission retry queue for offline play
- [ ] PWA / service worker for full offline install experience

### Out of Scope

- Mobile native app — web-first approach; Pointer Events covers touch well
- Video chat — use external tools
- Hints system — players solve on their own (by design)
- Real-time leaderboard updates — one-time fetch is cheaper; modal is ephemeral

## Key Decisions

| Decision | Outcome | Status |
|----------|---------|--------|
| Pure game engine with zero UI deps | 57 tests, isolated from React; BFS solver testable standalone | ✓ Good |
| Custom Pointer Events for drag (not a library) | Axis-constrained sliding fits Rush Hour exactly; no drag library overhead | ✓ Good |
| Puzzles as local JSON (not Firestore) | ~16KB bundled; instant load, fully offline | ✓ Good |
| 100 puzzles (25 per difficulty) | Exceeded 80+ minimum; BFS-validated at build | ✓ Good |
| Expert difficulty by density (13+ vehicles AND 15+ moves) | 25+ move puzzles are combinatorially rare; density works better | ✓ Good |
| React Router v7 (react-router not react-router-dom) | Merged package in v7 | ✓ Good |
| REQ-016 keyboard nav + REQ-023 win animation deferred to Phase 5 | Clean separation of concerns | ✓ Good |
| No Zustand persist for auth | Firebase SDK owns session in IndexedDB; redundant to double-persist | ✓ Good |
| submitScore uses getDocs over onSnapshot | One-time read cheaper; leaderboard modal is ephemeral (not persistent UI) | ✓ Good |
| Dynamic import() for Howler + confetti | Defers 14 KB gzip; initial load under 200 KB target | ✓ Good |
| LeaderboardModal (overlay) over LeaderboardScreen (navigation) | Faster UX; modal accessible from both WinModal and PuzzleSelect | ⚠️ Revisit — LeaderboardScreen route exists but unreachable |
| REQ-032 personal best in WinModal only (tiles show checkmark) | WinModal gives full context; tiles stay clean | ✓ Good |
| isLoading gate in App.tsx before rendering | Prevents AuthPromptScreen flash for returning users | ✓ Good — but needs timeout for first-visit-offline |

## Constraints

- No external image assets — all visuals via CSS/SVG (keeps bundle small, no CDN dependency)
- Firebase free tier limits: 50K daily reads, 20K daily writes (sufficient for puzzle game scale)
- Bundle size target: < 200 KB gzipped initial load

## Context

**Shipped:** v1.0 (2026-02-22) — fully playable game, all 61 requirements satisfied
**Source:** ~5,854 lines TypeScript + CSS | 20 plans | 6 days end-to-end
**Next:** v1.1 — likely real audio assets + authStore offline fix + LeaderboardScreen navigation

---
*Last updated: 2026-02-22 after v1.0 milestone*
