import styles from './AboutModal.module.css';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="About">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>About</h2>
        <div className={styles.body}>
          <p>Rush Hour Puzzle Game</p>
          <p>Built with React, TypeScript, Vite, Zustand, and Firebase.</p>
          <p>Sound effects from Freesound.org.</p>
          <p>Puzzle logic inspired by the classic Rush Hour board game by ThinkFun.</p>
        </div>
        <button className={styles.closeButton} onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}
