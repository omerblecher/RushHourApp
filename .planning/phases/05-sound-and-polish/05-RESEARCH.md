# Phase 5: Sound and Polish - Research

**Researched:** 2026-02-21
**Domain:** Audio integration (Howler.js), confetti animation (canvas-confetti), keyboard accessibility, CSS win animation, modal UI
**Confidence:** HIGH (standard stack verified via npm registry + official docs; architecture patterns verified against existing codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sound design & feel:**
- Light and playful character — soft, bouncy, friendly (not mechanical or minimal)
- All three sound triggers are active: vehicle slide, puzzle win, and level start — each with a distinct sound
- Slide sound is the same every move regardless of distance moved (no scaling)
- Sound files sourced from Freesound or other open-license asset libraries (not programmatically synthesized)

**Win celebration animation:**
- Two visual effects combined: confetti burst + board flash/glow
- Animation plays first, then WinModal appears (~2 seconds of animation before modal)
- Board is locked during animation (input disabled while celebration plays)

**Keyboard interaction model:**
- Tab key cycles through vehicles to select; focus ring identifies selected vehicle
- Arrow keys move selected vehicle in its valid axis only; invalid-axis presses silently ignored
- Selected vehicle shows highlight + subtle glow as visual focus indicator
- Escape key deselects the current vehicle

**Mute control placement:**
- Mute toggle lives in the game header/top bar (always accessible)
- Icon: speaker with waves (unmuted) / speaker with X (muted) — standard volume icon
- Global mute — one setting controls all audio across all screens; persisted to localStorage
- Soft click/chime plays on unmute to confirm audio is restored

**Help & About:**
- Help button in game header: opens a how-to-play modal with text instructions only (no diagrams or animations)
- About button in game header: opens credits modal — who built it and tools used (no links or version number)
- Both buttons live in the header alongside the mute toggle

### Claude's Discretion
- Exact confetti implementation (library vs CSS/canvas)
- Board flash/glow timing and intensity
- Specific Freesound asset selection (pick light/playful ones matching the character)
- Exact spacing and layout of the header controls (mute, help, about)
- ARIA labels and screen reader behavior details (beyond keyboard nav)
- Cross-browser test matrix execution order

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope (Help/About was added to scope by user decision, not deferred)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-033 | Car slide sound on vehicle movement | Howler.js `Howl.play()` called from `gameStore.move()` return path; sound service singleton pattern |
| REQ-034 | Win celebration sound on puzzle completion | Howler.js triggered in `GameScreen` win detection `useEffect` alongside confetti |
| REQ-035 | Level start sound when loading a new puzzle | Howler.js triggered in `GameScreen` puzzle load `useEffect` after `loadPuzzle()` call |
| REQ-036 | Global mute/unmute toggle persisted to localStorage | `Howler.mute(true/false)` global API; existing `rushhour_muted` key in ControlBar stub ready to wire |
| REQ-037 | Audio context initialized on first user gesture (autoplay policy compliance) | Howler 2.2.4 `autoUnlock: true` (default) handles this automatically; `onunlock` event for post-unlock actions |
| REQ-016 | Click-to-select + arrow-key movement as keyboard alternative | `tabIndex` on Vehicle divs, `keydown` handler in Board or GameScreen, `selectedVehicleId` state in gameStore or local React state |
| REQ-023 | Win celebration animation | `canvas-confetti` 1.9.4 one-shot burst + CSS `@keyframes` board glow on `.board` element |
| NFR-002 | Bundle size < 200KB gzipped | howler: ~7KB gzipped; canvas-confetti: ~10KB gzipped; both are minimal additions |
| NFR-003 | Game playable offline (puzzles bundled locally, Firebase graceful degradation) | Sound files bundled as static assets in `public/sounds/`; no network dependency for audio |
| NFR-005 | ARIA labels on vehicles and grid for screen reader accessibility | `aria-label` on Vehicle divs, `role="grid"` on gridContainer, `aria-selected` on focused vehicle |
| NFR-007 | Works on Chrome, Firefox, Safari, Edge (latest 2 versions) | Howler uses Web Audio API + HTML5 fallback; canvas-confetti uses Canvas API (universal); pointer events universal |
</phase_requirements>

---

## Summary

Phase 5 delivers sound, animation, and keyboard polish to complete the Rush Hour game. The technical stack is straightforward: **Howler.js 2.2.4** (already planned in the project roadmap, not yet installed) handles all audio with its built-in autoplay unlock mechanism. **canvas-confetti 1.9.4** provides the one-shot confetti burst for win celebration. Board flash/glow is pure CSS `@keyframes` (no library needed). Keyboard navigation is a focused event-handling addition to the existing React component tree.

The biggest integration challenge is **sequencing the win celebration**: the user decision is "animation first (~2s), then WinModal". This means `GameScreen` must delay `setShowWinModal(true)` by ~2 seconds after detecting `state.isWon`. During that window, input must be disabled (board locked). The confetti and board glow trigger at `t=0`; the WinModal appears at `t=2000ms`.

The mute control is moving from `ControlBar` (Phase 3 stub) to the **game header** alongside new Help and About buttons. The existing ControlBar stub already reads/writes `rushhour_muted` localStorage — this logic migrates to a new `soundService` singleton that controls `Howler.mute()`.

**Primary recommendation:** Install `howler` + `@types/howler` + `canvas-confetti`. Build a `soundService.ts` singleton that owns all `Howl` instances. Trigger sounds at the action sites (move commit in `useDrag`, level load in `GameScreen`, win detection in `GameScreen`). Wire the mute toggle to `Howler.mute()`. Layer confetti + CSS class addition for the win sequence, controlled by a 2-second delay before showing WinModal.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| howler | 2.2.4 | Web Audio playback with HTML5 fallback | Already specified in project roadmap; MIT; 7KB gzipped; handles autoplay unlock automatically; 25K GitHub stars |
| @types/howler | 2.2.12 | TypeScript definitions for howler | DefinitelyTyped package; covers all Howl options and Howler global API |
| canvas-confetti | 1.9.4 | One-shot confetti particle burst | ISC license; ~10KB gzipped; zero dependencies; Canvas API = universal browser support; actively maintained (last publish: Oct 2025) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/canvas-confetti | 1.9.0 | TypeScript types for canvas-confetti | TypeScript project — always include |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| howler | Web Audio API directly | Much more boilerplate; no HTML5 fallback; no sprite support; no autoplay unlock |
| howler | Tone.js | Tone.js is 60KB+ and synthesis-focused; overkill for file playback |
| canvas-confetti | react-canvas-confetti | Adds React wrapper overhead; direct import of `canvas-confetti` is simpler for a one-shot trigger |
| canvas-confetti | CSS-only particle animation | CSS particles are limited and harder to make look good; canvas-confetti is battle-tested |
| canvas-confetti | js-confetti | Similar but less configurable; canvas-confetti has better burst control |

**Installation:**
```bash
npm install howler @types/howler canvas-confetti @types/canvas-confetti
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   └── soundService.ts       # Howler.js singleton — owns all Howl instances
├── components/
│   ├── Board/
│   │   ├── Board.tsx         # Add keyboard handler + selectedVehicleId prop
│   │   └── Board.module.css  # Add winGlow @keyframes + .winGlow class
│   ├── Vehicle/
│   │   ├── Vehicle.tsx       # Add tabIndex, keyboard focus ring, aria-label
│   │   └── Vehicle.module.css # Add .focused class with glow
│   ├── GameHeader/           # NEW — mute toggle + help + about buttons
│   │   ├── GameHeader.tsx
│   │   └── GameHeader.module.css
│   ├── HelpModal/            # NEW — how-to-play text modal
│   │   ├── HelpModal.tsx
│   │   └── HelpModal.module.css
│   └── AboutModal/           # NEW — credits text modal
│       ├── AboutModal.tsx
│       └── AboutModal.module.css
├── screens/
│   └── GameScreen/
│       └── GameScreen.tsx    # Wire: win sequence (confetti → delay → WinModal), level start sound
├── store/
│   └── gameStore.ts          # Add selectedVehicleId state (or local state in Board)
public/
└── sounds/
    ├── slide.mp3             # Car slide sound
    ├── win.mp3               # Win celebration sound
    └── level-start.mp3       # Level start sound
```

### Pattern 1: soundService Singleton

**What:** A module-level singleton that creates all `Howl` instances once and exposes `play()` methods. Reads mute state from localStorage on init and applies `Howler.mute()`.

**When to use:** Any time you need to play a sound. Import the singleton — no React context needed.

```typescript
// Source: howler.js API docs + project pattern
import { Howl, Howler } from 'howler';

const MUTE_KEY = 'rushhour_muted';

const slideSound = new Howl({ src: ['/sounds/slide.mp3'], volume: 0.6 });
const winSound   = new Howl({ src: ['/sounds/win.mp3'],   volume: 0.8 });
const startSound = new Howl({ src: ['/sounds/level-start.mp3'], volume: 0.7 });

// Apply persisted mute on load
const savedMuted = localStorage.getItem(MUTE_KEY) === 'true';
Howler.mute(savedMuted);

export const soundService = {
  playSlide: () => slideSound.play(),
  playWin:   () => winSound.play(),
  playStart: () => startSound.play(),

  setMuted: (muted: boolean) => {
    Howler.mute(muted);
    localStorage.setItem(MUTE_KEY, String(muted));
  },

  isMuted: (): boolean => localStorage.getItem(MUTE_KEY) === 'true',

  // Called on unmute to play confirmation chime (user decision: soft click on unmute)
  playUnmuteChime: () => {
    // Use startSound or a dedicated short chime
    startSound.play();
  },
};
```

**Key fact:** `Howler.mute(true)` silences ALL sounds globally. Setting it once silences everything — no need to track mute per-sound.

### Pattern 2: Win Sequence in GameScreen

**What:** On `state.isWon`, trigger confetti + board glow CSS class, delay 2 seconds, then show WinModal. Board is locked (pointer-events: none on vehicleLayer) during animation.

```typescript
// Source: user decision + canvas-confetti API
import confetti from 'canvas-confetti';

// In GameScreen.tsx win detection useEffect:
useEffect(() => {
  if (state?.isWon && puzzleId && state.startTime && state.endTime) {
    // ... existing score logic ...

    // 1. Play win sound
    soundService.playWin();

    // 2. Fire confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#e63946', '#f5c842', '#4a90d9', '#2ecc71', '#9b59b6'],
    });

    // 3. Add board glow class (via state flag)
    setIsWinAnimating(true);

    // 4. After 2 seconds, show WinModal
    const timer = setTimeout(() => {
      setIsWinAnimating(false);
      setShowWinModal(true);
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [state?.isWon]);
```

**Board lock during animation:** Add `isWinAnimating` prop to `Board`; when true, set `pointer-events: none` on the `vehicleLayer`. Keyboard handler also checks this flag.

### Pattern 3: Keyboard Navigation in Board

**What:** `tabIndex={0}` on each Vehicle div. `onKeyDown` on the Board wrapper (or `document`). Escape deselects. Arrow keys move selected vehicle.

**When to use:** This is the primary keyboard interaction pattern for game grids.

```typescript
// Source: ARIA keyboard pattern for composite widgets (roving focus NOT needed here
// because user decision is Tab cycles through ALL vehicles, not roving tabindex)

// In Board.tsx:
const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!selectedVehicleId) return;

  const vehicle = state?.vehicles.find(v => v.id === selectedVehicleId);
  if (!vehicle) return;

  if (e.key === 'Escape') {
    setSelectedVehicleId(null);
    return;
  }

  const isHorizontal = vehicle.orientation === 'horizontal';
  let dr = 0, dc = 0;

  if (e.key === 'ArrowLeft'  && isHorizontal) dc = -1;
  else if (e.key === 'ArrowRight' && isHorizontal) dc = 1;
  else if (e.key === 'ArrowUp'    && !isHorizontal) dr = -1;
  else if (e.key === 'ArrowDown'  && !isHorizontal) dr = 1;
  else return; // ignore invalid-axis presses silently

  e.preventDefault(); // prevent page scroll
  const result = move(selectedVehicleId, vehicle.position.row + dr, vehicle.position.col + dc);
  if (result?.moved) soundService.playSlide();
};
```

**Vehicle tabIndex and focus ring:**
```typescript
// In Vehicle.tsx:
<div
  ref={ref}
  tabIndex={0}
  role="button"
  aria-label={`Vehicle ${id}, ${orientation}, ${size === 3 ? 'truck' : 'car'}`}
  aria-selected={isSelected}
  className={[...classNames, isSelected ? styles.focused : ''].join(' ')}
  onClick={() => onSelect(id)}  // passed from Board
  onFocus={() => onSelect(id)}  // select on focus too
  // ... rest of props
/>
```

### Pattern 4: Board Glow CSS Animation

**What:** Add a CSS class to `.board` that plays a `@keyframes` glow animation for ~2 seconds.

```css
/* In Board.module.css */
@keyframes winGlow {
  0%   { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 rgba(245,200,66,0); }
  20%  { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 60px rgba(245,200,66,0.8), 0 0 120px rgba(245,200,66,0.4); }
  60%  { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 40px rgba(245,200,66,0.5); }
  100% { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 rgba(245,200,66,0); }
}

.winGlow {
  animation: winGlow 2s ease-out forwards;
}
```

### Pattern 5: GameHeader Component

**What:** New header bar with mute, help, and about buttons. Replaces the Phase 3 mute stub in ControlBar.

The existing `ControlBar` component is at the bottom of the game screen. The user decision places mute/help/about in the **game header/top bar**. This means:
- Add a `GameHeader` component above `GameHUD` in `GameScreen`
- Remove mute button from `ControlBar` (or keep for backward compat — decision at planning time)
- `GameHeader` owns mute state via `soundService.isMuted()` and `soundService.setMuted()`

### Anti-Patterns to Avoid

- **Creating Howl instances on every render:** Howl instances are heavyweight. Create them ONCE at module level in `soundService.ts`, not inside a React component or hook.
- **Using `Howler.volume()` for mute:** Use `Howler.mute()` not `Howler.volume(0)` — mute preserves the volume setting and is the correct API.
- **Calling `confetti()` inside render:** Call it in an effect, not during component render.
- **Not preventing default on arrow keys:** Without `e.preventDefault()`, arrow keys scroll the page while playing the game.
- **Managing mute state in React only:** Mute must persist to localStorage AND call `Howler.mute()`. Don't rely on React re-render to apply mute; the Howler global must be set.
- **Starting audio automatically on page load:** `soundService.playStart()` must be called from a user gesture path (puzzle load is triggered by navigation, which follows a button click — this counts as user activation in all browsers).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio playback + formats | Custom Web Audio API wrapper | howler 2.2.4 | MP3/OGG fallbacks, HTML5 fallback, mobile unlock, sprite support — 6 months of edge cases in 7KB |
| Autoplay unlock | Manual AudioContext.resume() listener | howler autoUnlock (default: true) | Howler handles touchend/click unlock automatically across browsers |
| Confetti particles | CSS particle system or canvas animation | canvas-confetti 1.9.4 | Physics simulation, particle spawning, cleanup — 10KB beats months of tuning |

**Key insight:** Both audio and confetti have browser-specific edge cases (Safari 4-AudioContext limit, iOS touch events, particle cleanup) that libraries handle correctly. Custom implementations consistently miss these.

---

## Common Pitfalls

### Pitfall 1: Autoplay Policy — Sound on Level Load

**What goes wrong:** `soundService.playStart()` fires when a puzzle loads. If the user navigates directly to a puzzle URL (no prior interaction), the AudioContext is suspended — the sound silently fails.

**Why it happens:** Browsers require a user gesture before AudioContext can play audio. Direct URL navigation is not a gesture.

**How to avoid:** Howler's `autoUnlock: true` (default) handles the common case. For the level-start sound specifically: it fires after a navigation action (user clicked a puzzle tile), which IS a user gesture. The AudioContext should already be unlocked. If not, the sound simply doesn't play — acceptable failure mode per REQ-037 ("initialized on first user gesture").

**Warning signs:** Console warning "The AudioContext was not allowed to start." First sound in a session silently fails.

**Implementation note:** On unmute, play a soft chime to confirm audio works. This also serves as a "first gesture" unlock if audio was previously blocked.

### Pitfall 2: Slide Sound Firing Too Often

**What goes wrong:** `playSlide()` fires on every `pointermove` event during drag (potentially 60fps), creating a cacophony.

**Why it happens:** The drag system emits move events continuously; sound should only fire when the vehicle actually snaps to a new cell.

**How to avoid:** Call `soundService.playSlide()` ONLY at the `onMoveCommit` callback site in `useDrag` (when `newRow !== startRow || newCol !== startCol`), not during `onPointerMove`. The existing `useDrag` hook already has this distinction — `onMoveCommit` fires exactly once per valid move.

**Implementation:** In `useDrag.ts`, add `soundService.playSlide()` inside the `snapTimerRef` callback alongside `onMoveCommitRef.current(...)`.

### Pitfall 3: WinModal Appears Before Animation Completes

**What goes wrong:** Race condition between `setTimeout` and React state updates causes WinModal to flash in before confetti finishes.

**Why it happens:** `setTimeout(2000)` and React re-render are asynchronous; component unmount during animation can trigger the timer callback after unmount.

**How to avoid:** Store the timer ref and clear it in the `useEffect` cleanup function:
```typescript
return () => clearTimeout(timer); // inside win detection useEffect
```

Also, only trigger the 2-second sequence ONCE — the `useEffect` dependency `[state?.isWon]` ensures it fires once per puzzle win.

### Pitfall 4: Keyboard Conflicts With Browser Shortcuts

**What goes wrong:** Arrow keys scroll the page. Tab cycles away from the game entirely. Space activates focused button.

**Why it happens:** Default browser behavior for keyboard events.

**How to avoid:**
- `e.preventDefault()` on all arrow key presses when a vehicle is selected
- Do NOT `preventDefault` on Tab (tab cycling between vehicles is desired behavior)
- The `onKeyDown` handler on Board should check `if (!selectedVehicleId) return` before preventing defaults

### Pitfall 5: Howler.js CJS/ESM Compatibility With Vite

**What goes wrong:** Vite build or dev mode throws errors about howler's CommonJS module format.

**Why it happens:** howler 2.2.4 is a CommonJS/UMD package, not a native ES module. The WIP PR #1518 to modernize it is not yet released.

**How to avoid:** Vite handles CJS dependencies automatically via its dependency pre-bundling (esbuild). Import as:
```typescript
import { Howl, Howler } from 'howler';
```
This works with `@types/howler` 2.2.12 without additional Vite config. No special `optimizeDeps` config needed for howler in standard Vite setups (HIGH confidence — Vite pre-bundles CJS by default).

### Pitfall 6: canvas-confetti Positioning

**What goes wrong:** Confetti origin `{ x: 0.5, y: 0.5 }` uses viewport coordinates (0-1 range relative to window), not the board element.

**Why it happens:** canvas-confetti always uses window-relative origin by default.

**How to avoid:** The board is centered in the viewport, so `{ x: 0.5, y: 0.6 }` (slightly below center, accounting for header) works well without needing element-relative positioning.

---

## Code Examples

Verified patterns from official sources:

### Howl Instantiation (Module Level)
```typescript
// Source: howlerjs.com API docs
import { Howl, Howler } from 'howler';

const slideSound = new Howl({
  src: ['/sounds/slide.mp3'],
  volume: 0.5,
  preload: true,
});

// Global mute — applies to all Howl instances
Howler.mute(true);
```

### canvas-confetti One-Shot Burst
```typescript
// Source: github.com/catdad/canvas-confetti README
import confetti from 'canvas-confetti';

confetti({
  particleCount: 150,
  spread: 100,
  origin: { x: 0.5, y: 0.6 },
  colors: ['#e63946', '#f5c842', '#4a90d9', '#2ecc71', '#9b59b6'],
  gravity: 1.2,
  scalar: 0.9,
});
```

### Board Glow Trigger (React State)
```typescript
// Pattern: add class conditionally in Board.tsx
<div className={[styles.board, isWinAnimating ? styles.winGlow : ''].filter(Boolean).join(' ')}>
```

### Vehicle ARIA and Keyboard
```typescript
// Source: MDN ARIA + existing Vehicle.tsx pattern
<div
  ref={ref}
  tabIndex={0}
  role="gridcell"
  aria-label={`${isTargetCar ? 'Target car' : `Vehicle ${id}`}, ${orientation}, ${size === 3 ? 'truck' : 'car'}`}
  aria-selected={isSelected}
  className={classNames}
  // ... other props
/>
```

### Mute Toggle (Header Component)
```typescript
// Wire to soundService
const handleMuteToggle = () => {
  const next = !soundService.isMuted();
  soundService.setMuted(next);
  if (!next) soundService.playUnmuteChime(); // confirm audio on unmute
  setIsMuted(next); // local state for re-render
};
```

---

## Existing Codebase Integration Notes

These are critical integration points discovered by reading the existing code:

### 1. Sound Trigger Sites

| Sound | Where to Trigger | Code Location |
|-------|-----------------|---------------|
| Slide | After `onMoveCommit` confirms actual move | `useDrag.ts` inside `snapTimerRef` callback |
| Level start | After `loadPuzzle()` succeeds in GameScreen | `GameScreen.tsx` puzzle load `useEffect` |
| Win | In win detection `useEffect` before animation | `GameScreen.tsx` existing win `useEffect` |
| Unmute chime | In mute toggle handler | `GameHeader.tsx` (new) |

### 2. Mute State Migration

The Phase 3 `ControlBar` stub already has:
```typescript
const MUTE_KEY = 'rushhour_muted';
const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTE_KEY) === 'true');
```

This stub must be **migrated** to `soundService.ts` (the singleton reads this key on init and applies `Howler.mute()`). The ControlBar mute button should be removed or delegated to `soundService`.

### 3. Win Sequence Integration

Current `GameScreen.tsx` win detection (line 45-66):
```typescript
useEffect(() => {
  if (state?.isWon && puzzleId && state.startTime && state.endTime) {
    // ... score logic
    setShowWinModal(true); // <-- change: delay by 2000ms
  }
}, [state?.isWon]);
```

Add `isWinAnimating` state; the win detection effect becomes:
```typescript
setIsWinAnimating(true);
soundService.playWin();
confetti({ ... });
const timer = setTimeout(() => {
  setIsWinAnimating(false);
  setShowWinModal(true);
}, 2000);
return () => clearTimeout(timer);
```

### 4. Board Lock During Animation

The Board's `vehicleLayer` currently has `pointer-events: none` (this is correct — vehicles themselves set `pointer-events: auto`). To lock the board during win animation, add `pointer-events: none` to the entire `boardWrapper` or add a transparent overlay div.

Pass `isWinAnimating` from `GameScreen` to `Board` as a prop, or use `gameStore` if avoiding prop drilling.

### 5. GameScreen Layout Change

Current `GameScreen` renders: `GameHUD` → `Board` → `ControlBar`

After Phase 5: `GameHeader` → `GameHUD` → `Board` → `ControlBar`

`GameHeader` is new (mute + help + about). The existing mute in `ControlBar` is removed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 `<audio>` element | Howler.js Web Audio API with HTML5 fallback | ~2015 | Sprite support, precise timing, mobile unlock |
| Manual AudioContext.resume() per gesture | `Howler.autoUnlock: true` | howler 2.0 | No custom unlock code needed |
| Custom particle CSS | canvas-confetti | ~2020 | Physics-accurate, performant, zero-effort |
| `mobileAutoEnable` option | `autoUnlock` option | howler 2.1 | More consistent naming, applies to all platforms |

**Deprecated/outdated:**
- `react-howler`: Thin React wrapper around howler; not needed — a module-level singleton is simpler and avoids React lifecycle coupling.
- howler `mobileAutoEnable`: Renamed to `autoUnlock` in 2.1; both still work but `autoUnlock` is current.

---

## Open Questions

1. **Sound file format: MP3 only vs MP3+OGG**
   - What we know: Howler accepts array `src: ['file.mp3', 'file.ogg']` for fallback. MP3 has 97%+ browser support. OGG covers Firefox edge cases pre-2020 (now resolved).
   - What's unclear: Whether MP3-only is sufficient for all NFR-007 target browsers (Chrome, Firefox, Safari, Edge latest 2).
   - Recommendation: MP3-only is safe for 2025 target browsers. Howler's HTML5 fallback ensures compatibility even without OGG. Single format simplifies asset management.

2. **Confetti canvas vs board canvas**
   - What we know: canvas-confetti creates its own full-window canvas overlay by default.
   - What's unclear: Whether the confetti appearing over the entire window (including header) is acceptable, or if it should be scoped to the board area.
   - Recommendation: Full-window confetti feels more celebratory. Use default behavior. Board-scoped confetti would require passing a custom canvas ref — unnecessary complexity.

3. **Keyboard focus management after win**
   - What we know: When win animation completes and WinModal appears, keyboard focus should move to the modal.
   - What's unclear: WinModal currently doesn't auto-focus.
   - Recommendation: Add `autoFocus` to the first WinModal button, or use `useEffect` with `ref.current.focus()` when modal mounts. Standard modal focus pattern.

---

## Sources

### Primary (HIGH confidence)
- `npm info howler` — version 2.2.4, MIT, last publish 2023-09-19
- `npm info @types/howler` — version 2.2.12
- `npm info canvas-confetti` — version 1.9.4, ISC, last publish 2025-10-25
- `npm info @types/canvas-confetti` — version 1.9.0
- github.com/goldfire/howler.js README — Howl options, Howler global API, autoUnlock, event list
- github.com/catdad/canvas-confetti README — confetti() API, origin, spread, particleCount
- MDN Web Audio API Autoplay Guide — gesture unlock requirement, AudioContext.resume() pattern
- Existing codebase read: `useDrag.ts`, `GameScreen.tsx`, `gameStore.ts`, `ControlBar.tsx`, `Vehicle.tsx`, `Board.tsx`, `Board.module.css`, `Vehicle.module.css`

### Secondary (MEDIUM confidence)
- howlerjs.com official site — global Howler settings, autoUnlock confirmation
- MDN Web Audio API Best Practices — Safari 4-AudioContext limit warning
- WebSearch: Howler TypeScript + Vite pattern (`import { Howl, Howler } from 'howler'` works with @types/howler)

### Tertiary (LOW confidence)
- WebSearch: canvas-confetti TypeScript integration patterns — general guidance only, verified against npm package structure
- WebSearch: Cross-browser testing checklist — general practices, not app-specific

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry; howler in project roadmap since Phase 0
- Architecture: HIGH — patterns derived from reading actual codebase files; integration points precisely located
- Pitfalls: HIGH — autoplay policy pitfall verified via MDN + howler GitHub issues; slide sound frequency verified from useDrag source code read
- Sound asset sourcing: LOW — Freesound asset selection deferred to execution time; specific file recommendations not made

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable stack; howler 2.x has been stable since 2023; canvas-confetti active as of Oct 2025)
