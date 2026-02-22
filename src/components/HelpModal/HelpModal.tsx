import styles from './HelpModal.module.css';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="How to play">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>How to Play</h2>
        <div className={styles.body}>
          <p>Slide vehicles to clear a path for the <strong>red car</strong> to reach the exit on the right side of the board.</p>
          <ul>
            <li>Drag vehicles left/right or up/down along their axis.</li>
            <li>Vehicles cannot pass through each other.</li>
            <li>Free the red car to win!</li>
            <li>Fewer moves = better score.</li>
          </ul>
          <p><strong>Controls:</strong></p>
          <ul>
            <li><strong>Mouse/Touch:</strong> Drag vehicles directly.</li>
            <li><strong>Keyboard:</strong> Tab to select a vehicle, Arrow Keys to move, Escape to deselect.</li>
          </ul>
        </div>
        <button className={styles.closeButton} onClick={onClose} autoFocus>
          Got it!
        </button>
      </div>
    </div>
  );
}
