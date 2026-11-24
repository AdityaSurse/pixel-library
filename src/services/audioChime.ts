// Web Audio API Synthesizer for 3-note phase completion chime
// Uses 8-bit style square waves with gentle exponential ramps (no external audio files)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const isChimeMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pixel_library_muted') === 'true';
};

export const setChimeMuted = (muted: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pixel_library_muted', muted ? 'true' : 'false');
};

/**
 * Plays a cheerful 3-note ascending chime: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
 */
export function playPhaseEndChime(): void {
  if (isChimeMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, start: 0.00, dur: 0.14 }, // C5
    { freq: 659.25, start: 0.12, dur: 0.14 }, // E5
    { freq: 783.99, start: 0.24, dur: 0.25 }, // G5
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now + start);

    // Warm low-pass filter to soften 8-bit harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now + start);

    gain.gain.setValueAtTime(0.08, now + start);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + dur);
  });
}
