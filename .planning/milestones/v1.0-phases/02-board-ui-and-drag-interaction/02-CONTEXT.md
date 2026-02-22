# Phase 2: Board UI and Drag Interaction - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual game board with CSS-styled vehicles and pointer-event-driven drag system. Users see a 6x6 grid, drag vehicles with mouse or touch constrained to their axis, and get real-time visual feedback. Board renders responsively from 320px to desktop at 60fps. Creating puzzles, navigation, sound, and leaderboards are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Board visual style
- Playful and colorful theme — bright colors, rounded shapes, fun board-game vibe
- Distinct cell tiles for the grid — each cell is a visible tile/square with slight borders or alternating shades
- Exit marker as a gap/cutout in the board border on the right side of row 3 — like the physical Rush Hour game
- Subtle pattern or texture behind the grid (dots, crosshatch, or similar) — not a plain solid color

### Vehicle design
- Rainbow palette — each vehicle a different bright color (red, blue, green, yellow, purple, orange, etc.)
- Cars (2-cell) and trucks (3-cell) have visually different details — cars get windows/headlights, trucks get cargo/panel details, toy-like distinction
- Red target car gets special styling — extra flair (star, glow, or unique shape) to draw attention beyond just being red
- Very rounded, 3D-ish shapes — pill-shaped with shadows and gradients, like physical toy pieces

### Drag feel & feedback
- Lift + shadow on drag — vehicle scales slightly larger with a drop shadow, feels like picking up a game piece
- Smooth animated snap on release — vehicle glides to nearest valid grid cell with a quick ease-out animation
- Hard stop on collision — vehicle stops at the collision boundary, cannot be dragged past another vehicle or wall
- Hover highlight — vehicle subtly highlights on hover/tap to show it's interactive before dragging

### Game HUD layout
- Stats bar (move counter + timer) above the board — always visible like a scoreboard
- Move counter shows both current moves and optimal minimum — "Moves: 12 / 8 min" format so player sees how close to optimal
- Control buttons (undo, reset, back/menu) below the board — button row underneath, out of the way but easy to reach
- Undo button included in the control row below the board alongside reset and back

### Claude's Discretion
- Exact color values for the rainbow palette
- Specific pattern/texture for the board background
- Typography and font choices
- Exact animation durations and easing curves
- Responsive breakpoint details
- Error state styling
- Loading state design

</decisions>

<specifics>
## Specific Ideas

- Board should feel like a toy/board game — the physical Rush Hour game is the reference point
- Exit gap in the border mirrors the physical game's slot where the red car escapes
- Vehicles should feel like you're picking up and sliding real toy pieces (lift + shadow + 3D shape)
- Stats show optimal moves to create a "beat the minimum" motivation loop

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-board-ui-and-drag-interaction*
*Context gathered: 2026-02-17*
