import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundService } from '../services/soundService';
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
}

export function useDrag({
  vehicleId,
  orientation,
  onMoveCommit,
}: UseDragOptions): {
  ref: React.RefCallback<HTMLDivElement>;
  isDragging: boolean;
} {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store latest values in refs so event handlers always see current values
  const vehicleIdRef = useRef(vehicleId);
  const orientationRef = useRef(orientation);
  const onMoveCommitRef = useRef(onMoveCommit);
  vehicleIdRef.current = vehicleId;
  orientationRef.current = orientation;
  onMoveCommitRef.current = onMoveCommit;

  // Stable event handlers that read from refs
  const handlersRef = useRef({
    onPointerDown(e: PointerEvent) {
      const el = elRef.current;
      if (!el) return;

      // Only handle primary pointer
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      // Cancel any pending snap animation
      if (snapTimerRef.current !== null) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
        el.style.transition = '';
      }

      // Find the board element
      const boardEl = el.closest('[data-board]') as HTMLElement | null;
      if (!boardEl) return;

      // Cache board rect ONCE
      const boardRect = boardEl.getBoundingClientRect();
      const boardInnerW = boardRect.width - 2 * BOARD_PADDING;
      const cellSizePx = (boardInnerW - GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;

      // Get current translate
      const currentTransform = new DOMMatrix(getComputedStyle(el).transform);
      const startTranslateX = currentTransform.m41;
      const startTranslateY = currentTransform.m42;

      // Vehicle's current grid position
      const startRow = parseInt(el.dataset.row ?? '0', 10);
      const startCol = parseInt(el.dataset.col ?? '0', 10);

      // Pre-compute collision bounds
      const vehicles = useGameStore.getState().state?.vehicles ?? [];
      const { minPx, maxPx } = computeCollisionBounds(
        vehicleIdRef.current,
        orientationRef.current,
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
      };

      el.setPointerCapture(e.pointerId);
      el.style.willChange = 'transform';
      el.style.zIndex = '100';
      el.style.transition = '';

      setIsDragging(true);
      e.preventDefault();
    },

    onPointerMove(e: PointerEvent) {
      const ds = dragStateRef.current;
      const el = elRef.current;
      if (!ds || !el || e.pointerId !== ds.pointerId) return;

      if (orientationRef.current === 'horizontal') {
        const rawDelta = e.clientX - ds.startPointerX + ds.startTranslateX;
        const clamped = Math.min(ds.maxPx, Math.max(ds.minPx, rawDelta));
        el.style.transform = `translate(${clamped}px, 0px)`;
      } else {
        const rawDelta = e.clientY - ds.startPointerY + ds.startTranslateY;
        const clamped = Math.min(ds.maxPx, Math.max(ds.minPx, rawDelta));
        el.style.transform = `translate(0px, ${clamped}px)`;
      }
    },

    onPointerUp(e: PointerEvent) {
      const ds = dragStateRef.current;
      const el = elRef.current;
      if (!ds || !el || e.pointerId !== ds.pointerId) return;

      dragStateRef.current = null;

      const currentTransform = new DOMMatrix(getComputedStyle(el).transform);
      const currentTranslateX = currentTransform.m41;
      const currentTranslateY = currentTransform.m42;

      const { cellSizePx, startRow, startCol } = ds;
      const cellStep = cellSizePx + GAP_PX;

      let newRow = startRow;
      let newCol = startCol;

      if (orientationRef.current === 'horizontal') {
        const delta = currentTranslateX - ds.startTranslateX;
        const cellsMoved = Math.round(delta / cellStep);
        newCol = Math.max(0, Math.min(GRID_SIZE - 1, startCol + cellsMoved));
      } else {
        const delta = currentTranslateY - ds.startTranslateY;
        const cellsMoved = Math.round(delta / cellStep);
        newRow = Math.max(0, Math.min(GRID_SIZE - 1, startRow + cellsMoved));
      }

      // Snap animation
      el.style.transition = `transform ${SNAP_DURATION_MS}ms ease-out`;

      if (orientationRef.current === 'horizontal') {
        const targetCells = newCol - startCol;
        const targetPx = targetCells * cellStep;
        el.style.transform = `translate(${targetPx + ds.startTranslateX}px, 0px)`;
      } else {
        const targetCells = newRow - startRow;
        const targetPx = targetCells * cellStep;
        el.style.transform = `translate(0px, ${targetPx + ds.startTranslateY}px)`;
      }

      snapTimerRef.current = setTimeout(() => {
        snapTimerRef.current = null;
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.style.zIndex = '';

        if (newRow !== startRow || newCol !== startCol) {
          soundService.playSlide();
          onMoveCommitRef.current(vehicleIdRef.current, newRow, newCol);
        }
      }, SNAP_DURATION_MS);

      el.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    },
  });

  // Callback ref — attaches/detaches listeners when element mounts/unmounts
  const callbackRef = useCallback((el: HTMLDivElement | null) => {
    const old = elRef.current;
    if (old) {
      old.removeEventListener('pointerdown', handlersRef.current.onPointerDown);
      old.removeEventListener('pointermove', handlersRef.current.onPointerMove);
      old.removeEventListener('pointerup', handlersRef.current.onPointerUp);
      old.removeEventListener('pointercancel', handlersRef.current.onPointerUp);
    }

    elRef.current = el;

    if (el) {
      el.addEventListener('pointerdown', handlersRef.current.onPointerDown);
      el.addEventListener('pointermove', handlersRef.current.onPointerMove);
      el.addEventListener('pointerup', handlersRef.current.onPointerUp);
      el.addEventListener('pointercancel', handlersRef.current.onPointerUp);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  return {
    ref: callbackRef,
    isDragging,
  };
}

/**
 * Pre-computes the min and max pixel translate values that the vehicle
 * can move without hitting another vehicle or the board walls.
 */
function computeCollisionBounds(
  vehicleId: string,
  orientation: 'horizontal' | 'vertical',
  startRow: number,
  startCol: number,
  vehicles: Vehicle[],
  cellSizePx: number
): { minPx: number; maxPx: number } {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );

  for (const v of vehicles) {
    if (v.orientation === 'horizontal') {
      for (let i = 0; i < v.size; i++) {
        grid[v.position.row][v.position.col + i] = v.id;
      }
    } else {
      for (let i = 0; i < v.size; i++) {
        grid[v.position.row + i][v.position.col] = v.id;
      }
    }
  }

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return { minPx: 0, maxPx: 0 };

  const size = vehicle.size;
  const cellStep = cellSizePx + GAP_PX;

  if (orientation === 'horizontal') {
    let minCol = 0;
    for (let c = startCol - 1; c >= 0; c--) {
      if (grid[startRow][c] !== null && grid[startRow][c] !== vehicleId) {
        minCol = c + 1;
        break;
      }
    }

    let maxCol = GRID_SIZE - size;
    for (let c = startCol + size; c < GRID_SIZE; c++) {
      if (grid[startRow][c] !== null && grid[startRow][c] !== vehicleId) {
        maxCol = c - size;
        break;
      }
    }

    return {
      minPx: (minCol - startCol) * cellStep,
      maxPx: (maxCol - startCol) * cellStep,
    };
  } else {
    let minRow = 0;
    for (let r = startRow - 1; r >= 0; r--) {
      if (grid[r][startCol] !== null && grid[r][startCol] !== vehicleId) {
        minRow = r + 1;
        break;
      }
    }

    let maxRow = GRID_SIZE - size;
    for (let r = startRow + size; r < GRID_SIZE; r++) {
      if (grid[r][startCol] !== null && grid[r][startCol] !== vehicleId) {
        maxRow = r - size;
        break;
      }
    }

    return {
      minPx: (minRow - startRow) * cellStep,
      maxPx: (maxRow - startRow) * cellStep,
    };
  }
}
