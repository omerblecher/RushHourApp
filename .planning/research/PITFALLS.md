# Domain Pitfalls

**Domain:** Rush Hour sliding puzzle game (React + Firebase + SVG/CSS)
**Researched:** 2026-02-16
**Confidence:** MEDIUM (based on extensive domain knowledge; web verification unavailable)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken gameplay, or runaway costs.

---

### Pitfall 1: Collision Detection Off-by-One and Direction Blindness

**What goes wrong:** Vehicles clip through each other, overlap on the grid, or get stuck in impossible positions. The most common bug is checking collisions only at the destination cell instead of along the entire slide path. A car sliding 3 cells right must check ALL intermediate cells, not just the final position.

**Why it happens:**
- Developers model the grid as a simple 2D array and only check `grid[targetRow][targetCol]` instead of every cell between current position and target.
- Forgetting that vehicles occupy multiple cells (a truck is 3 cells, a car is 2 cells) and checking only the "head" cell.
- Allowing diagonal movement or movement perpendicular to the vehicle's orientation due to missing orientation checks.

**Consequences:**
- Vehicles overlap visually and in state, corrupting the puzzle.
- Players can "cheat" by sliding through blockers.
- Move counter becomes meaningless if invalid moves are counted.
- Puzzle becomes unsolvable mid-game due to corrupted state.

**Prevention:**
1. Model each vehicle as `{ id, row, col, length, orientation: 'H' | 'V' }`.
2. Maintain a `grid[6][6]` occupancy map that is recomputed from vehicle positions (single source of truth).
3. For any move, iterate through ALL cells the vehicle would pass through AND occupy at the destination.
4. Enforce orientation: horizontal vehicles can only move left/right, vertical only up/down.
5. Clamp movement to grid boundaries BEFORE collision checking.

**Detection:** Write unit tests that attempt to slide a vehicle through another vehicle. Test boundary cases: vehicle at edge trying to move off-grid, two vehicles adjacent trying to swap.

```typescript
// WRONG: Only checks destination
function canMove(vehicle, targetCol) {
  return grid[vehicle.row][targetCol] === null;
}

// RIGHT: Checks entire path and all cells the vehicle will occupy
function canMove(vehicle, delta) {
  const newCol = vehicle.col + delta;
  const minCol = Math.min(vehicle.col, newCol);
  const maxCol = Math.max(vehicle.col + vehicle.length - 1, newCol + vehicle.length - 1);

  for (let c = minCol; c <= maxCol; c++) {
    if (c < 0 || c >= 6) return false;
    const occupant = grid[vehicle.row][c];
    if (occupant !== null && occupant !== vehicle.id) return false;
  }
  return true;
}
```

---

### Pitfall 2: Firebase Read Costs Exploding on Leaderboards

**What goes wrong:** Firestore charges per document read. A naive leaderboard that loads all entries for a puzzle on every page view can generate thousands of reads per user session. With 80+ puzzles and a global leaderboard, costs scale multiplicatively.

**Why it happens:**
- Loading the full leaderboard (all entries) instead of top-N with `.limit()`.
- Querying the leaderboard on every puzzle screen render (including re-renders from React state changes).
- Not caching leaderboard data client-side.
- Subscribing to real-time updates (`onSnapshot`) for leaderboards that change infrequently.
- Each puzzle having its own leaderboard collection means 80+ potential query targets.

**Consequences:**
- Firestore free tier (50K reads/day) exhausted by a few hundred users.
- At scale: hundreds of dollars/month in unexpected Firestore bills.
- Real-time listeners on leaderboards compound the problem -- every write triggers reads for ALL listeners.

**Prevention:**
1. **Always use `.limit(10)` or `.limit(25)`** on leaderboard queries. Never fetch all entries.
2. **Cache aggressively.** Use React state or a simple in-memory cache with a 5-minute TTL. Leaderboards do not need to be real-time.
3. **Do NOT use `onSnapshot` for leaderboards.** Use `getDocs` with manual refresh (pull-to-refresh or a "Refresh" button).
4. **Denormalize a "top scores" document.** Store the top 10 scores for each puzzle in a SINGLE document. Reading 1 document = 1 read, instead of querying and reading 10+ documents.
5. **Batch leaderboard updates server-side** using Cloud Functions triggered on score writes.
6. **Structure Firestore as:** `puzzles/{puzzleId}/topScores` (single document with top 10 array) rather than `leaderboard/{puzzleId}/entries/{entryId}` (N documents).

**Detection:** Monitor Firestore usage dashboard from day one. Set up billing alerts at $1, $5, $25.

```
// EXPENSIVE: N reads per leaderboard view
collection("leaderboard").where("puzzleId", "==", id).orderBy("moves").limit(10)

// CHEAP: 1 read per leaderboard view
doc("puzzles/" + puzzleId + "/topScores")  // single doc with array of top 10
```

---

### Pitfall 3: Puzzle Solvability -- Shipping Unsolvable Puzzles

**What goes wrong:** A puzzle in the set of 80+ is actually unsolvable, or becomes unsolvable due to a data entry error (vehicle placed wrong, exit blocked permanently). Players get stuck forever with no recourse (no hint system).

**Why it happens:**
- Manual puzzle creation without automated validation.
- Off-by-one errors in puzzle data (vehicle at row 2 instead of row 3).
- Copy-paste errors when encoding 80+ puzzles.
- Assuming a puzzle is solvable because it "looks solvable" without running a solver.
- Editing a puzzle after validation without re-validating.

**Consequences:**
- Player frustration and app abandonment.
- Negative reviews.
- No hint system means there is NO fallback -- the player is simply stuck.
- Leaderboard for that puzzle will be empty, which looks broken.

**Prevention:**
1. **Write a BFS/DFS solver and run it against EVERY puzzle at build time.** This is non-negotiable for 80+ puzzles.
2. Store the optimal solution move count alongside each puzzle (useful for leaderboard calibration and as a sanity check).
3. Add a build-time or CI test: `puzzles.forEach(p => assert(solver.solve(p) !== null))`.
4. Include the minimum moves in the puzzle metadata so leaderboard scores can be compared against the theoretical optimum.
5. Version puzzle data and re-validate on any change.

**Detection:** A puzzle with zero leaderboard entries after launch is likely unsolvable or has a data error.

```typescript
// Build-time validation script
import { puzzles } from './puzzleData';
import { solve } from './solver';

puzzles.forEach((puzzle, i) => {
  const solution = solve(puzzle);
  if (!solution) {
    throw new Error(`Puzzle ${i} (${puzzle.id}) is UNSOLVABLE`);
  }
  console.log(`Puzzle ${i}: solvable in ${solution.moves} moves`);
});
```

---

### Pitfall 4: Leaderboard Cheating -- Impossible Scores

**What goes wrong:** Players submit leaderboard entries with impossible move counts (0 moves, 1 move on an expert puzzle) or impossibly fast times (0.1 seconds). Without validation, the leaderboard becomes meaningless.

**Why it happens:**
- Score submission is a simple Firestore write from the client.
- No server-side validation of whether the score is achievable.
- Browser DevTools can intercept and modify the Firestore write payload.
- Replay attacks: submitting the same score multiple times.
- Time manipulation: pausing the browser timer, modifying Date.now().

**Consequences:**
- Legitimate players see impossible scores and lose motivation.
- Leaderboard credibility destroyed.
- "First place" becomes whoever cheats the most, not who plays the best.

**Prevention:**
1. **Server-side validation via Cloud Functions.** Do NOT write directly to the leaderboard from the client. Write to a `pendingScores` collection; a Cloud Function validates and promotes to `leaderboard`.
2. **Validate move count against the known minimum.** If optimal is 12 moves, reject anything below 12.
3. **Validate time against a reasonable minimum.** Even the fastest solver needs ~0.5 seconds per move. Reject `time < minMoves * 0.3`.
4. **Store and validate the move sequence** (not just the count). The Cloud Function can replay the moves against the puzzle state to verify legitimacy.
5. **Rate limit submissions.** One score per puzzle per user per 10 seconds.
6. **Firestore Security Rules** should prevent direct writes to leaderboard collections.

**Detection:** Monitor for scores below the known optimal move count. Alert on times that are physically impossible.

```
// Firestore security rules
match /leaderboard/{puzzleId}/entries/{entryId} {
  allow read: if true;
  allow write: if false;  // Only Cloud Functions can write
}

match /pendingScores/{scoreId} {
  allow create: if request.auth != null
    && request.resource.data.moves >= 1
    && request.resource.data.userId == request.auth.uid;
  allow read, update, delete: if false;
}
```

---

### Pitfall 5: Race Conditions in Firestore Leaderboard Writes

**What goes wrong:** Two players submit scores simultaneously. Both read the current top-10, both determine they qualify, both write. One overwrites the other. Or: a player's personal best is checked and updated non-atomically, allowing duplicate entries.

**Why it happens:**
- Firestore operations are not automatically serialized.
- Read-then-write patterns without transactions.
- Cloud Functions can execute concurrently for the same puzzle.
- The "denormalized top scores" document is a hotspot -- multiple concurrent writes to the same document.

**Consequences:**
- Lost leaderboard entries.
- Duplicate entries for the same player.
- Corrupted top-10 arrays (wrong length, missing entries).
- Inconsistent state between the detailed entries and the denormalized summary.

**Prevention:**
1. **Use Firestore transactions** for all leaderboard updates. Read current state and write new state atomically.
2. **Use the player's UID as the document ID** in per-puzzle collections to prevent duplicates: `leaderboard/{puzzleId}/entries/{uid}`.
3. For the denormalized top-scores document, use a transaction that reads the current array, inserts the new score in sorted order, trims to top 10, and writes back.
4. **Idempotent Cloud Functions:** Design the function so running it twice with the same input produces the same result.
5. Consider using Firestore's `FieldValue.arrayUnion` where appropriate, but note it does NOT handle sorted insertion -- use transactions instead.

**Detection:** Monitor for duplicate player entries in leaderboards. Check that top-10 arrays always have exactly <= 10 entries.

```typescript
// Cloud Function: atomic leaderboard update
await firestore.runTransaction(async (txn) => {
  const topRef = firestore.doc(`puzzles/${puzzleId}/topScores`);
  const topDoc = await txn.get(topRef);
  const scores = topDoc.exists ? topDoc.data().scores : [];

  // Check if player already has a better score
  const existing = scores.find(s => s.uid === uid);
  if (existing && existing.moves <= newMoves) return; // Already better

  // Remove old entry if exists, add new, sort, trim
  const updated = scores
    .filter(s => s.uid !== uid)
    .concat({ uid, moves: newMoves, time: newTime, displayName })
    .sort((a, b) => a.moves - b.moves || a.time - b.time)
    .slice(0, 10);

  txn.set(topRef, { scores: updated });
});
```

---

## Moderate Pitfalls

---

### Pitfall 6: Browser Audio Autoplay Policy Blocking Sound Effects

**What goes wrong:** Sound effects don't play on first interaction. The car slide sound, level start sound, or win celebration is silently blocked by the browser. No error is visible to the user -- sounds just don't work.

**Why it happens:**
- All modern browsers (Chrome, Safari, Firefox, Edge) block `AudioContext` and `Audio.play()` until after a user gesture (click, tap, keypress).
- Developers test with DevTools open (which can have different autoplay policies) or after already interacting with the page.
- Creating `AudioContext` on page load instead of on first user interaction.
- Calling `.play()` on an `<audio>` element that hasn't been "unlocked" by a user gesture.

**Prevention:**
1. **Initialize AudioContext on the FIRST user click/tap**, not on page load.
2. Use a "warm-up" pattern: on first user interaction anywhere on the page, create the AudioContext and play a silent buffer to unlock it.
3. **Always handle the `.play()` promise rejection** -- `audio.play().catch(() => {})` at minimum, but better to set a flag and retry on next user gesture.
4. Use the Web Audio API (`AudioContext` + `AudioBuffer`) instead of `<audio>` elements for low-latency game sounds.
5. Pre-decode audio buffers after unlocking the AudioContext so sounds play instantly when needed.
6. Provide a visible mute/unmute toggle so users have control and can see audio state.

**Detection:** Test on mobile Safari (strictest autoplay policy). Test in a fresh incognito window with no prior interactions.

```typescript
// Audio manager with user-gesture unlock
class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private unlocked = false;

  async unlock() {
    if (this.unlocked) return;
    this.ctx = new AudioContext();
    // Play silent buffer to unlock
    const buffer = this.ctx.createBuffer(1, 1, 22050);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start(0);
    this.unlocked = true;
    // Now pre-load actual sounds
    await this.preloadSounds();
  }

  // Call this from your app's first click handler
}
```

---

### Pitfall 7: SVG Rendering Performance with Many Animated Vehicles

**What goes wrong:** Animations stutter or drop frames, especially on mobile devices. Dragging a car feels laggy. The board feels unresponsive during slide animations.

**Why it happens:**
- SVG re-renders trigger full DOM layout recalculations.
- React re-rendering SVG elements on every mouse/touch move event (60+ times/second during drag).
- Complex SVG paths for vehicle art (gradients, shadows, details) multiply render cost.
- CSS transitions on SVG `transform` properties can trigger layout thrashing.
- Mobile devices have weaker GPUs and less memory for SVG compositing.

**Consequences:**
- Laggy drag feel ruins the core gameplay experience.
- Animation jank makes the game feel unpolished.
- High battery drain on mobile from constant re-paints.

**Prevention:**
1. **Use CSS `transform: translate()` for all vehicle movement**, not SVG `x`/`y` attributes. Transforms are GPU-composited and skip layout.
2. **Use `will-change: transform`** on vehicle elements to promote them to their own compositor layer.
3. **Throttle drag events** to requestAnimationFrame. Do NOT update React state on every `mousemove` -- use a ref to store position and update via `requestAnimationFrame`.
4. **Keep SVG art simple.** Flat colors, minimal gradients, no filters (`<feGaussianBlur>`, `<feDropShadow>` are expensive). Aim for < 20 SVG nodes per vehicle.
5. **Avoid React re-renders during drag.** Store drag position in a ref, manipulate the DOM element directly via `element.style.transform`, and only update React state on drag END.
6. **Consider CSS-based vehicles** (div + border-radius + background) instead of SVG for simpler rendering. Reserve SVG for decorative details only.
7. Use `React.memo` on vehicle components to prevent re-rendering vehicles that haven't moved.

**Detection:** Profile with Chrome DevTools Performance tab. Look for long "Recalculate Style" and "Layout" entries during drag. Test on a low-end Android phone.

```typescript
// WRONG: React state update on every mouse move
const onMouseMove = (e) => {
  setVehiclePosition({ x: e.clientX, y: e.clientY }); // 60 re-renders/sec
};

// RIGHT: Direct DOM manipulation during drag, React update on drop
const dragRef = useRef({ x: 0, y: 0 });
const elementRef = useRef<HTMLDivElement>(null);

const onMouseMove = useCallback((e) => {
  dragRef.current.x = e.clientX;
  requestAnimationFrame(() => {
    if (elementRef.current) {
      elementRef.current.style.transform =
        `translate(${dragRef.current.x}px, ${dragRef.current.y}px)`;
    }
  });
}, []);
```

---

### Pitfall 8: Mobile Touch Handling Conflicts with Scroll and Zoom

**What goes wrong:** On mobile, dragging a vehicle triggers page scroll or pinch-zoom instead of (or in addition to) moving the vehicle. Or, after implementing `preventDefault()` on touch events, the user can no longer scroll the page at all.

**Why it happens:**
- Touch events (`touchstart`, `touchmove`) propagate to the browser's scroll/zoom handlers.
- Using `preventDefault()` broadly kills all scrolling, not just on the game board.
- React's synthetic events and passive event listeners complicate touch handling.
- iOS Safari has unique touch-handling quirks (300ms tap delay, rubber-band scrolling).
- The 6x6 grid may not fill the viewport, so users need to scroll to see content above/below.

**Prevention:**
1. **Call `preventDefault()` ONLY on touch events that originate on the game board**, not globally.
2. Set `touch-action: none` CSS on the game board container (not on `body`). This tells the browser not to handle touches on that element as scroll/zoom.
3. For elements outside the board, ensure `touch-action: auto` (the default).
4. Use `{ passive: false }` when adding touch event listeners that call `preventDefault()`.
5. Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` to prevent pinch-zoom on the game board (but be aware of accessibility implications).
6. Test on both iOS Safari and Android Chrome -- they handle touch events differently.

**Detection:** Test on a real mobile device (not just Chrome DevTools device simulation). Try scrolling the page while touching the game board. Try pinch-zooming on the board.

```css
/* Apply ONLY to the game board */
.game-board {
  touch-action: none;  /* Prevents scroll/zoom on this element */
  user-select: none;   /* Prevents text selection during drag */
  -webkit-user-select: none;
}
```

---

### Pitfall 9: Responsive Layout -- 6x6 Grid Sizing Across Devices

**What goes wrong:** The 6x6 grid is too small on mobile (can't tap vehicles accurately), too large on desktop (wastes space), or doesn't maintain its square aspect ratio. Vehicles become misaligned with grid cells at certain viewport sizes.

**Why it happens:**
- Using fixed pixel sizes that don't adapt to viewport.
- Using percentage-based sizing without maintaining aspect ratio.
- Grid cell size calculations produce fractional pixels, causing sub-pixel rendering misalignment.
- Not accounting for the status bar, navigation bar, or on-screen keyboard on mobile.

**Prevention:**
1. **Use `min(90vw, 90vh, 500px)`** for the board size. This ensures it fits in the viewport, stays square, and has a maximum size on desktop.
2. **Use CSS Grid with `1fr` cells** so cells divide evenly. `grid-template: repeat(6, 1fr) / repeat(6, 1fr)`.
3. **Round cell sizes to whole pixels** when calculating vehicle positions to avoid sub-pixel gaps.
4. Use `aspect-ratio: 1` on the board container for guaranteed squareness.
5. Use `dvh` (dynamic viewport height) instead of `vh` on mobile to account for browser chrome.
6. Test at: 320px wide (iPhone SE), 375px (iPhone), 768px (iPad), 1920px (desktop).

**Detection:** Visual inspection at multiple viewport sizes. Look for 1px gaps between vehicles and grid lines. Check that tapping a vehicle on mobile reliably selects it.

```css
.game-board {
  --board-size: min(90vw, 90dvh, 500px);
  width: var(--board-size);
  height: var(--board-size);
  display: grid;
  grid-template: repeat(6, 1fr) / repeat(6, 1fr);
  aspect-ratio: 1;
}

.vehicle {
  /* Use grid placement, not absolute positioning */
  grid-row: var(--vehicle-row) / span var(--vehicle-row-span);
  grid-column: var(--vehicle-col) / span var(--vehicle-col-span);
}
```

---

### Pitfall 10: Drag-to-Slide vs Click-to-Slide Input Model Confusion

**What goes wrong:** The game implements drag-based movement, but users expect click-based (click vehicle, click destination). Or vice versa. Or the drag doesn't snap to grid cells properly, leaving vehicles between cells.

**Why it happens:**
- Rush Hour is a physical board game with a slide mechanic, but digital implementations vary.
- Drag-based movement is intuitive but hard to implement correctly (collision detection during drag, snap-to-grid on release, axis locking).
- Click-based is simpler to implement but less satisfying.
- Not locking the drag axis to the vehicle's orientation (allowing diagonal drag of a horizontal car).

**Prevention:**
1. **Use constrained drag.** When the user starts dragging a vehicle, lock movement to the vehicle's orientation axis immediately.
2. **Snap to grid on drag end.** Calculate the nearest valid grid position (considering collisions) and animate to it.
3. **Show valid movement range** during drag (e.g., highlight cells the vehicle can reach).
4. **During drag, continuously enforce collision bounds** -- the vehicle should stop at the nearest blocker, not pass through.
5. Consider supporting BOTH: drag for power users, click/tap on vehicle then tap on valid cell for casual users.
6. Provide visual feedback during drag: slight scale-up, shadow, or highlighting.

**Detection:** Watch a non-developer use the game for the first time. Note where they hesitate or try an unexpected interaction.

---

## Minor Pitfalls

---

### Pitfall 11: Firebase Auth Session Persistence Confusion

**What goes wrong:** Users lose their authentication state unexpectedly (after page refresh, between sessions, or across tabs). Or conversely, auth state persists in shared/public computers when it shouldn't.

**Prevention:**
1. Use `browserLocalPersistence` for personal devices (survives page refresh).
2. Explicitly set persistence: `setPersistence(auth, browserLocalPersistence)`.
3. Handle the auth state loading period -- show a loading state while `onAuthStateChanged` fires for the first time.
4. Offer anonymous auth as the default (zero friction) with optional account linking later.
5. If using anonymous auth, warn that clearing browser data loses the account.

---

### Pitfall 12: Puzzle Data Format Fragility

**What goes wrong:** Puzzle data is encoded as a string or compact format that is error-prone to edit. A single character error in puzzle data makes a puzzle unsolvable or crashes the parser.

**Prevention:**
1. Use a strongly-typed JSON format, not a compact string encoding.
2. Add TypeScript types for puzzle data and validate at load time.
3. Build a puzzle editor/visualizer tool (even a simple one) for creating and verifying puzzles.
4. Add schema validation for puzzle data (e.g., with Zod).
5. Validate invariants: exactly one red car, red car on row 3 (0-indexed: row 2), red car is horizontal, no overlapping vehicles, all vehicles within bounds.

```typescript
// Puzzle data schema (Zod example)
const VehicleSchema = z.object({
  id: z.string(),
  type: z.enum(['car', 'truck']),
  orientation: z.enum(['H', 'V']),
  row: z.number().min(0).max(5),
  col: z.number().min(0).max(5),
  length: z.number().min(2).max(3),
  isTarget: z.boolean().default(false),
});

const PuzzleSchema = z.object({
  id: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  vehicles: z.array(VehicleSchema).refine(
    (vehicles) => vehicles.filter(v => v.isTarget).length === 1,
    "Exactly one target vehicle required"
  ),
  minMoves: z.number().positive(),
});
```

---

### Pitfall 13: Timer Manipulation and Inconsistent Timing

**What goes wrong:** The game timer uses `Date.now()` or `setInterval`, which can be manipulated via DevTools, system clock changes, or simply pausing/backgrounding the tab (which throttles `setInterval`).

**Prevention:**
1. Use `performance.now()` for relative timing (not affected by system clock changes).
2. Track elapsed time on the server side as well (record start and end timestamps in Firestore).
3. Handle page visibility changes: pause the timer when the tab is hidden (`document.visibilitychange` event).
4. For leaderboard timing, the Cloud Function should validate that `endTime - startTime` matches the claimed duration (within a tolerance).
5. Accept that client-side timing will never be perfectly cheat-proof -- focus on making obvious cheating detectable.

---

### Pitfall 14: Win Detection Edge Case -- Partial Exit

**What goes wrong:** The win condition checks if the red car is at column 4 (for a length-2 car exiting right on a 6-wide grid), but the actual win is when the car reaches the exit. Off-by-one errors cause the game to either trigger win too early or not at all.

**Prevention:**
1. Define win condition clearly: the target car's leading edge reaches the exit cell. For a horizontal car exiting right: `car.col + car.length - 1 >= 5` (rightmost column, 0-indexed).
2. OR model the exit as column 6 (off-grid) and allow the target car to slide to `col = 5` (its front at position 6). This is cleaner conceptually.
3. Add an animated "drive off the board" effect on win rather than just stopping at the edge.
4. Test win detection with the target car at every possible column position.

---

### Pitfall 15: Undo/Reset State Management Complexity

**What goes wrong:** Implementing undo (step back one move) and reset (return to initial state) seems trivial but introduces state management bugs. Undo after undo after undo can corrupt state. Reset doesn't fully restore the original puzzle. Move counter doesn't decrement on undo (or decrements below zero).

**Prevention:**
1. Store the full move history as an array of `{ vehicleId, fromPos, toPos }`.
2. Undo = pop the last move and reverse it. Reset = restore the original puzzle state (stored as a constant).
3. **Keep the original puzzle state immutable** -- deep clone it at puzzle load, never mutate it.
4. Decide upfront whether undo increments the move counter (most implementations: undo does NOT decrement the counter, preventing undo-abuse for better scores). Document this decision.
5. If undo doesn't affect the counter, disable undo on leaderboard-submitted runs, OR count total moves including undos.

---

### Pitfall 16: Firebase Security Rules -- Overly Permissive Defaults

**What goes wrong:** Default Firestore rules allow anyone to read/write anything. Developers forget to lock down rules before launch. Any user can read all other users' data, delete leaderboard entries, or write arbitrary data.

**Prevention:**
1. **Start with deny-all rules** and explicitly open only what's needed.
2. Leaderboard write access: ONLY via Cloud Functions (never direct client writes).
3. User profile data: read by anyone, write only by the owner.
4. Puzzle data: read by anyone, write by nobody (managed via deployment).
5. Test security rules with the Firebase Emulator Suite before deploying.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }

    // Puzzles: public read, no client write
    match /puzzles/{puzzleId} {
      allow read: if true;
      allow write: if false;
    }

    // User profiles: owner can write, anyone can read display name
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Pending scores: authenticated users can create their own
    match /pendingScores/{scoreId} {
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if false;
    }

    // Leaderboard: public read, only Cloud Functions write
    match /leaderboard/{puzzleId}/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core grid + movement | Collision detection bugs (Pitfall 1) | Comprehensive unit tests with edge cases; build occupancy grid as single source of truth |
| Vehicle rendering | SVG performance (Pitfall 7) | Use CSS transforms, not SVG attributes; profile on mobile early |
| Puzzle data | Unsolvable puzzles (Pitfall 3) | Build solver FIRST; validate every puzzle at build time |
| Drag interaction | Touch conflicts on mobile (Pitfall 8) | Set `touch-action: none` on board; test on real devices early |
| Firebase integration | Cost explosion (Pitfall 2) | Denormalize leaderboard into single doc; cache client-side; set billing alerts |
| Leaderboard | Cheating + race conditions (Pitfalls 4, 5) | Cloud Functions for writes; transactions; validate against known minimums |
| Sound effects | Autoplay blocking (Pitfall 6) | Unlock AudioContext on first user gesture; handle play() rejections |
| Mobile layout | Grid sizing issues (Pitfall 9) | Use CSS min() + aspect-ratio; test on real devices at all breakpoints |
| Auth + security | Permissive rules (Pitfall 16) | Start with deny-all; lock down before any public deployment |
| Polish + UX | Timer cheating (Pitfall 13) | Server-side timing validation; handle tab visibility changes |

---

## Risk Matrix Summary

| Pitfall | Severity | Likelihood | Impact if Missed | Phase |
|---------|----------|------------|------------------|-------|
| Collision detection | CRITICAL | HIGH | Broken gameplay | Core |
| Firebase costs | CRITICAL | HIGH | Unexpected bills | Firebase |
| Unsolvable puzzles | CRITICAL | MEDIUM | Player frustration, no recovery | Data |
| Leaderboard cheating | CRITICAL | HIGH | Destroyed competitive value | Firebase |
| Race conditions | CRITICAL | MEDIUM | Data corruption | Firebase |
| Audio autoplay | MODERATE | HIGH | Silent game on first play | Polish |
| SVG performance | MODERATE | MEDIUM | Laggy drag on mobile | Rendering |
| Touch conflicts | MODERATE | HIGH | Unusable on mobile | Mobile |
| Grid responsiveness | MODERATE | MEDIUM | Misaligned visuals | Layout |
| Input model confusion | MODERATE | LOW | User confusion | UX |
| Auth persistence | MINOR | LOW | Logged-out users | Auth |
| Puzzle data format | MINOR | MEDIUM | Data entry errors | Data |
| Timer manipulation | MINOR | MEDIUM | Unfair leaderboard | Firebase |
| Win detection | MINOR | LOW | Game-breaking bug | Core |
| Undo state mgmt | MINOR | MEDIUM | Corrupted game state | Core |
| Security rules | CRITICAL | MEDIUM | Data breach / vandalism | Firebase |

---

## Sources

- Domain expertise in React game development, Firebase cost modeling, Web Audio API restrictions, SVG performance characteristics, and mobile touch event handling.
- Confidence level: MEDIUM overall. WebSearch was unavailable for verification against current (2026) documentation. Core claims about browser autoplay policies, Firestore pricing model, SVG rendering performance, and touch event handling are well-established patterns unlikely to have changed, but specific API details should be verified against current docs during implementation.
