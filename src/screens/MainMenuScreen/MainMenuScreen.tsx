import { useNavigate } from 'react-router';
import styles from './MainMenuScreen.module.css';

// Decorative static puzzle board illustration
function PuzzlePreview() {
  // Board geometry
  const CELL = 36, GAP = 3, PAD = 8;
  const BOARD = 2 * PAD + 6 * CELL + 5 * GAP; // 247
  const SVG_W = BOARD + 22;
  const SVG_H = BOARD;
  const EXIT_Y = PAD + 2 * (CELL + GAP) + CELL / 2; // center of row 2 = 104

  // Vehicle: [col, row, sizeH, sizeV, color, stroke]
  const vehicles: [number, number, number, number, string, string][] = [
    [2, 2, 2, 1, '#e63946', '#c1121f'], // X — red target car (H)
    [1, 1, 2, 1, '#4a90d9', '#2872b5'], // A — blue car (H)
    [1, 3, 1, 2, '#2ecc71', '#27ae60'], // B — green car (V)
    [4, 1, 1, 2, '#e67e22', '#ca6f1e'], // C — orange car (V)
    [3, 4, 2, 1, '#9b59b6', '#7d3c98'], // D — purple car (H)
    [0, 0, 1, 2, '#f39c12', '#d68910'], // E — amber car (V)
    [5, 3, 1, 3, '#1abc9c', '#17a589'], // F — teal truck (V)
  ];

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.65))' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3d1e" />
          <stop offset="100%" stopColor="#3d2810" />
        </linearGradient>
      </defs>

      {/* Board frame */}
      <rect x={0} y={0} width={BOARD} height={BOARD} rx={10} fill="url(#boardGrad)" />
      {/* Inner surface */}
      <rect x={5} y={5} width={BOARD - 10} height={BOARD - 10} rx={7} fill="#7a5230" opacity={0.6} />
      {/* Grid cells */}
      {Array.from({ length: 36 }, (_, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        return (
          <rect
            key={i}
            x={PAD + col * (CELL + GAP)}
            y={PAD + row * (CELL + GAP)}
            width={CELL} height={CELL}
            rx={3} fill="#8B6640" opacity={0.45}
          />
        );
      })}

      {/* Exit slot cutout (hides board frame at row 2 right edge) */}
      <rect x={BOARD - 6} y={EXIT_Y - CELL / 2} width={10} height={CELL} fill="#1a0f00" />
      {/* Exit arrow */}
      <polygon
        points={`${BOARD + 2},${EXIT_Y - 11} ${BOARD + 2},${EXIT_Y + 11} ${BOARD + 18},${EXIT_Y}`}
        fill="#f5c842"
      />

      {/* Vehicles */}
      {vehicles.map(([col, row, sw, sh, color, stroke], i) => {
        const x = PAD + col * (CELL + GAP);
        const y = PAD + row * (CELL + GAP);
        const w = sw * CELL + (sw - 1) * GAP;
        const h = sh * CELL + (sh - 1) * GAP;
        const isTarget = i === 0;
        return (
          <g key={i} filter={isTarget ? 'url(#glow)' : undefined}>
            {/* Shadow */}
            <rect x={x + 2} y={y + 3} width={w} height={h} rx={6} fill="rgba(0,0,0,0.45)" />
            {/* Body */}
            <rect x={x} y={y} width={w} height={h} rx={6} fill={color} stroke={stroke} strokeWidth={1.5} />
            {/* Highlight */}
            <rect x={x + 4} y={y + 4} width={w - 8} height={Math.min(9, h - 8)} rx={3} fill="rgba(255,255,255,0.28)" />
          </g>
        );
      })}
    </svg>
  );
}

export function MainMenuScreen() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.puzzlePreview}>
          <PuzzlePreview />
        </div>
        <h1 className={styles.title}>Rush Hour</h1>
        <p className={styles.subtitle}>Slide the cars. Free the red one.</p>
        <button
          className={styles.playButton}
          onClick={() => navigate('/puzzles')}
        >
          Play
        </button>
      </div>
    </div>
  );
}
