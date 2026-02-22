---
phase: 03-puzzle-data-and-navigation
plan: "02"
subsystem: navigation
tags: [react-router, screens, navigation, win-modal, progress-tracking]
dependency_graph:
  requires: ["03-01"]
  provides: ["full-screen-navigation", "game-screen", "win-modal"]
  affects: ["src/App.tsx", "src/main.tsx", "src/components/ControlBar/ControlBar.tsx"]
tech_stack:
  added: ["react-router v7 (BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams)"]
  patterns: ["CSS Modules per screen", "Zustand selectors in leaf components", "replace:true for tab navigation"]
key_files:
  created:
    - src/screens/MainMenuScreen/MainMenuScreen.tsx
    - src/screens/MainMenuScreen/MainMenuScreen.module.css
    - src/screens/PuzzleSelectScreen/PuzzleSelectScreen.tsx
    - src/screens/PuzzleSelectScreen/PuzzleSelectScreen.module.css
    - src/screens/PuzzleSelectScreen/DifficultyTabs.tsx
    - src/screens/PuzzleSelectScreen/DifficultyTabs.module.css
    - src/screens/PuzzleSelectScreen/PuzzleGrid.tsx
    - src/screens/PuzzleSelectScreen/PuzzleGrid.module.css
    - src/screens/PuzzleSelectScreen/PuzzleTile.tsx
    - src/screens/PuzzleSelectScreen/PuzzleTile.module.css
    - src/screens/GameScreen/GameScreen.tsx
    - src/screens/GameScreen/GameScreen.module.css
    - src/screens/GameScreen/WinModal.tsx
    - src/screens/GameScreen/WinModal.module.css
    - src/screens/LeaderboardScreen/LeaderboardScreen.tsx
    - src/screens/LeaderboardScreen/LeaderboardScreen.module.css
  modified:
    - src/main.tsx
    - src/App.tsx
    - src/App.module.css
    - src/components/ControlBar/ControlBar.tsx
decisions:
  - "Import from react-router (not react-router-dom) — v7 merged packages"
  - "DifficultyTabs use replace:true setSearchParams to avoid polluting browser history"
  - "WinModal timeMs computed from state.endTime - state.startTime at win moment"
  - "ControlBar navigate(-1) replaces alert placeholder — works generically in any navigation context"
metrics:
  duration_min: 12
  completed_date: "2026-02-20"
  tasks_completed: 2
  files_changed: 20
---

# Phase 3 Plan 02: React Router Navigation and Screens Summary

React Router v7 wired with 4 routes, 4 screens built (MainMenu, PuzzleSelect, GameScreen, Leaderboard stub), WinModal with stats and optimal detection, progress recording to localStorage on win.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Set up React Router and create MainMenu + PuzzleSelect screens | 25d8a9c | src/main.tsx, src/App.tsx, src/screens/MainMenuScreen/, src/screens/PuzzleSelectScreen/, src/screens/LeaderboardScreen/ |
| 2 | Build GameScreen with puzzle loading, WinModal, and progress recording | 908ba0a | src/screens/GameScreen/GameScreen.tsx, src/screens/GameScreen/WinModal.tsx, src/components/ControlBar/ControlBar.tsx |

## What Was Built

### Routing Architecture
- `src/main.tsx` wraps App in `<BrowserRouter>` from `"react-router"` (v7 merged package)
- `src/App.tsx` replaced DEV harness with `<Routes>`: `/`, `/puzzles`, `/play/:difficulty/:puzzleId`, `/leaderboard/:difficulty/:puzzleId`
- Vite's default SPA dev server serves index.html for all routes — no config change needed

### MainMenuScreen
- Full-viewport dark background (`#1a0f00`) with yellow gold title (`#f5c842`)
- "Rush Hour" title + "Slide the cars. Free the red one." subtitle
- "Play" button navigates to `/puzzles` with pressed button depth effect

### PuzzleSelectScreen
- `useSearchParams` reads/writes `?difficulty=` — defaults to `"beginner"` when absent
- `DifficultyTabs`: Beginner | Intermediate | Advanced | Expert pill buttons; active tab highlighted gold; `replace: true` prevents back-button undo of tab switches
- `PuzzleGrid`: 5-column CSS grid (4-column at ≤480px), maps `PUZZLES_BY_DIFFICULTY[difficulty]`
- `PuzzleTile`: square button, puzzle number extracted from ID suffix, green tint + checkmark overlay for completed puzzles via `useProgressStore`

### GameScreen
- `useParams<{ difficulty, puzzleId }>()` reads route params
- `useEffect` on `puzzleId`: calls `getPuzzleById` → `loadPuzzle`; redirects to `/puzzles` on unknown ID
- Second `useEffect` on `state?.isWon`: calls `recordCompletion(puzzleId, moveCount, timeMs)` then shows WinModal
- Renders existing `<GameHUD />`, `<Board />`, `<ControlBar />` — no changes to those components except ControlBar

### WinModal
- Semi-transparent backdrop overlay (z-index: 100) with centered card
- Stats: Your Moves, Minimum Moves, Your Time (M:SS format)
- "Optimal!" green badge when `moveCount === minMoves`
- "Next Puzzle" → `getNextPuzzle(puzzleId)` → next route, or falls back to puzzle select if last
- "Back to Selection" → `/puzzles?difficulty=X`

### ControlBar Update
- Replaced `alert('Menu coming soon!')` placeholder with `useNavigate` + `navigate(-1)`
- Works correctly in both GameScreen context and any future context

### LeaderboardScreen
- Stub page showing "Leaderboard — Coming in Phase 4" with back button

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: 0 errors
- `npm run build`: succeeds (262.98 kB bundle, 100 puzzles validated)
- All 4 routes defined and screens created
- Progress recording wired: `recordCompletion` called on win, persisted to `rushhour_progress` localStorage key
- ControlBar back button uses router navigation

## Self-Check: PASSED

Files confirmed created:
- src/screens/MainMenuScreen/MainMenuScreen.tsx
- src/screens/PuzzleSelectScreen/PuzzleSelectScreen.tsx
- src/screens/PuzzleSelectScreen/DifficultyTabs.tsx
- src/screens/PuzzleSelectScreen/PuzzleGrid.tsx
- src/screens/PuzzleSelectScreen/PuzzleTile.tsx
- src/screens/GameScreen/GameScreen.tsx
- src/screens/GameScreen/WinModal.tsx
- src/screens/LeaderboardScreen/LeaderboardScreen.tsx

Commits confirmed:
- 25d8a9c: feat(03-02): set up React Router and create MainMenu + PuzzleSelect screens
- 908ba0a: feat(03-02): build GameScreen with WinModal, puzzle loading, and progress recording
