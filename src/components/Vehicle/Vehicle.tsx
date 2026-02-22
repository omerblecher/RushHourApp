import type { Vehicle as VehicleType } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { useDrag } from '../../hooks/useDrag';
import { getVehicleColor } from '../../utils/vehicleColors';
import styles from './Vehicle.module.css';

interface VehicleProps {
  vehicle: VehicleType;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const GRID_SIZE = 6;
const GAP_PX = 3; // must match --grid-gap in Board.module.css

/**
 * Vehicle rendered as an absolutely-positioned pill over the board.
 *
 * Positioning formula (accounts for 3px gaps between cells):
 *   cellSize = (100% - (GRID_SIZE - 1) * GAP) / GRID_SIZE
 *   left/top = col * (cellSize + GAP)
 *   width = size * cellSize + (size - 1) * GAP
 */
export function Vehicle({ vehicle, isSelected = false, onSelect }: VehicleProps) {
  const { id, position, size, orientation } = vehicle;
  const color = getVehicleColor(id);
  const move = useGameStore((s) => s.move);

  const { ref, isDragging } = useDrag({
    vehicleId: id,
    orientation,
    onMoveCommit: move,
  });

  const isHorizontal = orientation === 'horizontal';
  const isTargetCar = id === 'X';
  const isTruck = size === 3;

  // Cell size in % of vehicle-layer total width/height:
  // cellPct = (100 - (GRID_SIZE-1) * GAP_PX / totalPx * 100) / GRID_SIZE
  // Since we're mixing units (% and px) we use CSS calc.
  // Let W = 100% of vehicle layer.
  // cellW = (W - 5 * 3px) / 6
  // left  = col  * (cellW + 3px)  = col  * ((W - 15px)/6 + 3px)
  // width = size * cellW + (size-1) * 3px = size * (W-15px)/6 + (size-1)*3px

  const nGaps = GRID_SIZE - 1; // 5
  const gapTotal = `${nGaps * GAP_PX}px`; // "15px"

  const cellW = `calc((100% - ${gapTotal}) / ${GRID_SIZE})`;
  const cellH = `calc((100% - ${gapTotal}) / ${GRID_SIZE})`;

  const col = position.col;
  const row = position.row;

  const left = col === 0
    ? '0px'
    : `calc(${col} * (${cellW} + ${GAP_PX}px))`;
  const top = row === 0
    ? '0px'
    : `calc(${row} * (${cellH} + ${GAP_PX}px))`;

  const width = `calc(${size} * ${cellW} + ${(size - 1) * GAP_PX}px)`;
  const height = `calc(${size} * ${cellH} + ${(size - 1) * GAP_PX}px)`;

  // Build gradient based on vehicle color
  const bgGradient = `linear-gradient(160deg, ${lighten(color.bg, 22)} 0%, ${color.bg} 55%, ${darken(color.bg, 12)} 100%)`;

  const positionStyle: React.CSSProperties = {
    left: isHorizontal ? left : left,
    top: isHorizontal ? top : top,
    width: isHorizontal ? width : cellW,
    height: isHorizontal ? cellH : height,
  };

  const colorStyle: React.CSSProperties = {
    background: bgGradient,
    borderColor: color.border,
  };

  // Target car gets its glow via CSS animation; others get standard shadow
  const shadowStyle: React.CSSProperties = isTargetCar ? {} : {
    boxShadow: `0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 2px ${color.border}`,
  };

  // Merge focused shadow on top if selected — inline styles win over CSS classes,
  // so we apply the gold focus ring via inline style for all vehicles (incl. target car)
  const focusedShadow: React.CSSProperties = isSelected ? {
    boxShadow: `0 3px 8px rgba(0,0,0,0.4), 0 0 12px rgba(245,200,66,0.6), 0 0 24px rgba(245,200,66,0.3), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 3px #f5c842`,
    zIndex: 50,
  } : {};

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

  return (
    <div
      ref={ref}
      className={classNames}
      style={{ ...positionStyle, ...colorStyle, ...shadowStyle, ...focusedShadow }}
      data-vehicle-id={id}
      data-orientation={orientation}
      data-row={row}
      data-col={col}
      tabIndex={0}
      role="gridcell"
      aria-label={`${isTargetCar ? 'Target car' : `Vehicle ${id}`}, ${orientation}, ${size === 3 ? 'truck' : 'car'}`}
      aria-selected={isSelected}
      onClick={() => onSelect?.(id)}
      onFocus={() => onSelect?.(id)}
      title={`Vehicle ${id}`}
    />
  );
}

/** Lighten a hex color by adding amount to each RGB channel */
function lighten(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}

/** Darken a hex color by subtracting amount from each RGB channel */
function darken(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

function adjustColor(hex: string, amount: number): string {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
