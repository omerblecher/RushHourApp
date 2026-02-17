import { useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Vehicle } from '../engine/types';

const GRID_SIZE = 6;
const GAP_PX = 3; // must match --grid-gap in Board.module.css
const BOARD_PADDING = 10; // must match --grid-padding in Board.module.css
const SNAP_DURATION_MS = 150;

interface UseDragOptions {
  vehicleId: string;
  orientation: 'horizontal' | 'vertical';
  onMoveCommit: (vehicleId: string, newRow: number, newCol: number) => void;
}

interface DragState {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startTranslateX: number;
  startTranslateY: number;
  startRow: number;
  startCol: number;
  minPx: number;
  maxPx: number;
  cellSizePx: number;
  boardRect: DOMRect;
}

export function useDrag({
  vehicleId,
  orientation,
  onMoveCommit,
}: UseDragOptions): {
  ref: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getVehicles = useCallback(
    () => useGameStore.getState().state?.vehicles ?? [],
    []
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;

      // Only handle primary pointer (left click / first touch)
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      // Cancel any pending snap animation
      if (snapTimerRef.current !== null) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
        el.style.transition = '';
      }

      // Find the board element via the data-board attribute
      const boardEl = el.closest('[data-board]') as HTMLElement | null;
      if (!boardEl) return;

      // Cache board rect ONCE here — never read in pointermove
      const boardRect = boardEl.getBoundingClientRect();

      // Compute cell size in pixels from actual board dimensions
      const boardInnerW = boardRect.width - 2 * BOARD_PADDING;
      const cellSizePx = (boardInnerW - GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;

      // Get current translate from element (may be non-zero if we're re-grabbing mid-snap)
      const currentTransform = new DOMMatrix(getComputedStyle(el).transform);
      const startTranslateX = currentTransform.m41;
      const startTranslateY = currentTransform.m42;

      // Determine vehicle's current grid position from the data attribute
      const startRow = parseInt(el.dataset.row ?? '0', 10);
      const startCol = parseInt(el.dataset.col ?? '0', 10);

      // Pre-compute collision bounds in pixels
      const vehicles = getVehicles();
      const { minPx, maxPx } = computeCollisionBounds(
        vehicleId,
        orientation,
        startRow,
        startCol,
        vehicles,
        cellSizePx
      );

      dragStateRef.current = {
        pointerId: e.pointerId,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startTranslateX,
        startTranslateY,
        startRow,
        startCol,
        minPx,
        maxPx,
        cellSizePx,
        boardRect,
      };

      // Capture pointer for reliable out-of-element tracking
      el.setPointerCapture(e.pointerId);

      // Apply drag visual
      el.style.willChange = 'transform';
      el.style.zIndex = '100';
      el.style.transition = '';

      setIsDragging(true);
      e.preventDefault();
    },
    [vehicleId, orientation, getVehicles]
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    const el = ref.current;
    if (!ds || !el || e.pointerId !== ds.pointerId) return;

    if (orientation === 'horizontal') {
      const rawDelta = e.clientX - ds.startPointerX + ds.startTranslateX;
      const clamped = Math.min(ds.maxPx, Math.max(ds.minPx, rawDelta));
      el.style.transform = `translate(${clamped}px, 0px)`;
    } else {
      const rawDelta = e.clientY - ds.startPointerY + ds.startTranslateY;
      const clamped = Math.min(ds.maxPx, Math.max(ds.minPx, rawDelta));
      el.style.transform = `translate(0px, ${clamped}px)`;
    }
  }, [orientation]);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const ds = dragStateRef.current;
      const el = ref.current;
      if (!ds || !el || e.pointerId !== ds.pointerId) return;

      dragStateRef.current = null;

      // Read current transform delta
      const currentTransform = new DOMMatrix(getComputedStyle(el).transform);
      const currentTranslateX = currentTransform.m41;
      const currentTranslateY = currentTransform.m42;

      const { cellSizePx, startRow, startCol } = ds;

      // Calculate snapped grid position
      let newRow = startRow;
      let newCol = startCol;

      if (orientation === 'horizontal') {
        // Delta in pixels from original position
        const delta = currentTranslateX - ds.startTranslateX;
        const cellsMoved = Math.round(delta / (cellSizePx + GAP_PX));
        newCol = Math.max(0, Math.min(GRID_SIZE - 1, startCol + cellsMoved));
      } else {
        const delta = currentTranslateY - ds.startTranslateY;
        const cellsMoved = Math.round(delta / (cellSizePx + GAP_PX));
        newRow = Math.max(0, Math.min(GRID_SIZE - 1, startRow + cellsMoved));
      }

      // Apply snap animation
      el.style.transition = `transform ${SNAP_DURATION_MS}ms ease-out`;

      if (orientation === 'horizontal') {
        // Snap to exactly the correct pixel offset from start
        const targetCells = newCol - startCol;
        const targetPx = targetCells * (cellSizePx + GAP_PX);
        el.style.transform = `translate(${targetPx + ds.startTranslateX}px, 0px)`;
      } else {
        const targetCells = newRow - startRow;
        const targetPx = targetCells * (cellSizePx + GAP_PX);
        el.style.transform = `translate(0px, ${targetPx + ds.startTranslateY}px)`;
      }

      // After animation: commit move to store (React re-renders vehicle to correct absolute position, reset transform)
      snapTimerRef.current = setTimeout(() => {
        snapTimerRef.current = null;
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.style.zIndex = '';

        // Commit move if position changed
        if (newRow !== startRow || newCol !== startCol) {
          onMoveCommit(vehicleId, newRow, newCol);
        }
      }, SNAP_DURATION_MS);

      el.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    },
    [vehicleId, orientation, onMoveCommit]
  );

  // Attach/detach pointer event listeners via callback ref pattern
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      // Remove listeners from old element
      const old = ref.current;
      if (old) {
        old.removeEventListener('pointerdown', onPointerDown);
        old.removeEventListener('pointermove', onPointerMove);
        old.removeEventListener('pointerup', onPointerUp);
        old.removeEventListener('pointercancel', onPointerUp);
      }

      // Add listeners to new element
      if (el) {
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
      }

      ref.current = el;
    },
    [onPointerDown, onPointerMove, onPointerUp]
  );

  // Return a proxy ref that installs/removes listeners
  const proxyRef = useRef<HTMLDivElement | null>(null);

  // Use a stable ref object with a custom setter
  const stableRef = useRef<{ current: HTMLDivElement | null }>({
    get current() {
      return proxyRef.current;
    },
    set current(el: HTMLDivElement | null) {
      if (el !== proxyRef.current) {
        setRef(el);
        proxyRef.current = el;
      }
    },
  });

  return {
    ref: stableRef.current as React.RefObject<HTMLDivElement | null>,
    isDragging,
  };
}

/**
 * Pre-computes the min and max pixel translate values that the vehicle
 * can move without hitting another vehicle or the board walls.
 *
 * Returns values relative to the vehicle's current position (so 0 means
 * no movement, positive means right/down, negative means left/up).
 */
function computeCollisionBounds(
  vehicleId: string,
  orientation: 'horizontal' | 'vertical',
  startRow: number,
  startCol: number,
  vehicles: Vehicle[],
  cellSizePx: number
): { minPx: number; maxPx: number } {
  // Build occupancy grid
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );

  for (const v of vehicles) {
    const size = v.size;
    if (v.orientation === 'horizontal') {
      for (let i = 0; i < size; i++) {
        grid[v.position.row][v.position.col + i] = v.id;
      }
    } else {
      for (let i = 0; i < size; i++) {
        grid[v.position.row + i][v.position.col] = v.id;
      }
    }
  }

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return { minPx: 0, maxPx: 0 };

  const size = vehicle.size;
  const cellStep = cellSizePx + GAP_PX;

  if (orientation === 'horizontal') {
    // Scan left from startCol for blocker/wall
    let minCol = 0;
    for (let c = startCol - 1; c >= 0; c--) {
      if (grid[startRow][c] !== null && grid[startRow][c] !== vehicleId) {
        minCol = c + 1;
        break;
      }
    }

    // Scan right from startCol+size for blocker/wall
    let maxCol = GRID_SIZE - size;
    for (let c = startCol + size; c < GRID_SIZE; c++) {
      if (grid[startRow][c] !== null && grid[startRow][c] !== vehicleId) {
        maxCol = c - size;
        break;
      }
    }

    const minPx = (minCol - startCol) * cellStep;
    const maxPx = (maxCol - startCol) * cellStep;
    return { minPx, maxPx };
  } else {
    // Scan up from startRow for blocker/wall
    let minRow = 0;
    for (let r = startRow - 1; r >= 0; r--) {
      if (grid[r][startCol] !== null && grid[r][startCol] !== vehicleId) {
        minRow = r + 1;
        break;
      }
    }

    // Scan down from startRow+size for blocker/wall
    let maxRow = GRID_SIZE - size;
    for (let r = startRow + size; r < GRID_SIZE; r++) {
      if (grid[r][startCol] !== null && grid[r][startCol] !== vehicleId) {
        maxRow = r - size;
        break;
      }
    }

    const minPx = (minRow - startRow) * cellStep;
    const maxPx = (maxRow - startRow) * cellStep;
    return { minPx, maxPx };
  }
}
