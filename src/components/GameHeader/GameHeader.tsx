import { useState } from 'react';
import { soundService } from '../../services/soundService';
import { HelpModal } from '../HelpModal/HelpModal';
import { AboutModal } from '../AboutModal/AboutModal';
import styles from './GameHeader.module.css';

export function GameHeader() {
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isMuted());
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleMuteToggle = () => {
    const next = !isMuted;
    soundService.setMuted(next);
    if (!next) soundService.playUnmuteChime(); // confirm audio on unmute
    setIsMuted(next);
  };

  return (
    <header className={styles.header} role="banner">
      <button
        className={styles.iconButton}
        onClick={handleMuteToggle}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={isMuted}
        title={isMuted ? 'Unmute sound' : 'Mute sound'}
      >
        {/* Standard speaker iconography per user decision */}
        {isMuted ? '🔇' : '🔊'}
      </button>

      <button
        className={styles.iconButton}
        onClick={() => setShowHelp(true)}
        aria-label="How to play"
        title="How to play"
      >
        ?
      </button>

      <button
        className={styles.iconButton}
        onClick={() => setShowAbout(true)}
        aria-label="About"
        title="About"
      >
        i
      </button>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </header>
  );
}
