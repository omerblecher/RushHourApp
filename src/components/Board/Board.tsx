import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundService } from '../../services/soundService';
import { BoardCell } from './BoardCell';
import { Vehicle } from '../Vehicle/Vehicle';
import styles from './Board.module.css';

const GRID_SIZE = 6;

interface BoardProps {
  isWinAnimating: boolean;
}

export function Board({ isWinAnimating }: BoardProps) {
  const state = useGameStore((s) => s.state);
  const move = useGameStore((s) => s.move);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Render 36 grid cells
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    return <BoardCell key={`${row}-${col}`} row={row} col={col} />;
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // No vehicle selected or board locked during win animation — ignore all
    if (!selectedVehicleId || isWinAnimating) return;

    const vehicle = state?.vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;

    if (e.key === 'Escape') {
      setSelectedVehicleId(null);
      return;
    }

    const isHorizontal = vehicle.orientation === 'horizontal';
    let dr = 0;
    let dc = 0;

    if (e.key === 'ArrowLeft' && isHorizontal) dc = -1;
    else if (e.key === 'ArrowRight' && isHorizontal) dc = 1;
    else if (e.key === 'ArrowUp' && !isHorizontal) dr = -1;
    else if (e.key === 'ArrowDown' && !isHorizontal) dr = 1;
    else return; // Invalid-axis key press — silently ignored per user decision

    // Prevent page scroll on arrow key presses when vehicle is selected
    e.preventDefault();

    const result = move(selectedVehicleId, vehicle.position.row + dr, vehicle.position.col + dc);
    if (result?.success) {
      soundService.playSlide();
    }
  };

  return (
    <div
      className={styles.boardWrapper}
      data-board
      style={isWinAnimating ? { pointerEvents: 'none' } : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className={[styles.board, isWinAnimating ? styles.winGlow : ''].filter(Boolean).join(' ')}>
        {/* Exit marker — gap/cutout on right border at row 3 (index 2) */}
        <div className={styles.exitMarker} aria-label="Exit" />

        {/* Grid container */}
        <div
          className={styles.gridContainer}
          role="grid"
          aria-label="Rush Hour puzzle board, 6 by 6 grid"
        >
          {cells}
        </div>

        {/* Vehicle layer absolutely positioned over the grid */}
        <div
          className={styles.vehicleLayer}
          style={isWinAnimating ? { pointerEvents: 'none' } : undefined}
        >
          {state?.vehicles.map((vehicle) => (
            <Vehicle
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={vehicle.id === selectedVehicleId}
              onSelect={setSelectedVehicleId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
