// Synthesized sound effects via WebAudio. One clear job: every sound the
// game makes, built from oscillators and filtered noise — no audio files.

let ctx = null;
let master = null;
let muted = false;

function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Call from the first user gesture so the browser unlocks audio. */
export function unlockAudio() {
  const ac = audioContext();
  // resume() rejects (InvalidStateError) when the document is not the active
  // one — e.g. during a scripted scene — so never let it reject unhandled.
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone({ type = 'square', from = 440, to = null, seconds = 0.1, volume = 0.5, delay = 0 }) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
  } catch {
    /* audio is best-effort: never let a sound break the game */
  }
}

function noise({ seconds = 0.2, volume = 0.5, frequency = 1200, delay = 0 }) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + delay;
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(t0);
  } catch {
    /* audio is best-effort: never let a sound break the game */
  }
}

export const sfx = {
  shoot() {
    tone({ type: 'square', from: 880, to: 320, seconds: 0.07, volume: 0.22 });
  },
  hit() {
    tone({ type: 'triangle', from: 220, to: 90, seconds: 0.08, volume: 0.3 });
  },
  explode(big = false) {
    noise({ seconds: big ? 0.45 : 0.25, volume: big ? 0.6 : 0.4, frequency: big ? 900 : 1600 });
    tone({ type: 'sine', from: 160, to: 40, seconds: big ? 0.4 : 0.22, volume: 0.5 });
  },
  hurt() {
    tone({ type: 'sawtooth', from: 180, to: 60, seconds: 0.25, volume: 0.5 });
    noise({ seconds: 0.15, volume: 0.3, frequency: 700 });
  },
  upgrade() {
    tone({ type: 'sine', from: 523, seconds: 0.12, volume: 0.4 });
    tone({ type: 'sine', from: 659, seconds: 0.12, volume: 0.4, delay: 0.09 });
    tone({ type: 'sine', from: 784, seconds: 0.2, volume: 0.4, delay: 0.18 });
  },
  waveStart() {
    tone({ type: 'sawtooth', from: 110, to: 440, seconds: 0.35, volume: 0.3 });
  },
  gameOver() {
    tone({ type: 'sawtooth', from: 220, to: 55, seconds: 0.9, volume: 0.45 });
    tone({ type: 'sine', from: 110, to: 28, seconds: 1.1, volume: 0.4, delay: 0.1 });
  },
  click() {
    tone({ type: 'sine', from: 1200, to: 900, seconds: 0.05, volume: 0.25 });
  },
  overheat() {
    tone({ type: 'square', from: 140, to: 90, seconds: 0.18, volume: 0.3 });
  },
};
