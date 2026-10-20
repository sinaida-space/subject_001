// A star answers a touch with one note, synthesised on the visitor's
// machine: no audio files, nothing fetched, nothing stored. The context is
// made on the first touch, inside the gesture, so the browser allows it;
// no sound ever plays on its own.

// A minor pentatonic over two octaves, so any run of touches stays in tune
const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

let ctx: AudioContext | null = null;
let out: GainNode | null = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.18;
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// one decaying partial
function partial(a: AudioContext, freq: number, level: number, decay: number, t: number) {
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(env).connect(out!);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

// a struck bar, celesta-like: each next touch takes the next note of the
// scale, so a thread through the stars plays as a small tune
export function chime(step: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const f = SCALE[step % SCALE.length];
  partial(a, f, 0.9, 1.6, t);
  partial(a, f * 4, 0.22, 0.35, t); // the bar's bright overtone
  partial(a, f * 10.2, 0.06, 0.08, t); // the hammer
}

// Je suis le spectre d'une rose que tu portais hier au bal.
