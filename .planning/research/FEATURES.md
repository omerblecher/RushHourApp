# Feature Landscape

**Domain:** Rush Hour sliding puzzle game (web/mobile)
**Researched:** 2026-02-16
**Confidence:** MEDIUM — Based on well-established game mechanics (Rush Hour by ThinkFun, 1996) and standard puzzle game UX patterns. Web sources unavailable for verification; Rush Hour is a thoroughly documented classic game, so training data confidence is higher than typical.

---

## 1. Core Game Mechanics (Rush Hour Rules)

**Confidence: HIGH** — Rush Hour is a formally specified puzzle with decades of analysis.

### Grid and Setup
- **6x6 grid** (36 cells), fixed size — no variation needed
- **Exit position:** Row 3 (0-indexed: row 2), right edge of the board
- Vehicles are placed on the grid before the player starts
- The **target car** (traditionally red, size 2) must reach the exit

### Vehicle Types
| Type | Size | Visual | Behavior |
|------|------|--------|----------|
| Car | 2 cells | Compact shape | Slides along its axis |
| Truck | 3 cells | Longer shape | Slides along its axis |
| Target car | 2 cells | Red / distinct color | Must reach exit on row 3 |

### Movement Rules
- Vehicles move **only along their orientation axis** (horizontal vehicles slide left/right, vertical vehicles slide up/down)
- Vehicles **cannot pass through** other vehicles
- Vehicles **cannot leave the grid** (except the target car exiting)
- A vehicle can slide **multiple cells** in one move (as long as path is clear)
- **One move = sliding one vehicle any number of cells** in its allowed direction
- No diagonal movement, no rotation, no lifting

### Win Condition
- The target car slides right and exits through the gap at row 3, column 6
- The puzzle is solved when the red car reaches the exit

---

## 2. Puzzle Data Format

**Confidence: HIGH** — Multiple established encoding formats exist in puzzle-solving literature.

### Recommended Format: Grid String Encoding

Use a **36-character string** representing the 6x6 grid left-to-right, top-to-bottom. Each vehicle gets a unique letter; empty cells are `.` (dot).

```
Example: "AA.O..B..OXXB..O..CPPP.CDDEEL.FFG.L"

Grid visualization:
A A . O . .
B . . O X X    <- X is the target car on row 3
B . . O . .
C P P P . C
D D E E L .
F F G . L .
```

**Why this format:**
- Human-readable when laid out as a grid
- Compact for storage (36 chars + metadata)
- Easy to parse programmatically
- Used by Michael Fogleman's Rush Hour solver and many academic implementations
- Trivially convertible to a structured object

### Structured Object Format (runtime)

```typescript
interface Puzzle {
  id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  minMoves: number;             // optimal solution length
  gridString: string;           // 36-char encoding
  vehicles: Vehicle[];          // parsed from gridString
}

interface Vehicle {
  id: string;                   // single letter identifier
  isTarget: boolean;            // true for the red car
  orientation: 'horizontal' | 'vertical';
  size: 2 | 3;                 // car or truck
  row: number;                 // top-left cell row (0-5)
  col: number;                 // top-left cell col (0-5)
  color: string;               // assigned display color
}

interface GameState {
  puzzleId: string;
  vehicles: Vehicle[];          // current positions
  moveCount: number;
  moveHistory: Move[];
  startTime: number;
  completed: boolean;
}

interface Move {
  vehicleId: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  timestamp: number;
}
```

### Puzzle Storage in Firebase

Store puzzles as documents in a `puzzles` collection:

```json
{
  "id": "beginner_001",
  "difficulty": "beginner",
  "minMoves": 7,
  "gridString": "....O.B..OXXB..O..CPPP.CDDEEL.FFG.L",
  "vehicleCount": 9,
  "order": 1
}
```

Parse the gridString into Vehicle objects client-side. This keeps the database lean and the puzzle format standardized.

---

## 3. Difficulty Classification

**Confidence: MEDIUM** — Based on ThinkFun's original card system and computational analysis of Rush Hour puzzles.

### What Makes a Puzzle Harder

The primary difficulty metric is **minimum number of moves** (optimal solution length). Secondary factors include:

| Factor | Impact | Measurement |
|--------|--------|-------------|
| Minimum moves | PRIMARY | Optimal solution length from BFS solver |
| Vehicle count | Moderate | More vehicles = more complex interactions |
| Blocking depth | High | How many vehicles block the path, and how many block THOSE vehicles |
| Solution branching | Moderate | Number of possible move sequences |
| Required "retreat" moves | High | Moves that appear to go backwards |

### Difficulty Tiers (for 80+ puzzles)

| Difficulty | Min Moves Range | Puzzles | Vehicle Count | Character |
|------------|-----------------|---------|---------------|-----------|
| **Beginner** | 1-9 moves | 20 | 4-8 | Direct path, few blockers, minimal chaining |
| **Intermediate** | 10-18 moves | 20 | 7-10 | Some chain dependencies, 1-2 retreat moves |
| **Advanced** | 19-30 moves | 20 | 9-12 | Deep blocking chains, multiple retreat sequences |
| **Expert** | 31-50+ moves | 20+ | 10-13 | Maximum blocking depth, non-obvious solutions |

The original ThinkFun game used 40 cards across 4 levels. For 80+ puzzles, double each tier. The hardest known Rush Hour puzzles require 50+ minimum moves on a 6x6 grid.

### Puzzle Sourcing Strategy

**Option A (Recommended): Curated from known puzzle databases**
- Michael Fogleman enumerated all possible Rush Hour configurations and their solutions
- Select 80+ puzzles with good difficulty distribution
- Verify each puzzle has exactly one "canonical" optimal solution length

**Option B: Algorithmic generation**
- Generate random valid configurations
- Solve with BFS to get minimum moves
- Filter by difficulty range
- Requires a solver implementation (BFS on game states)
- Risk: generated puzzles may feel "random" rather than elegantly designed

**Recommendation:** Use Option A for initial launch. Curated puzzles feel more intentional. Add generated puzzles later for infinite play mode.

---

## 4. Table Stakes Features

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drag-to-slide vehicles | Core mechanic of the game | Medium | Must feel smooth and snappy |
| Move counter | Players track efficiency | Low | Display prominently |
| Undo last move | Prevents frustration | Low | Single undo or full undo stack |
| Reset puzzle | Start over when stuck | Low | Confirm before resetting |
| Puzzle selection screen | Navigate 80+ puzzles | Medium | Grid/list by difficulty |
| Difficulty indicators | Know what you're getting into | Low | Color-coded labels |
| Win celebration | Reward completion | Low | Animation + sound |
| Timer display | Track speed runs | Low | Optional or always-on |
| Progress tracking | Know which puzzles are solved | Medium | Per-puzzle completion state |
| Mobile touch support | 60%+ traffic is mobile | High | Touch drag with proper hit areas |
| Minimum moves display | Know the target to beat | Low | Show after first solve or always |

---

## 5. Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Global leaderboard | Competition drives replay | Medium | Per-puzzle, moves + time scoring |
| Star rating per puzzle | Achievement motivation | Low | 3 stars based on move efficiency |
| Sound effects | Polish and game feel | Medium | Slide, snap, win, star sounds |
| Hint system | Reduces frustration for stuck players | High | Show next optimal move |
| Replay / ghost mode | Watch your solution play back | Medium | Fun for sharing |
| Daily challenge | Retention mechanic | Medium | One puzzle per day, global ranking |
| Statistics dashboard | Personal progress overview | Medium | Total stars, average efficiency, streaks |
| Keyboard controls | Accessibility + power users | Low | Arrow keys after selecting a vehicle |
| Color themes / dark mode | Visual preference | Low | CSS variable theming |
| Animated tutorial | Onboarding for new players | Medium | Interactive first-puzzle walkthrough |

---

## 6. Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User-created puzzles (v1) | Requires puzzle validation, moderation, solver | Defer to v2+; curate puzzles for launch |
| Real-time multiplayer racing | Complex infrastructure for marginal fun | Async leaderboards achieve 90% of the value |
| In-app purchases / monetization | Complicates a portfolio/hobby project | Keep free; optional donation link if desired |
| Vehicle customization (skins) | Scope creep, doesn't improve core game | Focus on puzzle quality and game feel |
| Social features (friends, chat) | Massive scope, low relevance to puzzle game | Leaderboards are sufficient social proof |
| Infinite procedural puzzles (v1) | Requires solver + quality filter + feels random | Curate 80+ for launch, add generator later |

---

## 7. Leaderboard Design

**Confidence: MEDIUM** — Based on standard puzzle game leaderboard patterns.

### Scoring System

**Primary metric: Move count** (lower is better)
**Tiebreaker: Time** (lower is better)

```typescript
interface LeaderboardEntry {
  odcUserId: string;
  displayName: string;
  puzzleId: string;
  moves: number;          // primary sort (ascending)
  timeSeconds: number;    // tiebreaker (ascending)
  timestamp: number;      // when the score was set
  isOptimal: boolean;     // moves === puzzle.minMoves
}
```

### Why Moves > Time as Primary

- Rush Hour is a **logic puzzle**, not a reflex game
- Optimal solutions (minimum moves) are the real achievement
- Time rewards familiarity/memorization; moves reward thinking
- Players who solve in minimum moves should always rank above those who don't, regardless of speed

### Leaderboard Scopes

| Scope | What It Shows | Why |
|-------|---------------|-----|
| Per-puzzle | Top scores for each specific puzzle | Core competitive loop |
| Per-difficulty | Aggregate stats across a difficulty tier | Broader achievement |
| Overall | Total stars or average efficiency | Long-term engagement |

### Star Rating System

| Stars | Criteria | Display |
|-------|----------|---------|
| 1 star | Completed the puzzle | Bronze/minimal |
| 2 stars | Completed within 2x optimal moves | Silver |
| 3 stars | Completed in optimal moves (minMoves) | Gold + sparkle effect |

This gives every player a win (1 star) while rewarding optimization (3 stars).

### Firebase Leaderboard Structure

```
leaderboards/
  {puzzleId}/
    entries/
      {odcUserId}: { moves, timeSeconds, displayName, timestamp }
```

Use Firestore queries with `orderBy('moves', 'asc')` then `orderBy('timeSeconds', 'asc')` with `limit(100)` for top-100 per puzzle. Store only the player's **best** attempt per puzzle (update only if new score is better).

### Anti-Cheat Considerations

- Validate that submitted move count is achievable (>= minMoves)
- Validate time is reasonable (not 0.1 seconds for a 30-move puzzle)
- Server-side validation: replay the move sequence to verify it's legal
- Rate limit submissions
- Flag and review statistical outliers

---

## 8. Sound Effect Design

**Confidence: MEDIUM** — Based on puzzle game audio design patterns.

### Sound Categories

| Sound | Trigger | Character | Notes |
|-------|---------|-----------|-------|
| Vehicle slide | Dragging a vehicle | Soft wooden slide, short | Pitch varies slightly by distance |
| Vehicle snap | Vehicle reaches final position | Subtle click/thunk | Satisfying tactile feedback |
| Invalid move | Trying to move a blocked vehicle | Soft buzz or dull thud | Not punishing, just informative |
| Puzzle complete | Target car exits | Triumphant jingle (1-2 sec) | Escalate fanfare by star rating |
| Star earned | Each star awarded | Ascending chime | 3 distinct pitches for 1/2/3 stars |
| New best score | Beat personal record | Special flourish | Dopamine hit |
| Undo | Undoing a move | Reverse/rewind whoosh | Quick, non-distracting |
| Button click | UI interactions | Standard click | Consistent across UI |
| Hint reveal | Showing a hint | Soft sparkle/reveal | Gentle, not jarring |

### Implementation Approach

- Use the **Web Audio API** for low-latency playback (critical for slide sounds)
- Preload all sounds on game init (total < 500KB)
- Use **Howler.js** as a convenience wrapper — handles Web Audio API + HTML5 Audio fallback, sprite support, volume control
- Sound sprites: combine all effects into one audio file, play segments (reduces HTTP requests)
- Provide a **mute toggle** (persist preference in localStorage)
- Default to **muted on first visit** (autoplay policies) or trigger audio context on first user interaction

### Sound Design Principles for Puzzle Games

1. **Satisfying, not distracting** — sounds should feel like physical feedback, not music
2. **Short duration** — under 500ms for most effects, under 2s for win jingles
3. **No ambient music by default** — optional background music toggle if desired
4. **Consistent volume** — normalize all effects to similar perceived loudness
5. **Responsive** — sounds must trigger instantly on interaction, not after animation completes

---

## 9. Accessibility

**Confidence: MEDIUM** — Based on WCAG guidelines and puzzle game accessibility patterns.

### Keyboard Navigation (Critical)

Drag-only interfaces exclude keyboard and switch users. Implement full keyboard support:

| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Cycle through vehicles on the grid |
| Arrow keys | Move selected vehicle in allowed direction(s) |
| Enter / Space | Select/confirm vehicle |
| Escape | Deselect vehicle |
| Ctrl+Z | Undo |
| R | Reset puzzle |

### Screen Reader Support

| Element | ARIA Treatment |
|---------|---------------|
| Grid | `role="grid"` with `aria-label="Rush Hour puzzle board, 6 by 6"` |
| Vehicle | `role="gridcell"` with `aria-label="Red car, horizontal, row 3, column 2, target vehicle"` |
| Move feedback | `aria-live="polite"` region: "Red car moved right 2 spaces. Move 5 of 12." |
| Win state | `aria-live="assertive"`: "Puzzle complete! Solved in 12 moves. 2 stars." |

### Color and Visual

- **Do NOT rely solely on color** to distinguish vehicles — use distinct shapes, patterns, or labels
- Each vehicle should have a **letter or number overlay** option (togglable in settings)
- Minimum **4.5:1 contrast ratio** for text and UI elements
- Provide a **high contrast mode** that increases grid line visibility

### Motor Accessibility

- **Large touch targets**: vehicles should have at least 44x44px touch area (WCAG 2.5.5)
- **Click-to-move alternative**: tap a vehicle, then tap the destination cell (no drag required)
- **Move distance indicator**: when a vehicle is selected, highlight valid destination positions
- Snap-to-grid on drag release (no precision needed)

### Cognitive Accessibility

- **Undo is essential** — removes punishment for exploration
- **No time pressure by default** — timer should be optional/hideable
- **Clear visual state** — obvious which vehicle is selected, where it can go
- **Progressive disclosure** — don't overwhelm with all features on first play

---

## 10. Mobile Touch Support

**Confidence: HIGH** — Standard touch interaction patterns, well-understood.

### Touch Interaction Design

| Gesture | Action | Implementation |
|---------|--------|---------------|
| Tap vehicle | Select it (highlight + show valid moves) | `touchstart` on vehicle element |
| Drag vehicle | Slide along its axis | `touchmove` constrained to orientation |
| Tap destination | Move selected vehicle there | Alternative to dragging |
| Swipe on vehicle | Quick slide in swipe direction | Optional convenience gesture |

### Critical Implementation Details

1. **Constrained dragging**: Vehicle must follow its axis only. If a horizontal car is dragged, ignore all Y-axis movement. Use `touch-action: none` on the game board to prevent scroll interference.

2. **Ghost position**: While dragging, show a semi-transparent preview of where the vehicle will land (snap to nearest valid grid position).

3. **Collision detection during drag**: Vehicle should stop at obstacles in real-time, not teleport through them. Continuously check valid range during `touchmove`.

4. **Touch target sizing**: On a 375px-wide phone screen, each grid cell is ~58px. A 2-cell car is ~116px long. This is adequate for touch, but ensure the non-axis dimension is at least 44px.

5. **Prevent scroll while dragging**: Use `touch-action: none` on the board container. Use `preventDefault()` on touch events during active drags.

6. **Handle multi-touch gracefully**: Ignore additional touches while dragging a vehicle. Only one vehicle moves at a time.

7. **Visual feedback**: Vehicle should visually "lift" (subtle scale or shadow) when grabbed, and "settle" when released.

### Responsive Layout

| Screen Size | Board Size | Approach |
|-------------|-----------|----------|
| Phone (<480px) | ~340px | Full-width board, controls below |
| Tablet (480-1024px) | ~450px | Centered board, side panel for info |
| Desktop (>1024px) | ~500px | Board left, puzzle info + leaderboard right |

The board should ALWAYS be square. Use `min(100vw - 32px, 500px)` or similar to size it.

---

## 11. UX Flow

### First-Time User Flow

```
1. Landing / Title Screen
   -> "Play" button
2. Brief animated tutorial (skippable)
   -> Shows: tap vehicle, drag to move, get red car out
3. Beginner Puzzle #1 (easiest possible, ~1-3 moves)
   -> Guided hints if stuck for >30 seconds
4. Win celebration
   -> Star rating shown
   -> "Next Puzzle" or "Puzzle Select"
5. Puzzle selection screen unlocked
```

### Core Game Loop

```
Select Puzzle -> Solve -> Celebrate -> Rate (stars) -> Leaderboard -> Next Puzzle
                  |                                         |
                  +-- Undo / Reset / Hint                   +-- Retry for better score
```

### Puzzle Selection Screen

- Grid layout grouped by difficulty (tabs or sections)
- Each puzzle shows: number, difficulty color, star rating (if solved), best moves
- Locked/unlocked: **Do NOT lock puzzles.** Let players attempt any puzzle. Locking is frustrating and adds no value for a web game. Instead, mark unsolved puzzles with a subtle indicator.
- Sort: default by difficulty then puzzle number

---

## 12. Feature Dependencies

```
Core Grid Engine
  -> Vehicle Rendering (CSS/SVG)
    -> Mouse Drag Support
      -> Touch Drag Support
    -> Keyboard Controls
  -> Collision Detection
    -> Move Validation
      -> Move Counter
      -> Undo System
      -> Win Detection
        -> Star Rating Calculation
          -> Win Celebration Animation
          -> Sound Effects (win)
  -> Puzzle Data Parser (gridString -> Vehicle[])
    -> Puzzle Selection Screen
      -> Progress Tracking (localStorage)
        -> Firebase Auth
          -> Firebase Leaderboard Writes
            -> Leaderboard Display
            -> Anti-Cheat Validation

Sound System (independent, integrates with events)
Tutorial System (depends on core game loop)
Hint System (depends on solver / precomputed solutions)
```

---

## 13. MVP Recommendation

### Must Have (Phase 1 - Playable Game)

1. **6x6 grid with vehicle rendering** (CSS/SVG)
2. **Mouse drag-to-slide** with collision detection
3. **Touch support** for mobile
4. **Move counter and timer**
5. **Win detection and celebration**
6. **20+ puzzles** across 4 difficulty levels (5 per tier minimum)
7. **Puzzle selection screen** with difficulty grouping
8. **Undo and reset**
9. **Responsive layout** (mobile-first)

### Should Have (Phase 2 - Polish)

10. **Star rating system** (1-3 stars based on move efficiency)
11. **Sound effects** (slide, snap, win)
12. **Progress persistence** (localStorage for anonymous, Firebase for auth)
13. **Firebase authentication** (Google sign-in)
14. **Per-puzzle leaderboards**
15. **Keyboard navigation**
16. **Full 80+ puzzle library**

### Nice to Have (Phase 3 - Delight)

17. **Hint system** (show next optimal move)
18. **Daily challenge**
19. **Statistics dashboard**
20. **Animated tutorial**
21. **Color themes / dark mode**
22. **Replay / share solution**

### Defer (v2+)

- User-created puzzles
- Puzzle generator
- Real-time multiplayer
- Social features

---

## 14. Competitive Analysis

**Confidence: LOW** — Based on training data awareness of existing Rush Hour digital versions, not current market research.

| Competitor | Platform | Strengths | Weaknesses | Lesson |
|-----------|----------|-----------|------------|--------|
| ThinkFun Rush Hour app | iOS/Android | Official brand, polished | Paid, no web version | Web version has open niche |
| Various web clones | Browser | Free, accessible | Usually ugly, no leaderboards, poor mobile | Polish + leaderboards = differentiation |
| rush-hour-solver sites | Browser | Show solutions | Not playable games | Combine play + solution verification |

### Key Differentiator Opportunity

Most web Rush Hour clones are bare-bones. A version with:
- Smooth animations and sound
- Global leaderboards
- Star rating progression
- Mobile-first responsive design
- Accessibility support

...would stand out significantly in this space.

---

## Sources

- Rush Hour game mechanics: ThinkFun's original Rush Hour game (1996, designed by Nob Yoshigahara). Rules are well-established and consistent across all implementations. **HIGH confidence** — game rules are formally specified.
- Puzzle data format: Grid string encoding used by multiple academic and hobbyist implementations (Michael Fogleman's Rush Hour solver, various GitHub projects). **HIGH confidence** — standard format.
- Difficulty classification: Based on ThinkFun's original 4-tier system (Beginner/Intermediate/Advanced/Expert) and computational analysis showing correlation between minimum moves and perceived difficulty. **MEDIUM confidence** — exact move ranges may vary by implementation.
- Leaderboard design: Standard puzzle game patterns (moves primary, time tiebreaker). **MEDIUM confidence** — opinion-based but well-reasoned.
- Sound design: General puzzle game audio design principles. **MEDIUM confidence** — no Rush-Hour-specific audio research available.
- Accessibility: WCAG 2.1 guidelines, general web game accessibility patterns. **MEDIUM confidence** — standard guidelines, Rush-Hour-specific implementation details are original analysis.
- Touch support: Standard web touch interaction patterns. **HIGH confidence** — well-documented APIs and patterns.

**Note:** Web search and web fetch tools were unavailable during this research session. All findings are based on training data. Rush Hour is a 30-year-old well-documented game, so core mechanics confidence is high. UX patterns for leaderboards, sound, and accessibility are based on established industry practices. Recommend verifying specific claims (e.g., exact minimum move ranges for difficulty tiers, Howler.js current API) during implementation phases.
