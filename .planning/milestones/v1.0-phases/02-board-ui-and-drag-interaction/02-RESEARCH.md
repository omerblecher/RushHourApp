# Phase 2: Board UI and Drag Interaction - Research

**Researched:** 2026-02-17
**Domain:** React 19 + CSS Modules + Pointer Events drag system + CSS layout
**Confidence:** HIGH

## Summary

Phase 2 builds the full visual and interactive game board on top of the Phase 1 engine. The stack is already decided: Vite + React 19 + TypeScript + Zustand 5 + CSS Modules. None of these libraries are installed yet — the current project only has `typescript` and `vitest`. This phase will scaffold the entire front-end infrastructure from scratch.

The core technical challenge is a custom pointer-event drag system that constrains movement to one axis, does real-time collision checking against the engine, and snaps to grid on release at 60fps. The key performance insight is that React state must NOT be updated during active dragging. CSS transforms must be applied directly to DOM refs via `element.style.transform` in the pointermove handler, bypassing React's render cycle entirely. React state is updated only on pointerup (snap commit) and when the GameEngine confirms a valid move.

The visual design requires CSS-only vehicle details (no image assets). The `::before` and `::after` pseudo-elements on vehicle divs will handle windows and headlights. Absolute positioning places vehicles on the board using percentage calculations from grid col/row indices. The board container uses `aspect-ratio: 1 / 1` with `width: min(90vw, 90vh, 480px)` for responsive square behavior from 320px upward.

**Primary recommendation:** Build the drag hook as a pure imperative DOM-mutation hook (refs only, no setState during drag), wrap the GameEngine in a Zustand store, and compose the board from small focused components — BoardGrid, VehicleChip, GameHUD, ControlBar.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Board visual style
- Playful and colorful theme — bright colors, rounded shapes, fun board-game vibe
- Distinct cell tiles for the grid — each cell is a visible tile/square with slight borders or alternating shades
- Exit marker as a gap/cutout in the board border on the right side of row 3 — like the physical Rush Hour game
- Subtle pattern or texture behind the grid (dots, crosshatch, or similar) — not a plain solid color

#### Vehicle design
- Rainbow palette — each vehicle a different bright color (red, blue, green, yellow, purple, orange, etc.)
- Cars (2-cell) and trucks (3-cell) have visually different details — cars get windows/headlights, trucks get cargo/panel details, toy-like distinction
- Red target car gets special styling — extra flair (star, glow, or unique shape) to draw attention beyond just being red
- Very rounded, 3D-ish shapes — pill-shaped with shadows and gradients, like physical toy pieces

#### Drag feel & feedback
- Lift + shadow on drag — vehicle scales slightly larger with a drop shadow, feels like picking up a game piece
- Smooth animated snap on release — vehicle glides to nearest valid grid cell with a quick ease-out animation
- Hard stop on collision — vehicle stops at the collision boundary, cannot be dragged past another vehicle or wall
- Hover highlight — vehicle subtly highlights on hover/tap to show it's interactive before dragging

#### Game HUD layout
- Stats bar (move counter + timer) above the board — always visible like a scoreboard
- Move counter shows both current moves and optimal minimum — "Moves: 12 / 8 min" format
- Control buttons (undo, reset, back/menu) below the board — button row underneath
- Undo button included in the control row below the board alongside reset and back

### Claude's Discretion
- Exact color values for the rainbow palette
- Specific pattern/texture for the board background
- Typography and font choices
- Exact animation durations and easing curves
- Responsive breakpoint details
- Error state styling
- Loading state design

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.0.0 | UI component rendering | Project decision; createRoot API |
| react-dom | ^19.0.0 | DOM renderer for React | Required paired package |
| @vitejs/plugin-react | latest | JSX transform, HMR, Fast Refresh | Standard Vite+React plugin |
| vite | ^6.x | Build tool and dev server | Project decision |
| zustand | ^5.0.0 | Global game state store | Project decision; React 19 compatible (v5.0.11 confirmed) |

### Supporting (dev-only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | ^19.0.0 | TypeScript types for React | Always in TS projects |
| @types/react-dom | ^19.0.0 | TypeScript types for ReactDOM | Always in TS projects |

### Not Needed — Confirmed Out of Scope
| Skipped | Why |
|---------|-----|
| dnd-kit / react-dnd | Project decision: custom Pointer Events implementation only |
| react-spring / framer-motion | CSS transitions handle snap animation; no library overhead needed |
| Sass / Less | CSS Modules plain CSS is sufficient for this scope |

### Installation

```bash
npm install react@^19.0.0 react-dom@^19.0.0 zustand@^5.0.0
npm install --save-dev @vitejs/plugin-react @types/react@^19.0.0 @types/react-dom@^19.0.0 vite
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── engine/              # Phase 1 — pure TypeScript, no changes
│   ├── types.ts
│   ├── board.ts
│   ├── engine.ts
│   ├── solver.ts
│   └── index.ts
├── store/
│   └── gameStore.ts     # Zustand store wrapping GameEngine instance
├── components/
│   ├── Board/
│   │   ├── Board.tsx        # 6x6 grid container + exit marker
│   │   ├── Board.module.css
│   │   ├── BoardCell.tsx    # Single grid cell tile
│   │   └── BoardCell.module.css
│   ├── Vehicle/
│   │   ├── Vehicle.tsx      # Draggable vehicle chip
│   │   └── Vehicle.module.css
│   ├── GameHUD/
│   │   ├── GameHUD.tsx      # Stats bar: move counter + timer
│   │   └── GameHUD.module.css
│   └── ControlBar/
│       ├── ControlBar.tsx   # Undo, reset, back buttons
│       └── ControlBar.module.css
├── hooks/
│   └── useDrag.ts           # Custom Pointer Events drag hook
├── utils/
│   └── vehicleColors.ts     # Color palette mapping (vehicle ID → CSS color)
├── App.tsx
├── App.module.css
├── main.tsx
└── index.css                # Global reset, font import
index.html
vite.config.ts
tsconfig.json
```

---

### Pattern 1: Vite + React + TypeScript Scaffold

**What:** Minimal vite.config.ts + index.html + main.tsx entry. CSS Modules work out of the box with `.module.css` suffix — no plugin needed.

**Example:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rush Hour</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Pattern 2: Zustand Store Wrapping GameEngine

**What:** Single Zustand store holds a `GameEngine` instance as a ref-stable object. State slices are plain serializable values (`GameState` snapshot) extracted by calling `engine.getState()`. Actions call engine methods then update state snapshot.

**Why:** GameEngine is a class with internal mutation. Zustand doesn't need to own the engine internals — it only needs to broadcast the result of each engine operation to trigger re-renders.

```typescript
// Source: https://zustand.docs.pmnd.rs — TypeScript pattern
// src/store/gameStore.ts
import { create } from 'zustand';
import { GameEngine, GameState, PuzzleDefinition, solvePuzzle } from '../engine/index.js';

interface GameStore {
  engine: GameEngine | null;
  state: GameState | null;
  puzzle: PuzzleDefinition | null;
  minMoves: number;
  // Actions
  loadPuzzle: (puzzle: PuzzleDefinition) => void;
  move: (vehicleId: string, newRow: number, newCol: number) => boolean;
  undo: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,
  puzzle: null,
  minMoves: 0,

  loadPuzzle: (puzzle) => {
    const engine = new GameEngine(puzzle.gridString);
    const result = solvePuzzle(puzzle.gridString);
    set({
      engine,
      state: engine.getState(),
      puzzle,
      minMoves: result.solvable ? result.minMoves : puzzle.minMoves,
    });
  },

  move: (vehicleId, newRow, newCol) => {
    const { engine } = get();
    if (!engine) return false;
    const result = engine.move(vehicleId, newRow, newCol);
    if (result.success) set({ state: result.state });
    return result.success;
  },

  undo: () => {
    const { engine } = get();
    if (!engine) return;
    const result = engine.undo();
    set({ state: result.state });
  },

  reset: () => {
    const { engine } = get();
    if (!engine) return;
    set({ state: engine.reset() });
  },
}));
```

**Selector pattern** — subscribe only to what each component needs:
```typescript
// In a component — only re-renders when moveCount changes
const moveCount = useGameStore(state => state.state?.moveCount ?? 0);

// Multiple values — use useShallow to avoid unnecessary re-renders
import { useShallow } from 'zustand/react/shallow';
const { undo, reset } = useGameStore(useShallow(s => ({ undo: s.undo, reset: s.reset })));
```

---

### Pattern 3: Responsive Square Board Layout

**What:** Board container maintains 1:1 aspect ratio, scales from 320px viewport up to desktop. Vehicles use absolute positioning with percentage offsets calculated from grid indices.

```css
/* Board.module.css */
.boardWrapper {
  /* Constrain to smaller of width/height, max 480px */
  width: min(min(90vw, 90vh), 480px);
  aspect-ratio: 1 / 1;
  position: relative;
}

.boardGrid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(6, 1fr);
  position: relative;
  /* Board border with exit gap for row 3 (top: 50%, right side) */
  border: 4px solid #5d4037;
  border-radius: 8px;
  background: /* dot pattern */
    radial-gradient(circle, #c8a96e 1px, transparent 1px);
  background-size: calc(100% / 6) calc(100% / 6);
}

/* Exit gap: punch through the right border at row 3 (index 2, zero-based) */
/* Positioned as a pseudo-element overlay at the right edge, rows 2 */
.exitMarker {
  position: absolute;
  right: -8px;  /* overlap the border */
  top: calc(2 / 6 * 100%);
  height: calc(1 / 6 * 100%);
  width: 12px;
  background: /* match page background */;
  z-index: 2;
}
```

**Vehicle positioning** — absolute within the board, sized by grid fraction:

```css
/* Vehicle.module.css */
.vehicle {
  position: absolute;
  /* top/left/width/height set via inline style from grid indices */
  border-radius: 8px;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  cursor: grab;
  touch-action: none; /* CRITICAL: prevents browser scroll hijacking */
  will-change: transform; /* applied only during active drag — see useDrag */
  user-select: none;
}

.vehicle:hover {
  filter: brightness(1.1);
  transform: scale(1.02);
}

.vehicle.dragging {
  cursor: grabbing;
  z-index: 100;
  /* CSS transition disabled during drag — applied as class BEFORE transitioning */
  transition: none;
  transform: scale(1.06);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}

/* Snap animation — re-applied after drag ends */
.vehicle.snapping {
  transition: transform 0.15s ease-out;
}
```

**Vehicle inline style** calculation from grid position:

```typescript
// In Vehicle.tsx
const cellPercent = 100 / 6; // 16.666...%

const style: React.CSSProperties = {
  top: `${vehicle.position.row * cellPercent}%`,
  left: `${vehicle.position.col * cellPercent}%`,
  width: vehicle.orientation === 'horizontal'
    ? `${vehicle.size * cellPercent}%`
    : `${cellPercent}%`,
  height: vehicle.orientation === 'vertical'
    ? `${vehicle.size * cellPercent}%`
    : `${cellPercent}%`,
  backgroundColor: vehicleColor,
};
```

---

### Pattern 4: Custom Drag Hook — useDrag

**What:** Pointer Events + useRef for zero-React-render drag updates. Three phases: down (capture), move (direct DOM mutation via transform), up (snap commit to engine).

**Key insight:** During drag, translate the vehicle element directly via `element.style.transform`. Do NOT call `setState` or Zustand setters until pointerup. This keeps pointermove at 60fps without React render overhead.

**Constraint strategy:** On pointerdown, compute the board's bounding rect. During pointermove, compute how far the vehicle has moved in grid-cell units, clamp to [0, maxCell], clamp to collision boundary from engine occupancy scan, then apply `translateX` or `translateY` only (axis-constrained).

```typescript
// src/hooks/useDrag.ts
import { useRef, useCallback } from 'react';
import { buildOccupancyGrid } from '../engine/index.js';
import type { Vehicle, GameState } from '../engine/index.js';

interface UseDragOptions {
  vehicle: Vehicle;
  getState: () => GameState;
  onDragEnd: (vehicleId: string, newRow: number, newCol: number) => void;
  boardRef: React.RefObject<HTMLDivElement>;
}

export function useDrag({ vehicle, getState, onDragEnd, boardRef }: UseDragOptions) {
  const dragState = useRef<{
    active: boolean;
    startPointerClient: number; // clientX or clientY depending on axis
    startGridPos: number;       // vehicle.position.col or .row at drag start
    cellSizePx: number;
    maxPos: number;             // maximum valid grid position (collision-clamped)
    minPos: number;             // minimum valid grid position (collision-clamped)
    currentPos: number;         // current grid position (float during drag)
  } | null>(null);

  const elementRef = useRef<HTMLDivElement>(null);

  const isHorizontal = vehicle.orientation === 'horizontal';

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const board = boardRef.current;
    const el = elementRef.current;
    if (!board || !el) return;

    e.preventDefault();
    el.setPointerCapture(e.pointerId);

    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 6; // board is always square

    // Compute collision bounds from current state
    const state = getState();
    const occ = buildOccupancyGrid(state.vehicles);
    let minPos = 0;
    let maxPos = isHorizontal
      ? 6 - vehicle.size
      : 6 - vehicle.size;

    if (isHorizontal) {
      const row = vehicle.position.row;
      // Scan left for blocker
      for (let c = vehicle.position.col - 1; c >= 0; c--) {
        if (occ[row][c] !== null && occ[row][c] !== vehicle.id) {
          minPos = c + 1;
          break;
        }
      }
      // Scan right for blocker
      for (let c = vehicle.position.col + vehicle.size; c < 6; c++) {
        if (occ[row][c] !== null && occ[row][c] !== vehicle.id) {
          maxPos = c - vehicle.size;
          break;
        }
      }
    } else {
      const col = vehicle.position.col;
      // Scan up for blocker
      for (let r = vehicle.position.row - 1; r >= 0; r--) {
        if (occ[r][col] !== null && occ[r][col] !== vehicle.id) {
          minPos = r + 1;
          break;
        }
      }
      // Scan down for blocker
      for (let r = vehicle.position.row + vehicle.size; r < 6; r++) {
        if (occ[r][col] !== null && occ[r][col] !== vehicle.id) {
          maxPos = r - vehicle.size;
          break;
        }
      }
    }

    dragState.current = {
      active: true,
      startPointerClient: isHorizontal ? e.clientX : e.clientY,
      startGridPos: isHorizontal ? vehicle.position.col : vehicle.position.row,
      cellSizePx: cellSize,
      minPos,
      maxPos,
      currentPos: isHorizontal ? vehicle.position.col : vehicle.position.row,
    };

    el.classList.add('dragging');
    // Remove CSS transitions while dragging for responsiveness
  }, [vehicle, getState, isHorizontal, boardRef]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    const el = elementRef.current;
    if (!ds?.active || !el) return;

    const delta = (isHorizontal ? e.clientX : e.clientY) - ds.startPointerClient;
    const deltaGrid = delta / ds.cellSizePx;
    const rawPos = ds.startGridPos + deltaGrid;
    const clampedPos = Math.max(ds.minPos, Math.min(ds.maxPos, rawPos));

    ds.currentPos = clampedPos;

    // Direct DOM mutation — bypasses React render cycle
    const translatePx = (clampedPos - ds.startGridPos) * ds.cellSizePx;
    if (isHorizontal) {
      el.style.transform = `translateX(${translatePx}px) scale(1.06)`;
    } else {
      el.style.transform = `translateY(${translatePx}px) scale(1.06)`;
    }
  }, [isHorizontal]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    const el = elementRef.current;
    if (!ds?.active || !el) return;

    dragState.current = null;

    // Snap to nearest integer grid position
    const snapPos = Math.round(ds.currentPos);
    const clampedSnap = Math.max(ds.minPos, Math.min(ds.maxPos, snapPos));

    // Apply snap animation class (re-enables CSS transition)
    el.classList.remove('dragging');
    el.classList.add('snapping');
    el.style.transform = ''; // Clear transform — React will re-render to new position

    // Notify store — triggers React re-render with engine's authoritative position
    const newRow = isHorizontal ? vehicle.position.row : clampedSnap;
    const newCol = isHorizontal ? clampedSnap : vehicle.position.col;
    onDragEnd(vehicle.id, newRow, newCol);

    // Remove snapping class after transition completes
    setTimeout(() => {
      el.classList.remove('snapping');
    }, 200);
  }, [vehicle, isHorizontal, onDragEnd]);

  return { elementRef, onPointerDown, onPointerMove, onPointerUp };
}
```

**CRITICAL:** The vehicle element must have `touch-action: none` in CSS to prevent mobile browsers from interpreting the drag as a scroll gesture, which would fire `pointercancel` and abort the drag.

---

### Pattern 5: CSS Vehicle Pseudo-Element Details

**What:** `::before` and `::after` add visual details (windows, headlights, cargo) without image assets. CSS Modules support pseudo-elements natively.

```css
/* Vehicle.module.css — Car (size=2) details */
.car::before {
  content: '';
  position: absolute;
  /* For horizontal car: windows */
  top: 20%;
  left: 25%;
  width: 25%;
  height: 40%;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
}

.car::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 55%;
  width: 20%;
  height: 40%;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 3px;
}

/* Truck (size=3) panel detail */
.truck::before {
  content: '';
  position: absolute;
  top: 15%;
  left: 10%;
  width: 80%;
  height: 70%;
  border: 2px solid rgba(0,0,0,0.15);
  border-radius: 4px;
}

/* Target car (X vehicle) glow */
.targetCar {
  box-shadow: 0 0 0 3px #ff0, 0 4px 8px rgba(0,0,0,0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px #ff0, 0 4px 8px rgba(0,0,0,0.3); }
  50%       { box-shadow: 0 0 0 6px #ffa500, 0 8px 16px rgba(0,0,0,0.4); }
}
```

**Vertical vehicles:** The same `::before`/`::after` positions work for vertical orientations, but you'll need to rotate the detail layout. Use a `.horizontal` / `.vertical` modifier class to swap the axis of the pseudo-element details.

---

### Pattern 6: Color Palette Assignment

**What:** Map vehicle IDs to colors. Vehicle ID 'X' is always red. Other vehicles cycle through 12+ distinct bright colors.

```typescript
// src/utils/vehicleColors.ts
export const VEHICLE_COLORS: Record<string, string> = {
  X: '#e53935', // Red — reserved for target car
};

const PALETTE = [
  '#1e88e5', // Blue
  '#43a047', // Green
  '#fb8c00', // Orange
  '#8e24aa', // Purple
  '#00acc1', // Cyan
  '#f4511e', // Deep Orange
  '#00897b', // Teal
  '#fdd835', // Yellow
  '#6d4c41', // Brown
  '#039be5', // Light Blue
  '#7cb342', // Light Green
  '#e91e63', // Pink
];

export function getVehicleColor(vehicleId: string, allVehicleIds: string[]): string {
  if (vehicleId === 'X') return VEHICLE_COLORS.X;
  const nonTargetIds = allVehicleIds.filter(id => id !== 'X').sort();
  const index = nonTargetIds.indexOf(vehicleId);
  return PALETTE[index % PALETTE.length];
}
```

---

### Pattern 7: GameHUD Move Display

**What:** Display current moves and minimum moves in "Moves: 12 / 8 min" format with elapsed timer.

```tsx
// src/components/GameHUD/GameHUD.tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import styles from './GameHUD.module.css';

export function GameHUD() {
  const moveCount = useGameStore(s => s.state?.moveCount ?? 0);
  const minMoves = useGameStore(s => s.minMoves);
  const startTime = useGameStore(s => s.state?.startTime ?? null);
  const isWon = useGameStore(s => s.state?.isWon ?? false);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || isWon) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime, isWon]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className={styles.hud}>
      <span className={styles.moves}>
        Moves: {moveCount} / {minMoves} min
      </span>
      <span className={styles.timer}>{formatTime(elapsed)}</span>
    </div>
  );
}
```

---

### Anti-Patterns to Avoid

- **setState inside pointermove:** Causes re-render every pointer move event, drops to ~20fps on mobile. Use refs + direct DOM mutation.
- **Reading `getBoundingClientRect()` in pointermove:** Triggers layout recalculation. Read it once in pointerdown and cache in dragState ref.
- **Applying `will-change: transform` statically:** Wastes GPU memory on all 10–15 vehicles at once. Add it only while dragging via a CSS class.
- **Using `top`/`left` for drag movement:** Triggers layout reflow on every frame. Use `transform: translateX/Y` only.
- **Setting `touch-action` incorrectly:** Horizontal vehicles need `touch-action: pan-y` (allow vertical scroll but capture horizontal), vertical vehicles need `touch-action: pan-x`. Or use `touch-action: none` universally and handle scroll elsewhere.
- **Position vehicles with CSS Grid placement:** Grid placement reflows the layout on position change. Use absolute positioning inside a relatively-positioned container so only the vehicle moves.
- **Forgetting `pointercancel`:** If the browser cancels the pointer (incoming call on mobile, scrolling begins), `pointercancel` fires but `pointerup` does not. Must handle `pointercancel` to clean up drag state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Axis-constrained drag with touch | Custom touch event system | Pointer Events API (`setPointerCapture`) | Unified mouse+touch+pen, built into browser, automatic capture |
| Snap animation on release | requestAnimationFrame loop | CSS `transition: transform 0.15s ease-out` | Browser composits at 60fps, no JS needed post-release |
| Collision boundary detection | Pixel-level overlap detection | `buildOccupancyGrid()` from Phase 1 engine | Already built, grid-cell precision is exactly right |
| Responsive square layout | JavaScript resize observer | `aspect-ratio: 1/1` + `min()` CSS function | Native CSS, no layout thrash, handles resize automatically |
| Color assignment per vehicle | Manual color hardcoding | Palette array indexed by vehicle ID sort order | Deterministic, handles any number of vehicles, easy to swap |
| Global game state | React Context + useReducer | Zustand store | No prop drilling, selective subscriptions prevent cascade re-renders |

**Key insight:** The engine's `buildOccupancyGrid()` is the collision oracle. During drag, scan the occupancy grid at drag start to pre-compute min/max bounds — this is O(6) and needs to happen only once per drag start, not on every pointermove.

---

## Common Pitfalls

### Pitfall 1: Stale Closure in Drag Handlers
**What goes wrong:** `onPointerMove` captures `vehicle.position` at render time. When position changes (after a previous drag), the handler has stale grid coordinates, causing miscalculated snaps.
**Why it happens:** React closures capture values at render. The `vehicle` prop is the same object reference across a drag sequence.
**How to avoid:** Store `startGridPos` in the `dragState` ref on pointerdown, computed from the vehicle prop at that moment. Do not read `vehicle.position` inside pointermove — read from the ref.
**Warning signs:** Vehicle snaps to wrong position after being dragged from a non-origin position.

### Pitfall 2: pointercancel Orphaning Drag State
**What goes wrong:** A phone call, browser gesture, or OS interrupt fires `pointercancel`. The element stays in `dragging` CSS class, cursor stays `grabbing`, z-index stays elevated, and the next pointer interaction is broken.
**Why it happens:** `pointercancel` fires instead of `pointerup` — no snap logic runs.
**How to avoid:** Add an `onPointerCancel` handler that calls the same cleanup as `onPointerUp` but snaps back to original position (or current valid position).
**Warning signs:** Vehicle visually stuck mid-air after phone call or browser-level scroll.

### Pitfall 3: CSS Transition Interfering with Drag
**What goes wrong:** `transition: transform 0.15s ease-out` on the vehicle element causes the vehicle to lag behind the pointer during active drag. The pointer moves faster than the transition catches up, feeling broken.
**Why it happens:** CSS transitions apply to all `transform` changes, including the ones during drag.
**How to avoid:** Remove the transition class when drag starts. Add `transition: none` via a `.dragging` class, then restore snap transition via `.snapping` class on pointerup. The class switch must happen before the first transform update.
**Warning signs:** Vehicle lags 150ms behind pointer during drag.

### Pitfall 4: Board Ref Missing at Drag Time
**What goes wrong:** `boardRef.current` is null when pointerdown fires because the component is still mounting or has unmounted.
**Why it happens:** The board ref may not be attached when the first drag event fires if the puzzle loads asynchronously.
**How to avoid:** Guard with `if (!board) return` in onPointerDown. Also ensure Board component is not conditionally unmounted during drag.
**Warning signs:** TypeError on `boardRef.current.getBoundingClientRect()`.

### Pitfall 5: Integer Grid Snap Wrong Direction
**What goes wrong:** `Math.round(ds.currentPos)` snaps correctly for most positions but the vehicle jumps to an occupied cell when two vehicles are adjacent.
**Why it happens:** The collision clamping happens on `currentPos` during move but `snapPos` uses raw `Math.round` before re-clamping.
**How to avoid:** Always clamp snapPos against `[ds.minPos, ds.maxPos]` after rounding: `Math.max(ds.minPos, Math.min(ds.maxPos, Math.round(ds.currentPos)))`.
**Warning signs:** Vehicle overlaps adjacent vehicle after snap release near a wall.

### Pitfall 6: Mobile Scroll Stealing the Drag
**What goes wrong:** On iOS/Chrome Android, a horizontal drag on a vertical vehicle fires a page scroll instead of the drag. The pointer event gets cancelled.
**Why it happens:** Browser interprets touch gesture as scroll before pointer capture is established, especially on the first pointermove.
**How to avoid:** Set `touch-action: none` on every vehicle element via CSS. This must be in the static CSS, not applied dynamically — the browser reads `touch-action` before the pointerdown event fires.
**Warning signs:** Page scrolls when dragging on mobile, drag never starts.

---

## Code Examples

### Board Component Structure

```tsx
// src/components/Board/Board.tsx
import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Vehicle } from '../Vehicle/Vehicle.jsx';
import { BoardCell } from './BoardCell.jsx';
import styles from './Board.module.css';

export function Board() {
  const boardRef = useRef<HTMLDivElement>(null);
  const vehicles = useGameStore(s => s.state?.vehicles ?? []);
  const allIds = vehicles.map(v => v.id);

  // 36 cell tiles
  const cells = Array.from({ length: 36 }, (_, i) => i);

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.boardGrid} ref={boardRef}>
        {cells.map(i => <BoardCell key={i} index={i} />)}
        {vehicles.map(v => (
          <Vehicle
            key={v.id}
            vehicle={v}
            allVehicleIds={allIds}
            boardRef={boardRef}
          />
        ))}
        <div className={styles.exitMarker} aria-label="Exit" />
      </div>
    </div>
  );
}
```

### Vehicle Component

```tsx
// src/components/Vehicle/Vehicle.tsx
import { useGameStore } from '../../store/gameStore.js';
import { useDrag } from '../../hooks/useDrag.js';
import { getVehicleColor } from '../../utils/vehicleColors.js';
import type { Vehicle as VehicleType } from '../../engine/index.js';
import styles from './Vehicle.module.css';

interface Props {
  vehicle: VehicleType;
  allVehicleIds: string[];
  boardRef: React.RefObject<HTMLDivElement>;
}

const CELL = 100 / 6;

export function Vehicle({ vehicle, allVehicleIds, boardRef }: Props) {
  const getState = useGameStore(s => s.engine?.getState.bind(s.engine));
  const move = useGameStore(s => s.move);

  const { elementRef, onPointerDown, onPointerMove, onPointerUp } = useDrag({
    vehicle,
    getState: getState ?? (() => ({ vehicles: [], moveCount: 0, moveHistory: [], startTime: null, endTime: null, isWon: false })),
    onDragEnd: (id, newRow, newCol) => move(id, newRow, newCol),
    boardRef,
  });

  const color = getVehicleColor(vehicle.id, allVehicleIds);
  const isTarget = vehicle.id === 'X';

  const style: React.CSSProperties = {
    top: `${vehicle.position.row * CELL}%`,
    left: `${vehicle.position.col * CELL}%`,
    width: vehicle.orientation === 'horizontal' ? `${vehicle.size * CELL}%` : `${CELL}%`,
    height: vehicle.orientation === 'vertical' ? `${vehicle.size * CELL}%` : `${CELL}%`,
    backgroundColor: color,
  };

  return (
    <div
      ref={elementRef}
      className={[
        styles.vehicle,
        vehicle.size === 2 ? styles.car : styles.truck,
        vehicle.orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        isTarget ? styles.targetCar : '',
      ].filter(Boolean).join(' ')}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}  // cleanup on cancel same as up
    />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Padding-top 100% for square aspect ratio | `aspect-ratio: 1/1` CSS property | Chrome 88 / 2021 | No padding hack, no extra wrappers needed |
| `mousedown`/`touchstart` separate handlers | Pointer Events API unified | Baseline widely available since 2020 | Single handler for mouse+touch+pen |
| Redux for game state | Zustand (minimal, selector-based) | ~2021, dominant by 2023 | Far less boilerplate, no action types |
| Zustand v4 with React 18 types | Zustand v5 with React 19 peer dep | October 2024 | Direct `import { create } from 'zustand'` (no default export) |
| `@types/react` separate from react | @types/react v19 bundled closer | React 19 Dec 2024 | Must install `@types/react@^19` explicitly |
| `transform: translate3d(x,y,0)` for GPU | `transform: translateX/Y` | ~2022 | Both work; `translate3d` no longer needed for GPU layer hint |

**Deprecated/outdated:**
- `zustand/middleware` named import: still valid in v5, no change
- `ReactDOM.render()`: Removed in React 18+, use `createRoot`
- `e.persist()` on synthetic events: Not needed in React 17+ (events not pooled)

---

## Open Questions

1. **Puzzle data source for Phase 2**
   - What we know: Phase 2 requirements say "interact with the puzzle board" — a puzzle must be loaded before the board renders.
   - What's unclear: Phase 2 has no puzzle-loading requirement listed. The board needs a `PuzzleDefinition` to initialize. Will Phase 2 hardcode a single test puzzle?
   - Recommendation: Hardcode one representative puzzle (with several vehicles, different sizes) as a constant in `App.tsx` for Phase 2. Puzzle management is a separate phase.

2. **getState access pattern in useDrag**
   - What we know: `useDrag` needs live vehicle positions for collision pre-computation on pointerdown. The Zustand store holds a `GameState` snapshot, not the live engine.
   - What's unclear: Calling `engine.getState()` directly from `useDrag` bypasses Zustand's snapshot model. Alternatively, useDrag could accept the vehicles array directly.
   - Recommendation: Pass the vehicles array from Zustand state into `useDrag` props (already available in the component). The collision pre-computation on pointerdown uses whatever is in the latest render's vehicles array, which is authoritative.

3. **Exit marker visual implementation**
   - What we know: Exit gap is on right side of row 3 (0-indexed row 2). The board has a CSS border.
   - What's unclear: Punching a hole in a CSS border isn't directly possible. Options: (a) use box-shadow for border instead of real border, (b) use SVG border, (c) use a positioned child element that covers the border.
   - Recommendation: Use a positioned pseudo-element or child `div` with `background: [page background color]` to paint over the right border segment at row 2 position. Fragile but simple. Document that page background color and exit cover must match.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events — event types, setPointerCapture, touch-action
- MDN Web Docs — touch-action CSS: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- MDN Web Docs — aspect-ratio: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio
- Zustand GitHub — https://github.com/pmndrs/zustand — v5.0.11 confirmed React 19 compatible
- Zustand Docs — Beginner TypeScript Guide: https://zustand.docs.pmnd.rs/guides/beginner-typescript
- Vite Docs — Features (CSS Modules): https://vite.dev/guide/features

### Secondary (MEDIUM confidence)
- WebSearch confirmed: Zustand v5.0.11 is the current version, React 19 compatible (GitHub discussion #2686)
- WebSearch confirmed: React 19.2.4 is current React release (react.dev/versions)
- WebSearch confirmed: Vite CSS Modules work out of the box with `.module.css` suffix, no config needed
- r0b.io blog — setPointerCapture drag pattern: https://blog.r0b.io/post/creating-drag-interactions-with-set-pointer-capture-in-java-script/
- CSS-Tricks / lexo.ch — will-change and GPU layer promotion best practices

### Tertiary (LOW confidence — training knowledge, flag for validation)
- Specific CSS easing curve recommendations (0.15s ease-out for snap) — reasonable but not benchmarked
- `useShallow` from `zustand/react/shallow` import path — verify against installed version
- `min()` CSS function behavior at 320px viewport — test on actual device

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm/GitHub
- Architecture: HIGH — Pointer Events MDN confirmed, Zustand patterns from official docs
- Drag hook pattern: MEDIUM-HIGH — pattern confirmed by multiple web sources, direct DOM mutation approach well-established, specific collision pre-computation logic is derived reasoning not from a verified source
- Pitfalls: MEDIUM — most from known browser behavior (touch-action, pointercancel, CSS transitions during drag) with some from general React patterns

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — stack is stable)
