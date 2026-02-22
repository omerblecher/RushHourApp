const MUTE_KEY = 'rushhour_muted';

// Howler instances are created lazily on first use to avoid adding
// howler to the initial JS bundle (saves ~10 KB gzip on initial load).
let slideSound: import('howler').Howl | null = null;
let winSound: import('howler').Howl | null = null;
let startSound: import('howler').Howl | null = null;

async function getHowler() {
  const { Howl, Howler } = await import('howler');

  if (!slideSound) {
    slideSound = new Howl({ src: ['/sounds/slide.mp3'], volume: 0.6, preload: true });
  }
  if (!winSound) {
    winSound = new Howl({ src: ['/sounds/win.mp3'], volume: 0.8, preload: true });
  }
  if (!startSound) {
    startSound = new Howl({ src: ['/sounds/level-start.mp3'], volume: 0.7, preload: true });
  }

  // Apply persisted mute state each time we (re)initialize Howler
  const savedMuted = localStorage.getItem(MUTE_KEY) === 'true';
  Howler.mute(savedMuted);

  return { Howl, Howler, slideSound: slideSound!, winSound: winSound!, startSound: startSound! };
}

export const soundService = {
  playSlide: () => {
    void getHowler().then(({ slideSound }) => slideSound.play());
  },
  playWin: () => {
    void getHowler().then(({ winSound }) => winSound.play());
  },
  playStart: () => {
    void getHowler().then(({ startSound }) => startSound.play());
  },

  setMuted: (muted: boolean) => {
    localStorage.setItem(MUTE_KEY, String(muted));
    void import('howler').then(({ Howler }) => Howler.mute(muted));
  },

  isMuted: (): boolean => localStorage.getItem(MUTE_KEY) === 'true',

  // Play a soft chime on unmute to confirm audio is restored (user decision)
  // Reuses startSound as the chime — short and appropriate
  playUnmuteChime: () => {
    void getHowler().then(({ startSound }) => startSound.play());
  },
};
