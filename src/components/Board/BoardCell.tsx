import styles from './BoardCell.module.css';

interface BoardCellProps {
  row: number;
  col: number;
}

export function BoardCell({ row, col }: BoardCellProps) {
  return <div className={styles.cell} data-row={row} data-col={col} />;
}
