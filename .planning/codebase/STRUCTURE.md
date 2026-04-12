# Directory Structure
*Generated: 2026-04-12*

## Summary

The repo has a Vite-based React app in `src/`, an Android wrapper in `android/`, puzzle generation scripts in `scripts/`, and planning artifacts in `.planning/`. Within `src/`, each component and screen lives in its own folder with co-located CSS Modules.

## Top-Level Layout

```
RushHourApp/
├── src/                  # React application source
├── android/              # Android wrapper (TWA or WebView)
├── public/               # Static assets (sounds, icons)
│   └── sounds/           # MP3 stubs (slide.mp3, win.mp3, levelStart.mp3)
├── resources/            # Play Store assets (icons, feature graphic)
├── scripts/              # Build-time tools (puzzle generator, validator)
├── dist/                 # Production build output (gitignored)
├── .planning/            # GSD planning artifacts
├── index.html            # Vite entry point
├── vite.config.ts        # Build config with manualChunks
├── tsconfig.json         # TypeScript config
├── eslint.config.js      # ESLint config
└── package.json          # Scripts, dependencies
```

## src/ Breakdown

```
src/
├── main.tsx              # App entry: initAuth() → createRoot()
├── App.tsx               # Router + auth gate (isLoading guard)
├── engine/               # Pure TypeScript game engine (zero UI deps)
│   ├── GameEngine.ts     # Board state, move/undo/reset
│   ├── solver.ts         # BFS solver (build-time only)
│   ├── types.ts          # Shared types (Vehicle, PuzzleDefinition, etc.)
│   ├── puzzles.ts        # Puzzle loader (imports JSON data files)
│   └── __tests__/        # 57 Vitest unit tests
├── store/                # Zustand state stores
│   ├── gameStore.ts      # Active game state (engine wrapper)
│   ├── authStore.ts      # Firebase Auth (in-memory only)
│   └── progressStore.ts  # Completions + personal bests (localStorage)
├── services/             # Side-effect services
│   ├── scoreService.ts   # Firestore reads/writes
│   └── soundService.ts   # Howler.js singleton
├── hooks/                # Custom React hooks
│   ├── useDrag.ts        # Pointer Events drag handler
│   └── useLeaderboard.ts # Leaderboard data fetching hook
├── components/           # Reusable UI components
│   ├── Board/            # Board.tsx + Board.module.css
│   ├── Vehicle/          # Vehicle.tsx + Vehicle.module.css
│   ├── WinModal/         # WinModal.tsx + WinModal.module.css
│   ├── LeaderboardModal/ # LeaderboardModal.tsx + LeaderboardModal.module.css
│   ├── GameHeader/       # GameHeader.tsx + GameHeader.module.css
│   ├── ControlBar/       # ControlBar.tsx + ControlBar.module.css
│   ├── DifficultyTabs/   # DifficultyTabs.tsx + DifficultyTabs.module.css
│   └── PuzzleTile/       # PuzzleTile.tsx + PuzzleTile.module.css
├── screens/              # Full-page route components
│   ├── MainMenuScreen/
│   ├── PuzzleSelectScreen/
│   ├── GameScreen/
│   ├── ProfileScreen/
│   ├── LeaderboardScreen/ # Exists but unreachable from UI nav
│   └── AuthPromptScreen/
├── data/                 # Puzzle JSON data (bundled, ~16 KB)
│   ├── index.ts          # Re-exports ALL_PUZZLES array
│   ├── easy.json         # 25 puzzles
│   ├── medium.json       # 25 puzzles
│   ├── hard.json         # 25 puzzles
│   └── expert.json       # 25 puzzles
└── utils/
    ├── formatTime.ts     # Shared time formatter (used in WinModal + leaderboard)
    └── (other utils)
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase folder + file | `Board/Board.tsx` |
| Screens | PascalCase + `Screen` suffix | `GameScreen/GameScreen.tsx` |
| CSS Modules | Same name + `.module.css` | `Board.module.css` |
| Hooks | camelCase + `use` prefix | `useDrag.ts` |
| Services | camelCase + `Service` suffix | `scoreService.ts` |
| Stores | camelCase + `Store` suffix | `gameStore.ts` |
| Utils | camelCase, descriptive | `formatTime.ts` |
| Types | PascalCase interfaces, camelCase type aliases | `Vehicle`, `Difficulty` |
| Tests | Co-located in `__tests__/`, `.test.ts` suffix | `GameEngine.test.ts` |

## Where to Add New Code

| Adding... | Goes in... |
|-----------|-----------|
| New screen / route | `src/screens/NewScreen/` + update `App.tsx` routes |
| New reusable component | `src/components/NewComponent/` |
| New global state | `src/store/newStore.ts` |
| New external service | `src/services/newService.ts` |
| New shared hook | `src/hooks/useNewHook.ts` |
| New utility function | `src/utils/newUtil.ts` |
| Engine logic change | `src/engine/GameEngine.ts` + update `__tests__/` |
| New puzzle data | `src/data/*.json` + update generator script |
| Static asset | `public/` |

## Gaps / Uncertainties

- `android/` structure not fully explored — unclear if TWA or custom WebView
- No `firestore.rules` or Firestore index files found in the repo (likely console-only)
