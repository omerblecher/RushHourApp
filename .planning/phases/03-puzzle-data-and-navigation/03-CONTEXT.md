# Phase 3: Puzzle Data and Navigation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse 80+ puzzles organized by 4 difficulty levels, select and play any puzzle, and have their progress saved locally via localStorage. URL-based routing connects a main menu, difficulty/puzzle selection, and game board screens. All puzzles are validated as solvable at build time.

</domain>

<decisions>
## Implementation Decisions

### Navigation flow
- Main menu/home screen as entry point (title/logo, then navigate to play)
- Screen hierarchy: Main Menu → Difficulty Selection (tabs) → Puzzle Grid → Game Board
- Simple fade/slide CSS transitions between screens
- Full URL-based routing — browser back button navigates through the hierarchy naturally
- On puzzle win: show completion stats (moves, time, vs optimal), then offer "Next Puzzle" and "Back to Selection"

### Puzzle selection UI
- Numbered tiles (Puzzle 1, 2, 3...) — simple squares, not mini board previews
- Difficulty levels presented as horizontal tabs/segmented control at top (Beginner | Intermediate | Advanced | Expert)
- 5 tiles per row in the puzzle grid (4 rows of 5 for 20 puzzles)
- Completed tiles get a checkmark overlay and shift to a muted/green tint; uncompleted stay bold
- Default tab is always Beginner

### Progress & stats
- Win/completion screen shows: your moves, your time, and minimum possible moves (optimal comparison)
- Puzzle tiles in grid show only completion status (checkmark), not personal best stats
- No aggregate progress counter per difficulty level — checkmarks on tiles are sufficient
- Personal best tracked as both moves AND time per puzzle in localStorage (available for win screen comparison even if not shown on tiles)

### Difficulty & unlocking
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-puzzle-data-and-navigation*
*Context gathered: 2026-02-19*
