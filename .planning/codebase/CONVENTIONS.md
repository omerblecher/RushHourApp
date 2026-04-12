# Coding Conventions
*Generated: 2026-04-12*

## Summary
The codebase uses TypeScript 5.x in strict mode throughout, with React 19 functional components and CSS Modules for all styling. No linter config file is present (no `.eslintrc` or `eslint.config.*`), so conventions are inferred from consistent patterns across source files.

---

## TypeScript Usage

**Strict mode is on** (`tsconfig.json` sets `"strict": true`). Additional flags in effect:
- `"forceConsistentCasingInFileNames": true`
- `"skipLibCheck": true`
- `"esModuleInterop": true`
- Target: `ES2020`, module resolution: `Bundler`

**Type-only imports** use the `import type` syntax consistently:
```typescript
// src/components/Vehicle/Vehicle.tsx
import type { Vehicle as VehicleType } from '../../engine/types';

// src/store/gameStore.ts
import type { GameState, MoveResult } from '../engine/types';
```

**Interface over type alias** for object shapes; `type` is used for unions and aliases:
```typescript
// src/engine/types.ts
export type Orientation = 'horizontal' | 'vertical';   // union → type
export interface Vehicle { ... }                         // object shape → interface
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
```

**Non-null assertion (`!`)** is used sparingly and only when the developer has verified existence:
```typescript
const lastMove = this.moveHistory.pop()!;
const vehicle = this.vehicles.find((v) => v.id === lastMove.vehicleId)!;
```

**Discriminated optional** on `reason?` in `MoveResult` communicates failure semantics without union overhead.

**Literal types on size field:**
```typescript
size: 2 | 3;   // src/engine/types.ts
```

**Path alias** `@engine` resolves to `src/engine/` and is used in test imports:
```typescript
import { parseGridString } from '@engine/board.js';
```
Source imports use `../engine/` relative paths. Tests use the `@engine` alias.

**`.js` extensions in engine-internal imports** (required for ESM compatibility):
```typescript
import type { Vehicle, Position, Orientation } from './types.js';
import { parseGridString, buildOccupancyGrid, vehicleCells } from './board.js';
```

---

## Component Patterns

**All components are functional** — no class components anywhere.

**Named exports only** — no default component exports except `App`:
```typescript
// src/components/Board/Board.tsx
export function Board({ isWinAnimating }: BoardProps) { ... }

// Exception: src/App.tsx
export default App;
```

**Props typed inline with a local interface** defined immediately before the component:
```typescript
interface BoardProps {
  isWinAnimating: boolean;
}

export function Board({ isWinAnimating }: BoardProps) { ... }
```

**Optional props use `?`** with defaults in the destructure signature:
```typescript
export function Vehicle({ vehicle, isSelected = false, onSelect }: VehicleProps) { ... }
```

**Zustand store access** uses per-selector subscription (avoids over-rendering):
```typescript
const state = useGameStore((s) => s.state);
const move = useGameStore((s) => s.move);
```
Never: `const { state, move } = useGameStore()`.

**Event handlers** are named `handleX` (camelCase verb):
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { ... }
```

**JSX className composition** uses array + `.filter(Boolean).join(' ')` for conditional classes:
```typescript
const classNames = [
  styles.vehicle,
  isHorizontal ? styles.horizontal : styles.vertical,
  isTruck ? styles.truck : styles.car,
  isTargetCar ? styles.targetCar : '',
  isDragging ? styles.dragging : '',
  isSelected ? styles.focused : '',
]
  .filter(Boolean)
  .join(' ');
```

**Inline styles** for dynamic values that cannot be expressed in CSS Modules (positions, colors, shadows), combined with spread:
```typescript
style={{ ...positionStyle, ...colorStyle, ...shadowStyle, ...focusedShadow }}
```

**Accessibility attributes** are applied consistently: `role`, `aria-label`, `aria-selected`, `tabIndex={0}`.

---

## CSS / Styling Conventions

**CSS Modules exclusively** — every component has a paired `ComponentName.module.css`. No global utility classes (other than reset in `src/index.css`).

**Vite is configured** to use `camelCaseOnly` locals convention:
```typescript
// vite.config.ts
css: { modules: { localsConvention: 'camelCaseOnly' } }
```
This means `.board-wrapper` in CSS is accessed as `styles.boardWrapper` in TSX.

**CSS custom properties (variables)** are defined on the container and used for cross-component math:
```css
/* Board.module.css */
.boardWrapper {
  --grid-gap: 3px;
  --grid-padding: 10px;
  --grid-cols: 6;
}
```
Magic numbers that correspond to CSS variables are annotated inline in JS:
```typescript
const GAP_PX = 3;   // must match --grid-gap in Board.module.css
```

**Class naming** uses camelCase in CSS files (matches Vite `camelCaseOnly` setting):
```css
.boardWrapper { }
.gridContainer { }
.vehicleLayer { }
.winGlow { }
```

**Keyframe animations** are defined within the same module file as the class that uses them.

**Global reset** lives in `src/index.css` (box-sizing, margin/padding reset, body/root layout only). No global component styles.

---

## Import Organization

Imports are grouped in this order (blank line between groups):

1. React/framework (react, react-router)
2. Store hooks (`../../store/...`)
3. Services (`../../services/...`)
4. Local components (`./BoardCell`, `../Vehicle/Vehicle`)
5. CSS Module (`styles from './Board.module.css'`)

Example from `src/components/Board/Board.tsx`:
```typescript
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundService } from '../../services/soundService';
import { BoardCell } from './BoardCell';
import { Vehicle } from '../Vehicle/Vehicle';
import styles from './Board.module.css';
```

**`import type`** is always used when importing only types — never mixed in with value imports from the same module (separate `import` statements).

---

## Error Handling Patterns

**Engine layer** returns structured `MoveResult` objects instead of throwing:
```typescript
return { success: false, state: this.getState(), reason: 'Move out of bounds' };
```
Callers check `result.success` before using `result.state`.

**Service layer** swallows errors silently for non-critical async operations (Firebase writes):
```typescript
// scoreService.ts — submitScore is documented as "never throws"
try { ... } catch { /* swallowed */ }
```

**Hook layer** catches and fails silently when network is unavailable:
```typescript
// useLeaderboard.ts
} catch {
  // Fail silently — index may not be deployed yet or network error
  if (!cancelled) { setEntries([]); setUserEntry(null); }
}
```

**Auth errors** are pattern-matched by error code, with typed narrowing:
```typescript
const error = err as AuthError;
if (error.code === 'auth/popup-closed-by-user') { ... }
```

**Stale async results** are prevented with a `cancelled` boolean flag in `useEffect` hooks:
```typescript
let cancelled = false;
// ...
if (cancelled) return;
// ...
return () => { cancelled = true; };
```

---

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` — `Board.tsx`, `Vehicle.tsx`, `GameScreen.tsx`
- CSS Modules: `PascalCase.module.css` — paired with component file
- Hooks: `useCamelCase.ts` — `useDrag.ts`, `useLeaderboard.ts`
- Stores: `camelCaseStore.ts` — `gameStore.ts`, `authStore.ts`, `progressStore.ts`
- Services: `camelCaseService.ts` — `scoreService.ts`, `soundService.ts`
- Utilities: `camelCase.ts` — `formatTime.ts`, `vehicleColors.ts`
- Engine internals: `camelCase.ts` — `board.ts`, `engine.ts`, `solver.ts`, `types.ts`

**Directories:**
- Components: `PascalCase/` with a single `PascalCase.tsx` + `PascalCase.module.css`
- Screens: `PascalCase/` under `src/screens/`, can contain sub-components (`WinModal.tsx`)
- Engine tests: `src/engine/__tests__/` with `*.test.ts` naming

**Functions:**
- Pure functions: `camelCase` — `parseGridString`, `buildOccupancyGrid`, `formatTime`, `getVehicleColor`
- React hooks: `useCamelCase` — `useDrag`, `useLeaderboard`
- Event handlers: `handleX` — `handleKeyDown`, `handlePointerDown`
- Store actions: `camelCase` verbs — `loadPuzzle`, `move`, `undo`, `reset`, `initAuth`, `signOut`

**Classes:**
- `PascalCase` — `GameEngine` (only class in the codebase)

**Constants:**
- Module-level: `SCREAMING_SNAKE_CASE` — `GRID_SIZE`, `WIN_ROW`, `WIN_COL`, `SNAP_DURATION_MS`

**Types/Interfaces:**
- `PascalCase` — `Vehicle`, `GameState`, `MoveResult`, `VehicleColor`, `DragState`
- Store interfaces suffixed with `Store` — `GameStore`, `AuthStore`
- Hook result interfaces suffixed with `Result` — `UseLeaderboardResult`, `UseDragOptions`

---

## Module Design

**Barrel export** for the engine module via `src/engine/index.ts`. Re-exports all public API symbols (types, functions, class). Internal helpers (private engine methods, `computeCollisionBounds`) are not exported.

**Services** are singleton instances (not classes), exported directly:
```typescript
export const soundService = { playSlide, playWin, ... };
```

**Stores** are created with `zustand`'s `create<Interface>()` and exported as hooks (`useGameStore`, `useAuthStore`, `useProgressStore`).

---

## JSDoc Comments

**Engine layer** has JSDoc on every exported function and the class:
```typescript
/**
 * Parses a 36-character grid string into an array of vehicles.
 * @throws Error if the grid string is not exactly 36 characters.
 */
export function parseGridString(gridString: string): Vehicle[] { ... }
```

**UI layer** uses inline comments for non-obvious logic (CSS math, positioning formulas, design decisions):
```typescript
// Cell size in % of vehicle-layer total width/height:
// cellW = (W - 5 * 3px) / 6
```

---

## Gaps / Uncertainties

- No ESLint config file detected (`.eslintrc*` or `eslint.config.*` absent). Conventions are inferred from source patterns only.
- No Prettier config detected (`.prettierrc*` absent). Formatting appears consistent but is not enforced by tooling.
- No pre-commit hook (no `.husky/` or `lint-staged` config). Only the `prebuild` script runs `validate-puzzles`.
