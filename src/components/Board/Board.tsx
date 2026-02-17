import { useGameStore } from '../../store/gameStore';
import { BoardCell } from './BoardCell';
import { Vehicle } from '../Vehicle/Vehicle';
import styles from './Board.module.css';

const GRID_SIZE = 6;

export function Board() {
  const state = useGameStore((s) => s.state);

  // Render 36 grid cells
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    return <BoardCell key={`${row}-${col}`} row={row} col={col} />;
  });

  return (
    <div className={styles.boardWrapper} data-board>
      <div className={styles.board}>
        {/* Exit marker — gap/cutout on right border at row 3 (index 2) */}
        <div className={styles.exitMarker} aria-label="Exit" />

        {/* Grid container */}
        <div className={styles.gridContainer}>
          {cells}
        </div>

        {/* Vehicle layer absolutely positioned over the grid */}
        <div className={styles.vehicleLayer}>
          {state?.vehicles.map((vehicle) => (
            <Vehicle key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </div>
  );
}
