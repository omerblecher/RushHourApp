const MUTE_KEY = 'rushhour_muted';
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

async function ensureRunning(): Promise<AudioContext> {
  const c = getCtx();
  if (c.state === 'suspended') await c.resume();
  return c;
}

function playTone(c: AudioContext, freq: number, startTime: number, duration: number, gainPeak = 0.4) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

async function playSlideSound() {
  const c = await ensureRunning();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.13);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc.start(now);
  osc.stop(now + 0.14);
}

async function playWinSound() {
  const c = await ensureRunning();
  const now = c.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  const noteDuration = 0.14;
  notes.forEach((freq, i) => {
    playTone(c, freq, now + i * noteDuration, noteDuration, 0.35);
  });
}

async function playStartSound() {
  const c = await ensureRunning();
  const now = c.currentTime;
  playTone(c, 392, now, 0.2, 0.3);       // G4
  playTone(c, 523, now + 0.2, 0.2, 0.3); // C5
}

export const soundService = {
  playSlide: () => { if (!soundService.isMuted()) void playSlideSound(); },
  playWin:   () => { if (!soundService.isMuted()) void playWinSound(); },
  playStart: () => { if (!soundService.isMuted()) void playStartSound(); },
  playUnmuteChime: () => void playStartSound(),
  setMuted: (muted: boolean) => { localStorage.setItem(MUTE_KEY, String(muted)); },
  isMuted:  (): boolean => localStorage.getItem(MUTE_KEY) === 'true',
};
