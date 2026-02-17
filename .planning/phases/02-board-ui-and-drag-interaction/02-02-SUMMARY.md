---
phase: 02-board-ui-and-drag-interaction
plan: 02
subsystem: ui
tags: [drag, pointer-events, animation, hud, controls, zustand]

requires:
  - phase: 02-board-ui-and-drag-interaction
    plan: 01
    provides: Vehicle component with touch-action none and data attributes, Board with vehicleLayer, gameStore with move/undo/reset

provides:
  - useDrag hook with axis-constrained pointer-event drag (60fps via direct DOM transform)
  - Collision bounds pre-computed on pointerdown for O(1) clamping during drag
  - Snap-to-grid on release with 150ms ease-out animation
  - Drag visual feedback: scale(1.05) lift and elevated box-shadow during drag
  - Hover highlight: brightness(1.08) + scale(1.02) on :not(.dragging):hover
  - GameHUD component showing "Moves: N / M min" and live M:SS timer
  - ControlBar component with undo/reset/back buttons and proper disabled states
  - Full game loop: drag vehicles -> moves count up -> undo/reset works

affects:
  - 02-03-game-ui (Phase 3 will add routing to Back button, win screen)

tech-stack:
  added: []
  patterns:
    - Direct DOM transform mutation in pointermove (no React setState per frame = 60fps)
    - Pointer capture via setPointerCapture for reliable out-of-element tracking
    - Collision bounds computed once on pointerdown via occupancy grid scan
    - pointercancel handled identically to pointerup to prevent stuck drag state
    - useEffect + setInterval(1000) for live timer with proper cleanup on unmount/win/reset

key-files:
  created:
    - src/components/GameHUD/GameHUD.tsx
    - src/components/GameHUD/GameHUD.module.css
    - src/components/ControlBar/ControlBar.tsx
    - src/components/ControlBar/ControlBar.module.css
  modified:
    - src/hooks/useDrag.ts (committed as new file — existed but untracked)
    - src/components/Vehicle/Vehicle.tsx (added useDrag integration, data-row/data-col, dragging class)
    - src/components/Vehicle/Vehicle.module.css (added .dragging and :hover styles)
    - src/components/Board/Board.tsx (added data-board attribute)
    - src/App.tsx (added GameHUD + ControlBar, minMoves=8 passed to loadPuzzle)
    - src/App.module.css (tightened gap to 12px)

key-decisions:
  - "data-board attribute on boardWrapper lets useDrag resolve board rect via el.closest('[data-board]') — no React ref threading needed"
  - "data-row and data-col attributes on each Vehicle div give useDrag the grid position without a store read in event handler"
  - "Snap commit is delayed by 150ms (matching CSS transition) so React re-renders after animation completes — avoids visual jump"
  - "Timer freezes via endTime branch in useEffect — same cleanup pattern as normal interval cleanup"
  - "ControlBar Back button shows alert placeholder; routing added in Phase 3"

metrics:
  duration: 2min
  completed: 2026-02-17
  tasks: 2
  files_modified: 10
---

# Phase 2 Plan 02: Drag Interaction and Game HUD Summary

**Pointer-event drag system with axis constraint, pre-computed collision bounds, 150ms snap animation, hover/drag visual feedback, plus GameHUD showing move counter and timer, and ControlBar with undo/reset/back buttons**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T11:40:15Z
- **Completed:** 2026-02-17T11:42:23Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- useDrag hook wired into Vehicle component: pointer events captured, axis-constrained drag via direct DOM transform (no React re-renders in the drag loop)
- Collision bounds pre-computed on pointerdown by scanning occupancy grid — O(1) clamping in pointermove
- Release snaps to nearest valid grid cell with `transform 150ms ease-out`, React re-renders after animation completes
- Vehicle has `.dragging` CSS class (scale 1.05, heavy shadow) applied during drag; `:not(.dragging):hover` adds brightness+scale hover hint
- Board gains `data-board` attribute; Vehicle gains `data-row`/`data-col` for coordinate resolution without store reads in hot path
- GameHUD renders live move counter ("Moves: N / 8 min") and M:SS timer; timer starts on first move, freezes on puzzle win
- ControlBar renders undo/reset/back buttons with disabled states and 44px+ touch targets
- `npx tsc --noEmit` passes; `vite build` succeeds in 816ms

## Task Commits

Each task was committed atomically:

1. **Task 1: useDrag hook wired into Vehicle + Board data-board attribute** - `559db05` (feat)
2. **Task 2: GameHUD and ControlBar, App.tsx layout update** - `b7595b9` (feat)

## Files Created/Modified

- `src/hooks/useDrag.ts` - Custom pointer-event drag hook with axis constraint, collision pre-computation, snap animation
- `src/components/Vehicle/Vehicle.tsx` - Integrated useDrag, added data-row/data-col, .dragging class
- `src/components/Vehicle/Vehicle.module.css` - Added .dragging (lift shadow, scale) and :hover highlight
- `src/components/Board/Board.tsx` - Added data-board attribute on boardWrapper
- `src/components/GameHUD/GameHUD.tsx` - Move counter + live timer, formatTime(M:SS)
- `src/components/GameHUD/GameHUD.module.css` - Scoreboard dark strip, monospace value, muted label
- `src/components/ControlBar/ControlBar.tsx` - Undo/Reset/Back buttons with disabled states
- `src/components/ControlBar/ControlBar.module.css` - 44px+ touch targets, press scale effect, disabled opacity
- `src/App.tsx` - Added GameHUD + ControlBar layout, passes minMoves=8 to loadPuzzle
- `src/App.module.css` - Tightened gap to 12px for compact three-section layout

## Decisions Made

- **data-board attribute for coordinate resolution:** Allows useDrag to call `el.closest('[data-board]')` to find the board element and cache its bounding rect on pointerdown — no prop drilling or React context needed.
- **data-row/data-col on vehicle div:** Drag start position read from DOM data attributes, avoiding a store selector call inside a non-React event handler.
- **150ms snap delay before store commit:** CSS transition animates the snap visually, then `setTimeout(150ms)` fires to reset transform, clear styles, and call `onMoveCommit` — React re-renders the vehicle to its new absolute position after the visual snap completes.
- **Timer freeze logic via endTime:** The useEffect dependency array includes `endTime`; when game is won, the branch `endTime !== null` computes fixed elapsed and returns (no interval set), cleanly freezing the display.

## Deviations from Plan

None - plan executed exactly as written. The `useDrag.ts` file already existed as an untracked file from plan authoring; it was committed as part of Task 1 unchanged.

## Issues Encountered

None. Both tasks compiled and built cleanly on the first attempt.

## User Setup Required

None — run `npm run dev` to start the dev server and see the full interactive game.

## Next Phase Readiness

- Full drag interaction implemented and functional (Phase 2 requirements REQ-011 through REQ-024, NFR-001, NFR-008 satisfied)
- ControlBar Back/Menu button is a placeholder — Phase 3 adds React Router and puzzle selection screen
- `startTime`/`endTime`/`isWon` from store ready for win screen animation (Phase 5 polish)
- Timer logic is self-contained; Phase 3 can reset it by resetting the puzzle via store

---
*Phase: 02-board-ui-and-drag-interaction*
*Completed: 2026-02-17*

## Self-Check: PASSED

- All 10 created/modified files verified present on disk
- Both task commits (559db05, b7595b9) verified in git log
- `npx tsc --noEmit` passes with zero errors
- `vite build` succeeds in 816ms
