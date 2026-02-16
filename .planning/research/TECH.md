# Technology Stack Research

**Project:** Rush Hour Puzzle Game
**Researched:** 2026-02-16
**Overall Confidence:** MEDIUM (web verification tools unavailable; recommendations based on training data through May 2025 -- verify versions with `npm view <pkg> version` before installing)

---

## Recommended Stack

### Build Tool & React Setup

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | ^6.x | Build tool + dev server | Fastest DX for SPAs. HMR in <50ms. No SSR overhead needed for a puzzle game. |
| React | ^19.x | UI framework | Project requirement. v19 stable since Dec 2024. |
| TypeScript | ^5.6 | Type safety | Puzzle state, grid coords, and Firebase types benefit enormously from static typing. |

**Why Vite over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **Vite** | **USE THIS** | Zero-config React SPA. Blazing fast HMR. Tiny bundle output with Rollup. Perfect for a client-heavy game with no SEO needs. |
| Next.js | Overkill | SSR/SSG adds complexity with zero benefit. Rush Hour is a pure client-side game. No SEO for puzzle boards. App Router overhead is wasted. |
| Create React App | Dead | Officially deprecated. No longer maintained. Do not use. |
| Remix | Wrong fit | Server-centric framework. Rush Hour is client-heavy with Firebase as BaaS. |

**Scaffolding command:**
```bash
npm create vite@latest rush-hour-app -- --template react-ts
```

Confidence: HIGH -- Vite dominance for SPAs is well-established and uncontested.

---

### Firebase

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| firebase | ^11.x | Auth + Firestore SDK | Modular/tree-shakeable SDK. Only import what you use. |

**Key Firebase modules needed:**

```typescript
// firebase/app -- core init
// firebase/auth -- Google/email sign-in
// firebase/firestore -- puzzle scores, leaderboards
```

**Firebase Auth strategy:**
- Use `signInWithPopup` with GoogleAuthProvider for primary auth (lowest friction for a casual game)
- Add `signInAnonymously` as fallback so players can try puzzles before committing to an account
- Use `linkWithPopup` to upgrade anonymous accounts to permanent ones
- This pattern maximizes engagement: play first, sign up when leaderboard motivates them

**Firestore data model recommendation:**

```
/puzzles/{puzzleId}
  - difficulty: "beginner" | "intermediate" | "advanced" | "expert"
  - layout: Vehicle[]  // initial board state
  - minMoves: number   // known optimal solution length

/scores/{scoreId}
  - puzzleId: string
  - userId: string
  - displayName: string
  - moves: number
  - timeSeconds: number
  - completedAt: Timestamp

/users/{userId}
  - displayName: string
  - puzzlesCompleted: number
  - joinedAt: Timestamp
```

**Firestore indexing for leaderboards:**
- Composite index on `scores`: `puzzleId ASC, moves ASC, timeSeconds ASC` -- this powers the "best scores per puzzle" leaderboard query
- Query pattern: `where("puzzleId", "==", id).orderBy("moves").orderBy("timeSeconds").limit(50)`

**Firebase Security Rules (critical):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Puzzles: read-only for all authenticated users
    match /puzzles/{puzzleId} {
      allow read: if request.auth != null;
      allow write: if false; // admin-only, use Firebase console or admin SDK
    }
    // Scores: authenticated users can create their own, anyone can read
    match /scores/{scoreId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.moves is int
                    && request.resource.data.moves > 0;
      allow update, delete: if false; // scores are immutable
    }
    // Users: owner can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

Confidence: HIGH -- Firebase modular SDK patterns are stable and well-documented.

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x | Game state management | Tiny (~1KB), no boilerplate, perfect for game state. |

**Why Zustand over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **Zustand** | **USE THIS** | Minimal API. No providers/wrappers. Subscriptions are selective (only re-render what changed). Perfect for frequent game state updates (car positions). |
| React Context | Too slow | Context re-renders ALL consumers on ANY change. During drag operations, this means the entire board re-renders on every pointer move. Unacceptable for 60fps drag. |
| Redux Toolkit | Overkill | Boilerplate-heavy for a game with simple state. Rush Hour state is just an array of vehicle positions + UI flags. |
| Jotai | Viable alternative | Atomic model works well but Zustand's single-store pattern maps more naturally to "game state as one object." |
| useReducer | Lacks selectors | No built-in subscription optimization. Same re-render problem as Context for drag. |

**Recommended store shape:**

```typescript
interface GameStore {
  // Puzzle state
  puzzleId: string | null;
  vehicles: Vehicle[];
  moveCount: number;
  startTime: number | null;
  isComplete: boolean;

  // UI state
  selectedVehicleId: string | null;
  isDragging: boolean;

  // Actions
  loadPuzzle: (puzzleId: string) => void;
  moveVehicle: (vehicleId: string, newPosition: number) => void;
  resetPuzzle: () => void;
  checkWinCondition: () => void;
}

interface Vehicle {
  id: string;
  type: "car" | "truck";          // car = 2 cells, truck = 3 cells
  orientation: "horizontal" | "vertical";
  row: number;                     // 0-5
  col: number;                     // 0-5
  isTarget: boolean;               // true for the red car
  color: string;                   // CSS color
}
```

**Why selective subscriptions matter here:**
```typescript
// Only re-renders when THIS vehicle's data changes
const vehicle = useGameStore(
  (state) => state.vehicles.find(v => v.id === vehicleId)
);
```

During a drag operation, only the dragged vehicle's component re-renders. All other vehicles stay frozen. This is the key performance advantage over Context.

Confidence: HIGH -- Zustand is the standard lightweight state solution for React.

---

### Drag & Drop / Interaction

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom pointer events | N/A (built-in) | Vehicle dragging | Rush Hour has constrained single-axis drag. Libraries add overhead for features we do not need. |

**Why custom pointer events over libraries:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **Custom pointer events** | **USE THIS** | Rush Hour drag is constrained to ONE axis per vehicle. No sorting, no drop zones, no cross-container DnD. Custom code is ~60 lines and gives total control. |
| react-dnd | Wrong abstraction | Designed for drag-and-drop between containers (kanban boards, file uploads). Rush Hour needs constrained sliding along a rail. react-dnd fights this. |
| @dnd-kit/core | Closer but still overkill | Better API than react-dnd, has `restrictToHorizontalAxis` / `restrictToVerticalAxis` modifiers. But still ~15KB for something achievable in 60 lines. |
| framer-motion `drag` | Viable alternative | `drag="x"` or `drag="y"` constraint works well. Adds spring physics for free. But at ~30KB it is heavy for this single use case. Consider if you want polish animations elsewhere too. |

**Recommended implementation pattern:**

```typescript
function useVehicleDrag(vehicle: Vehicle) {
  const moveVehicle = useGameStore(s => s.moveVehicle);
  const vehicles = useGameStore(s => s.vehicles);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    // Record start position
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    // Convert pixel delta to grid cells
    // Clamp to valid range (0-5 minus vehicle length, collision check)
    // Only allow movement along vehicle's orientation axis
    // Update store with new position
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    // Snap to nearest grid cell
    // Check win condition
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
```

**Critical details for the drag system:**
1. Use `setPointerCapture` -- this ensures drag continues even if pointer leaves the element (critical for fast swipes)
2. Snap to grid on pointer up, not during drag (smoother feel)
3. Collision detection: check against all other vehicles on every move to prevent overlap
4. The red (target) car exits when it reaches column 4 (right edge, assuming 2-cell car exiting row 2)

**Touch support:** Pointer events handle mouse + touch + pen natively. No need for separate touch event handlers.

Confidence: HIGH -- Pointer events API is stable and well-supported across all modern browsers.

---

### Visual Rendering (CSS/SVG Cars)

**Recommendation: CSS with `position: absolute` on a grid container.**

| Approach | Verdict | Reason |
|----------|---------|--------|
| **CSS absolute positioning** | **USE THIS** | Cars are colored rectangles with rounded corners. CSS handles this trivially. Absolute positioning within a relative container allows pixel-precise placement during drag. |
| SVG | Viable for static | Good for complex car shapes (wheels, windows). But SVG transform during drag is less smooth than CSS transform. Mixing SVG inside a CSS layout grid adds unnecessary complexity. |
| Canvas | Wrong tool | Overkill. No DOM events on individual cars (need hit testing). Accessibility is harder. React integration is awkward. |
| CSS Grid for the board | Partial use | Use CSS Grid for the 6x6 board background/cells, but cars should be absolutely positioned ON TOP of the grid so they can animate smoothly between cells. |

**Recommended visual architecture:**

```
<div className="board">           // position: relative; aspect-ratio: 1;
  <div className="grid-bg">       // 6x6 CSS grid for cell backgrounds
    {36 cells}
  </div>
  <div className="vehicles">      // position: absolute; inset: 0;
    {vehicles.map(v =>
      <Vehicle key={v.id} />      // position: absolute; transform: translate()
    )}
  </div>
  <div className="exit-marker" /> // visual indicator for the exit on row 2, right side
</div>
```

**Car styling approach:**

```css
.vehicle {
  position: absolute;
  border-radius: 8px;
  transition: transform 0.15s ease-out; /* snap animation, disabled during drag */
  cursor: grab;
  user-select: none;
  touch-action: none; /* CRITICAL: prevents browser scroll during drag */
}

.vehicle--car {
  /* 2 cells wide or tall */
}

.vehicle--truck {
  /* 3 cells wide or tall */
}

.vehicle--target {
  background: #e53935; /* distinctive red */
  box-shadow: 0 2px 8px rgba(229, 57, 53, 0.4);
}

.vehicle--dragging {
  transition: none; /* disable snap animation during active drag */
  z-index: 10;
  cursor: grabbing;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
```

**Adding car character with CSS (no images needed):**
- Rounded rectangles with gradient backgrounds for 3D feel
- CSS `::before` / `::after` pseudo-elements for windows and wheels
- Different hue per vehicle using CSS custom properties: `style={{ '--car-hue': vehicle.hue }}`
- Subtle inner shadow for depth

**Color palette recommendation (12 distinct vehicle colors):**
```typescript
const VEHICLE_COLORS = [
  '#e53935', // red (TARGET -- always this one)
  '#1e88e5', // blue
  '#43a047', // green
  '#fb8c00', // orange
  '#8e24aa', // purple
  '#00acc1', // cyan
  '#fdd835', // yellow
  '#6d4c41', // brown
  '#546e7a', // slate
  '#d81b60', // pink
  '#c0ca33', // lime
  '#5e35b1', // deep purple
];
```

Confidence: HIGH -- CSS positioning and transforms are the standard approach for grid-based puzzle games.

---

### Sound Effects

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Howler.js | ^2.2 | Sound effect playback | Solves Web Audio API quirks (autoplay restrictions, format fallbacks, sprite sheets). ~7KB gzipped. |

**Why Howler.js over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **Howler.js** | **USE THIS** | Battle-tested. Handles iOS Safari autoplay unlock automatically. Audio sprite support (pack all sounds into one file). Tiny footprint. |
| Raw Web Audio API | Too many edge cases | Autoplay policy handling, audio context resume, format detection, mobile quirks -- you end up reimplementing Howler. |
| Tone.js | Wrong tool | Full synthesizer/music library. Massive overkill for 3 sound effects. |
| use-sound (React hook) | Wrapper around Howler | Adds React integration but the abstraction is thin and sometimes stale. Just use Howler directly. |

**Sound implementation pattern:**

```typescript
import { Howl } from 'howler';

// Audio sprite: one file, multiple sounds
const gameSounds = new Howl({
  src: ['/sounds/game-sprites.webm', '/sounds/game-sprites.mp3'],
  sprite: {
    slide:    [0, 200],      // 0-200ms: short slide click
    drop:     [300, 150],    // 300-450ms: snap into place
    win:      [600, 2000],   // 600-2600ms: victory fanfare
    levelStart: [3000, 800], // 3000-3800ms: level start chime
  }
});

// Usage
gameSounds.play('slide');
gameSounds.play('win');
```

**Audio sprite advantages:**
- Single HTTP request for all sounds
- No loading delay between sounds
- Smaller total file size than separate files

**Sound design recommendations:**
- **slide**: Short, satisfying "thunk" or wooden slide (100-200ms)
- **drop/snap**: Subtle click when vehicle snaps to grid cell (100-150ms)
- **win**: Upbeat chime or fanfare, not too long (1-2 seconds)
- **levelStart**: Brief ascending tone (500-800ms)

**Autoplay policy handling:**
```typescript
// Howler handles this internally, but for explicit control:
function unlockAudio() {
  if (Howler.ctx?.state === 'suspended') {
    Howler.ctx.resume();
  }
}
// Call on first user interaction (Howler does this automatically in most cases)
```

**Volume control:**
```typescript
// Global mute toggle -- store in Zustand + localStorage
const useSoundStore = create<SoundStore>((set) => ({
  muted: localStorage.getItem('muted') === 'true',
  toggleMute: () => set((s) => {
    const muted = !s.muted;
    Howler.mute(muted);
    localStorage.setItem('muted', String(muted));
    return { muted };
  }),
}));
```

Confidence: MEDIUM -- Howler.js was dominant as of May 2025. Verify it is still maintained and no superior alternative has emerged.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | ^7.x | Client-side routing | Route between menu, puzzle select, game board, leaderboard |
| clsx | ^2.x | Conditional CSS class names | Cleaner than template literal class toggling |
| react-hot-toast | ^2.x | Toast notifications | "New high score!", "Puzzle complete!", error messages |

**Libraries explicitly NOT needed:**

| Library | Why Not |
|---------|---------|
| Tailwind CSS | The game has ~10 core components. A small CSS module file per component is simpler and more readable than utility classes for a game UI. Standard CSS (or CSS Modules) is the right call here. |
| Axios | Firebase SDK handles its own HTTP. For the rare non-Firebase fetch, native `fetch()` suffices. |
| React Query / TanStack Query | Firebase Firestore has its own real-time subscription model (`onSnapshot`). Adding another caching layer creates confusion about source of truth. |
| Formik / React Hook Form | The only "form" is sign-in, which Firebase UI handles. |
| i18n libraries | English-only game. Add later if internationalization becomes a goal. |

---

### CSS Strategy

**Recommendation: CSS Modules (built into Vite, zero config)**

| Approach | Verdict | Reason |
|----------|---------|--------|
| **CSS Modules** | **USE THIS** | Scoped by default. No runtime cost. Vite supports `.module.css` out of the box. Co-locate styles with components. |
| Tailwind | Not ideal | Game UI is custom/visual, not "utility-class friendly." Car shapes, grid overlays, and drag animations are better expressed as dedicated CSS. |
| styled-components | Unnecessary | Runtime CSS-in-JS adds overhead. Game performance matters during drag. |
| Vanilla CSS (global) | Fragile | Name collisions as project grows. CSS Modules solves this for free. |

**CSS custom properties for theming:**
```css
:root {
  --cell-size: min(60px, calc((100vw - 2rem) / 6));
  --board-size: calc(var(--cell-size) * 6);
  --board-bg: #5d4037;
  --cell-bg: #795548;
  --cell-gap: 2px;
  --vehicle-radius: 8px;
}
```

Using `--cell-size` as a CSS custom property means the entire board scales responsively, and vehicle positioning just multiplies `--cell-size` by grid coordinates.

---

## Full Installation Plan

```bash
# Scaffold
npm create vite@latest rush-hour-app -- --template react-ts
cd rush-hour-app

# Core dependencies
npm install firebase zustand react-router-dom howler clsx react-hot-toast

# Type definitions (howler does not ship its own)
npm install -D @types/howler

# Dev tooling (Vite includes ESBuild; add linting)
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
```

**NOTE:** Run `npm view <package> version` for each package before installing to confirm latest major versions. The versions listed in this document are based on training data through May 2025 and should be verified.

---

## Architecture Implications

### Component Tree (recommended)

```
App
  AuthProvider (Firebase auth listener)
  Router
    MainMenu
    DifficultySelect
    PuzzleSelect
    GameBoard
      Board (grid background + exit marker)
      VehicleLayer
        Vehicle (x N, absolutely positioned, drag handlers)
      MoveCounter
      Timer
      Controls (reset, back, mute)
    Leaderboard
    Profile
```

### Key Performance Considerations

1. **Drag at 60fps**: Use CSS `transform: translate(Xpx, Ypx)` -- never `top`/`left` (avoids layout thrashing).
2. **Zustand selectors**: Each `<Vehicle>` subscribes only to its own data. Dragging one car must not re-render others.
3. **CSS `will-change: transform`**: Add to vehicles during drag, remove after drop (hints to browser for GPU compositing).
4. **`touch-action: none`**: On the board container. Prevents browser scroll/zoom during vehicle drag on mobile.

### Bundle Size Estimate

| Package | Gzipped Size | Notes |
|---------|-------------|-------|
| React + ReactDOM | ~40KB | Fixed cost |
| Firebase (auth + firestore) | ~50-70KB | Tree-shaken modular imports |
| Zustand | ~1KB | Negligible |
| Howler.js | ~7KB | Negligible |
| react-router-dom | ~12KB | |
| App code + CSS | ~20-30KB | Estimate |
| **Total** | **~130-160KB** | Very light for a web app |

---

## Alternatives Considered (Detailed)

### "What about a game engine like Phaser or PixiJS?"

**Do not use.** Rush Hour is a grid-based puzzle, not an action game. The entire rendering is colored rectangles sliding on a grid. Phaser/PixiJS add 200-500KB for canvas rendering, their own event system, their own game loop -- all of which fight against React's declarative model. CSS transforms on DOM elements are more than sufficient and give you native accessibility, simpler debugging (inspect element), and React's component model for free.

### "What about storing puzzles in Firestore instead of locally?"

**Store puzzles as local JSON files, not Firestore.** Puzzles are static data (they never change after creation). Loading them from Firestore adds latency, costs reads, and creates an unnecessary network dependency. Ship a `puzzles.json` file in the bundle. Only dynamic data (scores, user profiles) belongs in Firestore.

```typescript
// src/data/puzzles.ts
export const PUZZLES: Record<string, Puzzle[]> = {
  beginner: [...],
  intermediate: [...],
  advanced: [...],
  expert: [...]
};
```

At ~200 bytes per puzzle, 80 puzzles = ~16KB uncompressed. Trivial.

### "What about Firebase Realtime Database instead of Firestore?"

**Use Firestore.** Realtime Database is the older product. Firestore has better querying (needed for leaderboard ORDER BY), offline support, and scales better. Realtime Database's advantage is lower latency for real-time sync, which is irrelevant for a single-player puzzle game.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Firebase free tier limits | LOW | Spark plan allows 50K reads/day, 20K writes/day. Generous for a puzzle game. Monitor usage. |
| Drag jank on low-end mobile | MEDIUM | Use `transform` only, `will-change` hint, debounce collision detection to animation frames via `requestAnimationFrame`. |
| Howler.js maintenance | LOW | If unmaintained, the Web Audio API fallback is straightforward for 3-4 sound effects. |
| Firestore leaderboard at scale | LOW | Composite indexes handle thousands of scores easily. If millions, consider Cloud Functions to maintain a "top 50" denormalized document. |
| Version staleness in this doc | MEDIUM | This research uses May 2025 training data. Run `npm view <pkg> version` for all packages before installing. |

---

## Sources & Confidence

| Claim | Source | Confidence |
|-------|--------|------------|
| Vite is the standard React SPA build tool | Training data (widely established by 2024) | HIGH |
| CRA is deprecated | Official React docs, widely reported 2023+ | HIGH |
| Firebase modular SDK (v10+) tree-shakes | Firebase official docs | HIGH |
| Zustand ~1KB, selector-based subscriptions | Zustand GitHub, npm | HIGH |
| Pointer events handle touch+mouse natively | W3C spec, MDN | HIGH |
| Howler.js handles autoplay policy | Howler.js docs | MEDIUM (verify current version) |
| CSS transform avoids layout thrashing | Browser rendering fundamentals | HIGH |
| React 19 stable | React blog Dec 2024 | HIGH |
| Specific version numbers (Vite 6, Zustand 5, etc.) | Training data | LOW (verify with npm) |
