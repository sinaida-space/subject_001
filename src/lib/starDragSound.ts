// ── Star-drag sound (easter egg) ────────────────────────────
// While a constellation star is being dragged, a soft detuned drone plays:
// pitch follows the pointer's vertical position on screen, stereo pan follows
// the horizontal, and pulling the star further from its home adds "tension"
// (wider detune, brighter filter, deeper vibrato). Releasing the star ends the
// drone with a short ECG-monitor beep quantized to a pentatonic scale, so any
// drag always resolves musically.
//
// Everything is synthesized (no audio assets) and only ever starts from an
// active pointer drag — a user gesture — so it satisfies both browser autoplay
// policy and the site's motion law. Volumes are deliberately quiet: this is a
// discovery, not a feature.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

interface Voice {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  vibrato: OscillatorNode;
  vibratoGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  pan: StereoPannerNode | null;
  freq: number;
}

let voice: Voice | null = null;

// A-minor pentatonic across the beep register — the release always lands on
// one of these, so repeated drags read as playing an instrument, not noise.
const PENTATONIC = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7];

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Pointer y (0 top … 1 bottom of the viewport) → drone frequency. */
function droneFreq(y01: number): number {
  // ~2.2 octaves of range; high on screen = high pitch, floor ≈ 90 Hz.
  return 90 * Math.pow(2, (1 - Math.min(Math.max(y01, 0), 1)) * 2.2);
}

/** Begin the drag drone. Safe to call repeatedly; no-ops if already sounding. */
export function startStarTone(x01: number, y01: number): void {
  const c = ensureContext();
  if (!c || !master || voice) return;
  if (c.state === 'suspended') void c.resume();

  const now = c.currentTime;
  const freq = droneFreq(y01);

  const oscA = c.createOscillator();
  const oscB = c.createOscillator();
  oscA.type = 'sine';
  oscB.type = 'sine';
  oscA.frequency.value = freq;
  oscB.frequency.value = freq;
  oscB.detune.value = 6; // slow beat against oscA at rest

  // Gentle vibrato, depth driven by drag tension (starts at zero).
  const vibrato = c.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = 4.5;
  const vibratoGain = c.createGain();
  vibratoGain.gain.value = 0;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(oscA.detune);
  vibratoGain.connect(oscB.detune);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  filter.Q.value = 0.8;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.12); // soft attack

  const pan = typeof c.createStereoPanner === 'function' ? c.createStereoPanner() : null;
  if (pan) pan.pan.value = x01 * 2 - 1;

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  if (pan) {
    gain.connect(pan);
    pan.connect(master);
  } else {
    gain.connect(master);
  }
  oscA.start(now);
  oscB.start(now);
  vibrato.start(now);

  voice = { oscA, oscB, vibrato, vibratoGain, filter, gain, pan, freq };
}

/**
 * Track the drag: x01/y01 are viewport-normalized pointer coords, stretch is
 * 0..1 distance of the star from its home position (tension).
 */
export function updateStarTone(x01: number, y01: number, stretch: number): void {
  if (!ctx || !voice) return;
  const t = ctx.currentTime;
  const s = Math.min(Math.max(stretch, 0), 1);
  const freq = droneFreq(y01);
  voice.freq = freq;
  // Short time-constant glides — theremin-like, never steppy.
  voice.oscA.frequency.setTargetAtTime(freq, t, 0.06);
  voice.oscB.frequency.setTargetAtTime(freq, t, 0.06);
  voice.oscB.detune.setTargetAtTime(6 + s * 14, t, 0.08); // beat widens under tension
  voice.vibratoGain.gain.setTargetAtTime(s * 10, t, 0.1); // vibrato depth in cents
  voice.filter.frequency.setTargetAtTime(700 + s * 1900, t, 0.08); // opens up when pulled far
  if (voice.pan) voice.pan.pan.setTargetAtTime(x01 * 2 - 1, t, 0.06);
}

/** Release: fade the drone out and resolve with one quantized ECG-style beep. */
export function endStarTone(): void {
  if (!ctx || !master) return;
  const c = ctx;
  const now = c.currentTime;

  if (voice) {
    const v = voice;
    voice = null;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0.0001, now, 0.08);
    const stopAt = now + 0.5;
    v.oscA.stop(stopAt);
    v.oscB.stop(stopAt);
    v.vibrato.stop(stopAt);
    // Beep pitch: the drone's last frequency lifted into the beep register,
    // snapped to the nearest pentatonic note.
    let f = v.freq;
    while (f < PENTATONIC[0]) f *= 2;
    const note = PENTATONIC.reduce((best, p) => (Math.abs(p - f) < Math.abs(best - f) ? p : best), PENTATONIC[0]);

    const beep = c.createOscillator();
    beep.type = 'sine';
    beep.frequency.value = note;
    const beepGain = c.createGain();
    beepGain.gain.setValueAtTime(0.0001, now);
    beepGain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    beepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    beep.connect(beepGain);
    beepGain.connect(master);
    beep.start(now);
    beep.stop(now + 0.25);
  }
}

/** Full teardown on component unmount. */
export function disposeStarSound(): void {
  endStarTone();
  if (ctx) {
    void ctx.close().catch(() => undefined);
    ctx = null;
    master = null;
    voice = null;
  }
}
