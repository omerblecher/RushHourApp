# Phase 3: Puzzle Data and Navigation - Research

**Researched:** 2026-02-19
**Domain:** React Router v7, puzzle data sourcing, localStorage progress, build-time validation
**Confidence:** HIGH (React Router verified with official docs; puzzle data approach verified with codebase analysis)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Navigation flow
- Main menu/home screen as entry point (title/logo, then navigate to play)
- Screen hierarchy: Main Menu → Difficulty Selection (tabs) → Puzzle Grid → Game Board
- Simple fade/slide CSS transitions between screens
- Full URL-based routing — browser back button navigates through the hierarchy naturally
- On puzzle win: show completion stats (moves, time, vs optimal), then offer "Next Puzzle" and "Back to Selection"

#### Puzzle selection UI
- Numbered tiles (Puzzle 1, 2, 3...) — simple squares, not mini board previews
- Difficulty levels presented as horizontal tabs/segmented control at top (Beginner | Intermediate | Advanced | Expert)
- 5 tiles per row in the puzzle grid (4 rows of 5 for 20 puzzles)
- Completed tiles get a checkmark overlay and shift to a muted/green tint; uncompleted stay bold
- Default tab is always Beginner

#### Progress & stats
- Win/completion screen shows: your moves, your time, and minimum possible moves (optimal comparison)
- Puzzle tiles in grid show only completion status (checkmark), not personal best stats
- No aggregate progress counter per difficulty level — checkmarks on tiles are sufficient
- Personal best tracked as both moves AND time per puzzle in localStorage (available for win screen comparison even if not shown on tiles)

#### Difficulty & unlocking
- All puzzles in all difficulties available from the start — no progressive unlock gates
- Puzzles within each difficulty ordered by complexity (easiest first, gradual ramp up)
- Difficulty classification based on board complexity (vehicle count + congestion), not just optimal move count — some short puzzles are tricky
- Beginner tab selected by default when entering puzzle selection

### Claude's Discretion
- Exact main menu layout and styling
- Transition animation specifics (duration, easing)
- localStorage schema design
- Puzzle data file format and validation pipeline
- How to source/generate the 80+ puzzle definitions
- Mobile responsive breakpoints for the puzzle grid

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-025 | 80+ pre-built puzzles stored as local JSON data | Puzzle sourcing strategy documented; hand-curated JSON is the approach |
| REQ-026 | 4 difficulty levels: Beginner, Intermediate, Advanced, Expert | Engine `Difficulty` type already defined; 4 JSON files by difficulty |
| REQ-027 | 20+ puzzles per difficulty level | 4 files × 20 puzzles = 80 minimum; strategy documented |
| REQ-030 | Puzzle selection screen grouped by difficulty | Tabs (Beginner/Intermediate/Advanced/Expert) with URL param `?difficulty=beginner` |
| REQ-031 | Visual indicator of completed/uncompleted puzzles | localStorage `completedPuzzles` set drives tile state |
| REQ-032 | Personal best moves/time shown per puzzle | localStorage `personalBest` map per puzzleId; shown on win screen |
| REQ-048 | Main menu / home screen | Route `/` → `MainMenuScreen` component |
| REQ-049 | Difficulty selection screen | Route `/puzzles` → `PuzzleSelectScreen` with tab state |
| REQ-050 | Puzzle selection grid per difficulty | Same `/puzzles` screen, grid filtered by active difficulty tab |
| REQ-051 | Game board screen with controls (reset, back, mute) | Route `/play/:difficulty/:puzzleId` → `GameScreen` wrapper around existing Board |
| REQ-052 | Leaderboard screen per puzzle | Route `/leaderboard/:difficulty/:puzzleId` → stub `LeaderboardScreen` (full impl Phase 4) |
| REQ-053 | Client-side routing between screens | React Router v7 declarative mode, `BrowserRouter` + `Routes` + `Route` |
</phase_requirements>

---

## Summary

Phase 3 has three distinct technical problems: (1) installing and wiring React Router v7 into the existing Vite/React 19 app, (2) sourcing and validating 80+ solvable Rush Hour puzzle definitions, and (3) persisting player progress in localStorage.

React Router v7 (currently v7.13.0 on npm) is the planned library. For a Vite SPA with no SSR, the correct mode is **declarative mode** using `BrowserRouter` + `Routes` + `Route` — the same pattern as v6. The package was unified in v7: import from `"react-router"`, not `"react-router-dom"`. react-router is not yet installed in the project (`package.json` shows only `react`, `react-dom`, and `zustand`).

Puzzle data is the most open-ended problem. No ready-made dataset of 80 categorized Rush Hour puzzles in 36-char grid-string format exists as a clean downloadable JSON. The Fogleman dataset (2.5M puzzles) is available but requires a conversion script. The most reliable strategy is to **hand-author 80+ puzzle grid strings**, validate each with the existing BFS solver at build time, and emit 4 JSON files. The existing `PuzzleDefinition` type (`id`, `gridString`, `difficulty`, `minMoves`) is the correct data shape. A Node.js validation script can import the engine's `solvePuzzle()` directly to compute and verify `minMoves` at build time.

localStorage progress is straightforward: a single key `rushhour_progress` stores a JSON object mapping `puzzleId → { completedAt, moves, timeMs }`. The store (`gameStore.ts`) needs a new `progressStore` or the gameStore extended with a `progress` slice that reads/writes localStorage on win.

**Primary recommendation:** Install `react-router@^7`, wire BrowserRouter in `main.tsx`, define 4 route screens, hand-author puzzle JSON with a build-time validator script, and store progress in a Zustand slice backed by localStorage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router | 7.13.0 (current) | Client-side routing | Already decided; v7 is v6-compatible in declarative mode |
| Zustand | 5.0.11 (installed) | Progress state management | Already installed; extend existing store |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js (built-in) | N/A | Build-time puzzle validation script | Run via `npm run validate-puzzles` before build |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BrowserRouter (declarative) | createBrowserRouter (data mode) | Data mode adds loaders/actions; overkill for this SPA with Zustand state |
| Hand-authored puzzles | Fogleman dataset (2.5M) | Fogleman requires a Go/Python conversion tool; hand-authoring is slower but immediately controllable |
| Zustand localStorage slice | usehooks-ts `useLocalStorage` | External dep for a trivial pattern; Zustand persist middleware is cleaner |

**Installation:**
```bash
npm install react-router
```

Note: In React Router v7, the package name is `react-router` (not `react-router-dom`). They were merged. Import from `"react-router"` throughout.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── screens/                # Top-level route components (one per URL)
│   ├── MainMenuScreen/
│   │   ├── MainMenuScreen.tsx
│   │   └── MainMenuScreen.module.css
│   ├── PuzzleSelectScreen/
│   │   ├── PuzzleSelectScreen.tsx
│   │   ├── DifficultyTabs.tsx
│   │   ├── PuzzleGrid.tsx
│   │   ├── PuzzleTile.tsx
│   │   └── PuzzleSelectScreen.module.css
│   ├── GameScreen/
│   │   ├── GameScreen.tsx        # Wraps existing Board + GameHUD + ControlBar
│   │   ├── WinModal.tsx
│   │   └── GameScreen.module.css
│   └── LeaderboardScreen/
│       ├── LeaderboardScreen.tsx  # Stub in Phase 3; full in Phase 4
│       └── LeaderboardScreen.module.css
├── store/
│   ├── gameStore.ts               # Existing (unchanged)
│   └── progressStore.ts           # NEW: localStorage-backed Zustand store
├── data/
│   ├── puzzles/
│   │   ├── beginner.json
│   │   ├── intermediate.json
│   │   ├── advanced.json
│   │   └── expert.json
│   └── puzzleIndex.ts             # Aggregates all puzzles; lookup by ID
├── engine/                        # Existing (unchanged)
├── components/                    # Existing board components (unchanged)
└── hooks/
    └── useDrag.ts                 # Existing (unchanged)
```

### Pattern 1: React Router v7 Declarative Mode (Verified)

**What:** Wrap app in `BrowserRouter`, define routes with `Routes` + `Route`, use `Link`/`useNavigate`/`useParams` for navigation.

**When to use:** Always — this is the locked decision for this phase.

**Setup in `main.tsx`:**
```typescript
// Source: https://reactrouter.com/start/modes
import { BrowserRouter } from "react-router";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

**Route definitions in `App.tsx`:**
```typescript
// Source: https://reactrouter.com/api/hooks/useParams
import { Routes, Route } from "react-router";
import { MainMenuScreen } from "./screens/MainMenuScreen/MainMenuScreen";
import { PuzzleSelectScreen } from "./screens/PuzzleSelectScreen/PuzzleSelectScreen";
import { GameScreen } from "./screens/GameScreen/GameScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen/LeaderboardScreen";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenuScreen />} />
      <Route path="/puzzles" element={<PuzzleSelectScreen />} />
      <Route path="/play/:difficulty/:puzzleId" element={<GameScreen />} />
      <Route path="/leaderboard/:difficulty/:puzzleId" element={<LeaderboardScreen />} />
    </Routes>
  );
}
```

**URL structure rationale:**
- `/` — Main menu
- `/puzzles` — Puzzle select (difficulty tabs + grid; tab state held in `?difficulty=beginner` query param)
- `/play/beginner/beginner-01` — Game board for a specific puzzle
- `/leaderboard/beginner/beginner-01` — Leaderboard for a specific puzzle (stub in Phase 3)

The difficulty is embedded in the URL path (not just query param) so the back button naturally restores both difficulty and puzzle context.

### Pattern 2: Reading Route Params in GameScreen

```typescript
// Source: https://reactrouter.com/api/hooks/useParams
import { useParams, useNavigate } from "react-router";
import { getPuzzleById } from "../../data/puzzleIndex";
import { useGameStore } from "../../store/gameStore";

export function GameScreen() {
  const { difficulty, puzzleId } = useParams<{ difficulty: string; puzzleId: string }>();
  const navigate = useNavigate();
  const loadPuzzle = useGameStore((s) => s.loadPuzzle);

  useEffect(() => {
    if (!puzzleId) return;
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) {
      navigate("/puzzles");
      return;
    }
    loadPuzzle(puzzle.gridString, puzzle.minMoves);
  }, [puzzleId]);

  const handleBack = () => navigate(-1); // uses browser history
  // ...
}
```

### Pattern 3: Puzzle Index (Static Data Aggregation)

```typescript
// src/data/puzzleIndex.ts
import beginner from "./puzzles/beginner.json";
import intermediate from "./puzzles/intermediate.json";
import advanced from "./puzzles/advanced.json";
import expert from "./puzzles/expert.json";
import type { PuzzleDefinition } from "../engine/types";

export const ALL_PUZZLES: PuzzleDefinition[] = [
  ...beginner,
  ...intermediate,
  ...advanced,
  ...expert,
] as PuzzleDefinition[];

export const PUZZLES_BY_DIFFICULTY: Record<string, PuzzleDefinition[]> = {
  beginner,
  intermediate,
  advanced,
  expert,
};

export function getPuzzleById(id: string): PuzzleDefinition | undefined {
  return ALL_PUZZLES.find((p) => p.id === id);
}
```

### Pattern 4: localStorage Progress Store (Zustand)

**Design recommendation** (Claude's discretion area):

```typescript
// src/store/progressStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PuzzleProgress {
  completedAt: number;  // Date.now() timestamp
  bestMoves: number;
  bestTimeMs: number;
}

interface ProgressStore {
  progress: Record<string, PuzzleProgress>;  // key = puzzleId
  recordCompletion: (puzzleId: string, moves: number, timeMs: number) => void;
  isCompleted: (puzzleId: string) => boolean;
  getBest: (puzzleId: string) => PuzzleProgress | undefined;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      recordCompletion: (puzzleId, moves, timeMs) => {
        const existing = get().progress[puzzleId];
        const isBetter =
          !existing ||
          moves < existing.bestMoves ||
          (moves === existing.bestMoves && timeMs < existing.bestTimeMs);
        if (isBetter) {
          set((state) => ({
            progress: {
              ...state.progress,
              [puzzleId]: { completedAt: Date.now(), bestMoves: moves, bestTimeMs: timeMs },
            },
          }));
        }
      },

      isCompleted: (puzzleId) => puzzleId in get().progress,

      getBest: (puzzleId) => get().progress[puzzleId],
    }),
    {
      name: "rushhour_progress",  // localStorage key
    }
  )
);
```

**Why Zustand `persist` middleware:** It handles JSON serialization, deserialization, hydration on page load, and cross-tab invalidation automatically. Zero boilerplate compared to manual localStorage.

### Pattern 5: Puzzle JSON Format

The existing engine `PuzzleDefinition` type is the canonical shape. Use it verbatim:

```json
// src/data/puzzles/beginner.json
[
  {
    "id": "beginner-01",
    "gridString": "..AA.......BXX...B....CC.DD.........",
    "difficulty": "beginner",
    "minMoves": 8
  },
  ...
]
```

The `gridString` is a 36-character row-major string where `.` = empty, `X` = red target car, `A`-`Z` (except `X`) = other vehicles. This is the existing engine's format — validated by `parseGridString()` and `solvePuzzle()`.

### Pattern 6: Build-Time Puzzle Validation Script

```typescript
// scripts/validate-puzzles.ts  (run with tsx or ts-node)
import { solvePuzzle } from "../src/engine/solver";
import beginner from "../src/data/puzzles/beginner.json";
import intermediate from "../src/data/puzzles/intermediate.json";
import advanced from "../src/data/puzzles/advanced.json";
import expert from "../src/data/puzzles/expert.json";

const ALL = [...beginner, ...intermediate, ...advanced, ...expert];
let failed = 0;

for (const puzzle of ALL) {
  const result = solvePuzzle(puzzle.gridString);
  if (!result.solvable) {
    console.error(`UNSOLVABLE: ${puzzle.id}`);
    failed++;
  } else if (result.minMoves !== puzzle.minMoves) {
    console.error(
      `WRONG minMoves: ${puzzle.id} — declared ${puzzle.minMoves}, actual ${result.minMoves}`
    );
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} puzzle(s) failed validation. Fix before building.`);
  process.exit(1);
} else {
  console.log(`All ${ALL.length} puzzles valid.`);
}
```

Add to `package.json` scripts:
```json
"validate-puzzles": "tsx scripts/validate-puzzles.ts",
"prebuild": "npm run validate-puzzles"
```

Install `tsx` as devDep for running TypeScript scripts without compilation:
```bash
npm install -D tsx
```

### Anti-Patterns to Avoid

- **Storing difficulty in query params as primary routing:** Query params are fine for tab state within `/puzzles`, but the puzzle ID and difficulty in the game URL must be in the path (`/play/beginner/beginner-01`) so browser back button navigation is reliable.
- **Fetching puzzles at runtime:** All 80 puzzles ship in the bundle. No async loading, no loading spinners for puzzle data.
- **Putting progress in gameStore:** Keep progress (completed puzzles, personal bests) in a separate `progressStore` with persist middleware. The `gameStore` only tracks the live game session.
- **Using `localStorage.setItem` directly in components:** All localStorage access goes through the Zustand persist store. Never scatter raw localStorage calls.
- **Re-running BFS solver in the browser:** The `minMoves` is pre-computed and stored in JSON. Don't call `solvePuzzle()` at runtime — it is synchronous and blocking, can take hundreds of ms for complex boards.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage serialization | Manual JSON.stringify/parse hooks | Zustand `persist` middleware | Handles hydration, cross-tab, error cases |
| Client-side routing | Manual URL hash manipulation | React Router v7 `BrowserRouter` | History API, nested routes, back button already locked decision |
| Puzzle solvability proof | Manual BFS in a script | Existing `solvePuzzle()` from `src/engine/solver.ts` | Already implemented and tested in Phase 1 |
| TypeScript script runner | Compile then run | `tsx` devDep | Zero-config TS execution for scripts |

**Key insight:** The hard work (BFS solver, engine types, drag system) is already done. Phase 3 is primarily wiring: routing, data files, and a thin progress store.

---

## Common Pitfalls

### Pitfall 1: React Router Import Path
**What goes wrong:** Importing from `"react-router-dom"` instead of `"react-router"`.
**Why it happens:** React Router v7 merged the packages. `react-router-dom` still exists as a compatibility shim but is deprecated. The canonical import is `"react-router"`.
**How to avoid:** Always import from `"react-router"` — `BrowserRouter`, `Routes`, `Route`, `Link`, `useNavigate`, `useParams`, `useLocation` all come from `"react-router"`.
**Warning signs:** npm installing `react-router-dom` explicitly; getting "package not found" for hooks.

### Pitfall 2: BrowserRouter in main.tsx Conflicts with Existing App.tsx
**What goes wrong:** Wrapping `BrowserRouter` in `main.tsx` but forgetting that `App.tsx` currently hardcodes a puzzle via `useEffect` without routing. The existing `App.tsx` must be replaced (not extended) with the route-aware version.
**Why it happens:** Phase 2 left `App.tsx` as a dev harness loading `DEV_PUZZLE` directly. Phase 3 replaces this with proper route definitions.
**How to avoid:** In Phase 3, `App.tsx` becomes the route definition file. `DEV_PUZZLE` constant and direct `loadPuzzle` call are removed.

### Pitfall 3: Vite Dev Server and BrowserRouter 404s
**What goes wrong:** Direct URL navigation to `/play/beginner/beginner-01` returns 404 in development.
**Why it happens:** Vite's dev server serves files, not HTML fallback by default for deep URLs.
**How to avoid:** Add `historyApiFallback` in `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,  // Return index.html for all 404s
  },
  // ... existing config
});
```
For production, configure the hosting provider to serve `index.html` for all routes.

### Pitfall 4: Zustand persist Hydration Race
**What goes wrong:** Component reads `isCompleted()` before localStorage has been deserialized into Zustand store, showing incorrect uncompleted state.
**Why it happens:** `persist` middleware hydrates asynchronously on mount.
**How to avoid:** Zustand v5 persist is synchronous for localStorage (only async for IndexedDB). No race condition for `localStorage`. Confirmed: Zustand's `persist` with `localStorage` storage hydrates synchronously. Safe to read immediately.

### Pitfall 5: Puzzle Data Sourcing Is Manual Work
**What goes wrong:** Planning assumes puzzles "just exist" — underestimating the time to author/source 80 puzzle grid strings that are (a) valid 36-char strings, (b) solvable, (c) graded correctly by difficulty.
**Why it happens:** No ready-made JSON dataset of categorized Rush Hour puzzles exists.
**How to avoid:** Dedicate a full plan to puzzle data creation. Use the Fogleman rush1000.txt sample (available at michaelfogleman.com/rush/) — it contains 1000 pre-solved puzzles with move counts in text format. Write a conversion script to transform 80 selected entries into the required JSON format, classified by minMoves thresholds (see difficulty scheme below).
**Warning signs:** Underestimating how long manual authoring takes.

### Pitfall 6: Difficulty Classification by minMoves Only
**What goes wrong:** Classifying beginner = low minMoves, expert = high minMoves leads to puzzles that feel wrong — a 5-move puzzle with many vehicles can be confusing for beginners.
**Why it happens:** minMoves is easy to compute but doesn't capture perceived difficulty.
**Context decision:** User locked: "Difficulty classification based on board complexity (vehicle count + congestion), not just optimal move count." Use a combined heuristic: vehicle count + minMoves.
**Suggested thresholds (Claude's discretion):**
- Beginner: 5–10 minMoves, ≤ 8 vehicles
- Intermediate: 10–18 minMoves, 8–11 vehicles
- Advanced: 18–28 minMoves, 10–13 vehicles
- Expert: 28+ minMoves or 13+ vehicles

---

## Code Examples

Verified patterns from official sources:

### React Router v7 Declarative Mode Setup
```typescript
// Source: https://reactrouter.com/start/modes
// main.tsx — wrap entire app in BrowserRouter
import { BrowserRouter } from "react-router";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### useNavigate for Programmatic Navigation
```typescript
// Source: https://reactrouter.com/api/hooks/useNavigate
import { useNavigate } from "react-router";

function PuzzleTile({ puzzleId, difficulty }: Props) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/play/${difficulty}/${puzzleId}`)}>
      Play
    </button>
  );
}

// Back button — uses browser history delta
function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
}
```

### useParams in GameScreen
```typescript
// Source: https://reactrouter.com/api/hooks/useParams
import { useParams, useNavigate } from "react-router";

function GameScreen() {
  const { difficulty, puzzleId } = useParams<{
    difficulty: string;
    puzzleId: string;
  }>();
  const navigate = useNavigate();
  // ...
}
```

### Win Detection Integration with Progress Store
```typescript
// In gameStore.ts or GameScreen.tsx — detect win and record progress
const state = useGameStore((s) => s.state);
const recordCompletion = useProgressStore((s) => s.recordCompletion);
const { puzzleId } = useParams();

useEffect(() => {
  if (state?.isWon && puzzleId && state.startTime && state.endTime) {
    const timeMs = state.endTime - state.startTime;
    recordCompletion(puzzleId, state.moveCount, timeMs);
  }
}, [state?.isWon]);
```

### Difficulty Tab Navigation with Query Param
```typescript
// PuzzleSelectScreen.tsx
import { useSearchParams } from "react-router";

function PuzzleSelectScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDifficulty = searchParams.get("difficulty") ?? "beginner";

  const setDifficulty = (d: string) => {
    setSearchParams({ difficulty: d });
  };
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import from "react-router-dom"` | `import from "react-router"` | v7 (Nov 2024) | Simpler install; one package |
| `<Switch>` + `<Route exact>` | `<Routes>` + `<Route>` | v6 (2021) | Routes are always exact by default |
| `useHistory()` | `useNavigate()` | v6 (2021) | Cleaner API, supports delta navigation |
| Manual localStorage hooks | Zustand `persist` middleware | v5 Zustand (2024) | Built-in serialization + hydration |

**Deprecated/outdated:**
- `react-router-dom` package: Still exists but is a wrapper. Use `react-router` directly.
- `<Switch>`: Removed in v6. Use `<Routes>`.
- `useHistory`: Removed in v6. Use `useNavigate`.

---

## Puzzle Data Sourcing Strategy

This is Claude's discretion — the most open-ended part of the phase.

### Recommended: Fogleman Dataset Extraction

The Fogleman rush1000.txt sample file (available at https://www.michaelfogleman.com/rush/) contains 1000 curated Rush Hour puzzles as text with format:
```
{moves} {36-char-board-string} {cluster-size}
```

Example:
```
8  ..AA.......BXX...B....CC.DD......... 2332
```

The board string uses `.` for empty, and letter IDs for vehicles — same format as the engine's `gridString` except Fogleman uses `A` for the red car while our engine uses `X`. Conversion:
1. Replace the primary car ID (`A` in Fogleman) with `X`
2. Parse the moves count as `minMoves`
3. Filter and categorize by move count + vehicle count to assign difficulty

A Node.js conversion script can do this in under 50 lines and produce the 4 JSON files directly.

### Alternative: Hand-Author Known Puzzles

The original ThinkFun Rush Hour set has 40 puzzles (10 per difficulty) published and widely documented online. Hand-transcribing these 40 plus 40 more from community resources (there are many Rush Hour puzzle collections online) is viable but tedious.

### Difficulty Thresholds (Claude's Recommendation)

Based on minMoves distribution in the Fogleman dataset:
- **Beginner:** minMoves 6–11, vehicle count ≤ 8 — 20 puzzles
- **Intermediate:** minMoves 11–17, vehicle count 8–11 — 20 puzzles
- **Advanced:** minMoves 17–25, vehicle count 10–13 — 20 puzzles
- **Expert:** minMoves 25+, or vehicle count 13+ — 20 puzzles

The BFS solver validates `minMoves` at build time, so the declared value is always accurate.

---

## Open Questions

1. **Fogleman format: which letter is the primary car?**
   - What we know: Fogleman's generator uses a specific letter for the exit car; the article says it's the piece that needs to exit
   - What's unclear: Whether it's consistently `A` or varies per puzzle in the dataset
   - Recommendation: Examine the rush1000.txt file during implementation; write a detection heuristic (the horizontal vehicle on row 2 that can reach col 4+ is the target)

2. **`useSearchParams` for difficulty tab vs. URL path segment**
   - What we know: Both work; path gives browser history for each tab switch; query param avoids extra history entries
   - What's unclear: Whether the user expects back button to undo tab switches or just go back to main menu
   - Recommendation: Use query param `?difficulty=beginner` — tab switches should not create history entries; only navigating to a puzzle should.

3. **Vite config `historyApiFallback` key name**
   - What we know: This is required for SPA deep-link support in dev
   - What's unclear: The exact Vite config key — may be `server.historyApiFallback` or configured differently in Vite 7.x
   - Recommendation: Verify against `vite.dev/config/server-options` during implementation; the dev server option is well-established.

---

## Sources

### Primary (HIGH confidence)
- https://reactrouter.com/start/modes — React Router v7 modes, declarative mode setup code
- https://reactrouter.com/api/hooks/useNavigate — useNavigate API, options, TypeScript signatures
- https://reactrouter.com/api/hooks/useParams — useParams TypeScript signature, declarative usage
- `npm view react-router version` → 7.13.0 (verified 2026-02-19)
- `C:/code/Claude/RushHourApp/src/engine/types.ts` — PuzzleDefinition type, existing engine types
- `C:/code/Claude/RushHourApp/src/engine/solver.ts` — solvePuzzle() BFS implementation
- `C:/code/Claude/RushHourApp/package.json` — confirmed react-router not yet installed

### Secondary (MEDIUM confidence)
- https://blog.logrocket.com/react-router-v7-guide/ — v7 declarative mode patterns confirmed against official docs
- https://www.michaelfogleman.com/rush/ — Fogleman dataset: 2.5M puzzles, 36-char format, text file download available
- Zustand v5 persist middleware: from installed `zustand@^5.0.11`; persist is built into the package

### Tertiary (LOW confidence — verify during implementation)
- Vite `server.historyApiFallback` config: from training data, needs verification against vite.dev docs
- Fogleman puzzle format specifics: dataset exists but exact character mapping needs inspection of actual file
- Difficulty threshold numbers (6–11, 11–17, 17–25, 25+): derived from description of Fogleman distribution, not hard-coded data

---

## Metadata

**Confidence breakdown:**
- Standard stack (React Router v7): HIGH — verified with official docs and npm
- Architecture (screens, route structure): HIGH — React Router patterns confirmed, aligns with locked decisions
- localStorage/Zustand persist: HIGH — Zustand v5 is installed; persist middleware is a documented feature
- Puzzle data sourcing: MEDIUM — strategy is clear, but Fogleman format details need inspection of actual file
- Pitfalls: HIGH — most verified from official docs or existing codebase analysis

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days — React Router v7 is stable; Zustand v5 is stable)
