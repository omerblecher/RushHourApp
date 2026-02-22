import { Howl, Howler } from 'howler';

const MUTE_KEY = 'rushhour_muted';

// Create Howl instances once at module load
const slideSound = new Howl({
  src: ['/sounds/slide.mp3'],
  volume: 0.6,
  preload: true,
});

const winSound = new Howl({
  src: ['/sounds/win.mp3'],
  volume: 0.8,
  preload: true,
});

const startSound = new Howl({
  src: ['/sounds/level-start.mp3'],
  volume: 0.7,
  preload: true,
});

// Apply persisted mute state immediately on module load
// Howler.mute(true) silences ALL Howl instances globally
const savedMuted = localStorage.getItem(MUTE_KEY) === 'true';
Howler.mute(savedMuted);

export const soundService = {
  playSlide: () => slideSound.play(),
  playWin: () => winSound.play(),
  playStart: () => startSound.play(),

  setMuted: (muted: boolean) => {
    Howler.mute(muted);
    localStorage.setItem(MUTE_KEY, String(muted));
  },

  isMuted: (): boolean => localStorage.getItem(MUTE_KEY) === 'true',

  // Play a soft chime on unmute to confirm audio is restored (user decision)
  // Reuses startSound as the chime — short and appropriate
  playUnmuteChime: () => startSound.play(),
};
