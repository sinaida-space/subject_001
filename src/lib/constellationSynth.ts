// ── Constellation synth ─────────────────────────────────────
// The "living instrument" the site is built around, made literal. The graph
// becomes a 16-step loop: x = time (which step a star fires on), y = pitch.
// Project stars are the voices (drums + 808 bass, one timbre per project
// kind); skill stars never sound — their collective height bends a global
// low-pass filter, like a hand on a knob. Arranging the stars IS the
// composition. Everything is synthesized (no samples) and only ever starts
// from a user gesture (dragging a star, then pressing play), so it satisfies
// browser autoplay policy and the site's motion law: nothing sounds on its
// own.
//
// Two layers share one AudioContext:
//   • the drag drone — a soft theremin teaser while a star is being dragged
//   • the sequencer  — the opt-in loop, off until the visitor presses play
//
// Grace first: the sequencer starts silent (play is opt-in via the panel),
// master volume is deliberately low, and stopping is always one obvious tap.

export type VoiceKind = 'stage' | 'installation' | 'conceptual' | 'game' | 'tool';

export interface Voice {
  id: string;
  kind: VoiceKind;
  x01: number; // 0..1 across the map width → step in the bar
  y01: number; // 0..1 down the map height → pitch (0 = top = high)
  weight: number; // relative loudness
  hero?: boolean;
}

export interface VoiceFrame {
  voices: Voice[];
  /** mean y (0..1) of all skill stars → global filter position */
  skillTone: number;
}

export interface SynthState {
  playing: boolean;
  tempo: number; // BPM
  tone: number; // 0..1 filter openness (panel knob)
  volume: number; // 0..1 master
}

const STEPS = 16;
// A-minor pentatonic over a few octaves; every pitched hit lands on one of
// these so any arrangement is musical, never a wrong note.
const SCALE = [0, 3, 5, 7, 10]; // semitone offsets from A
const A = 55; // Hz (A1) — bass register root

type Listener = (s: SynthState) => void;
type UnlockListener = () => void;

class ConstellationSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private state: SynthState = { playing: false, tempo: 96, tone: 0.5, volume: 0.28 };
  private listeners = new Set<Listener>();
  private unlockListeners = new Set<UnlockListener>();
  private unlocked = false;

  private voiceSource: (() => VoiceFrame) | null = null;

  // Transport
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private loopStart = 0;

  // ── lifecycle ──
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.state.volume;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.9;
    filter.connect(master);

    // A short feedback delay as a "send" — gives the 808 pocket some space.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / this.state.tempo) * 0.75; // dotted-ish
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(filter);

    this.master = master;
    this.filter = filter;
    this.delay = delay;
    this.feedback = feedback;

    // one reusable noise buffer for percussion
    const len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    return ctx;
  }

  private resume() {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private primedOnce = false;
  /**
   * Call synchronously from the FIRST event of a real user gesture —
   * pointerdown/mousedown/touchstart/click — never from pointermove/touchmove.
   * WebKit (iOS Safari) only allows AudioContext creation/resume to unlock
   * audio when the call happens directly inside the handler for one of those
   * "start" event types; a resume() reached via touchmove (e.g. mid-drag)
   * does not count and can leave the context stuck suspended forever, even
   * though the drag itself works fine. This was exactly the constellation's
   * bug: the AudioContext was first touched inside startDrone(), which is
   * only ever called from onPointerMove.
   *
   * Also plays one silent buffer through the context — the standard
   * cross-browser "unlock" pattern (used by Howler/Tone.js) that fully
   * activates output on the very first qualifying gesture, since resume()
   * alone is occasionally not enough on older WebKit.
   */
  primeFromGesture() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.resume();
    if (this.primedOnce) return;
    this.primedOnce = true;
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* non-fatal — resume() above is the primary unlock */
    }
  }

  // ── public wiring ──
  setVoiceSource(fn: () => VoiceFrame) {
    this.voiceSource = fn;
  }

  getState(): SynthState {
    return { ...this.state };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  /** Fires once, the first time the instrument is unlocked (first real drag). */
  onUnlock(fn: UnlockListener): () => void {
    this.unlockListeners.add(fn);
    return () => this.unlockListeners.delete(fn);
  }

  markUnlocked() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.unlockListeners.forEach((f) => f());
  }

  isUnlocked() {
    return this.unlocked;
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((f) => f(s));
  }

  // ── transport controls (called by the panel) ──
  play() {
    const ctx = this.ensure();
    if (!ctx || this.state.playing) return;
    this.resume();
    this.state.playing = true;
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.06;
    this.loopStart = this.nextStepTime;
    this.timer = setInterval(() => this.scheduler(), 25);
    this.emit();
  }

  pause() {
    if (!this.state.playing) return;
    this.state.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emit();
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  setTempo(bpm: number) {
    this.state.tempo = Math.max(60, Math.min(140, Math.round(bpm)));
    if (this.delay && this.ctx) {
      this.delay.delayTime.setTargetAtTime((60 / this.state.tempo) * 0.75, this.ctx.currentTime, 0.05);
    }
    this.emit();
  }

  setTone(t: number) {
    this.state.tone = Math.max(0, Math.min(1, t));
    this.emit();
  }

  setVolume(v: number) {
    this.state.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.state.volume, this.ctx.currentTime, 0.03);
    this.emit();
  }

  /** Playhead position 0..1 across the bar, for the canvas to draw. */
  getPlayhead(): number {
    if (!this.ctx || !this.state.playing) return -1;
    const stepDur = 60 / this.state.tempo / 4;
    const loopLen = STEPS * stepDur;
    const t = (this.ctx.currentTime - this.loopStart) % loopLen;
    return t < 0 ? 0 : t / loopLen;
  }

  // ── the step scheduler (audio-clock lookahead) ──
  // The transport clock stays perfectly regular (one stepDur per 16th) so the
  // playhead formula in getPlayhead() lines up with what's heard. Swing is
  // applied only to the audio trigger time of odd 16ths, never to the clock.
  private scheduler() {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / this.state.tempo / 4;
    const swing = stepDur * 0.16;
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      const triggerAt = this.nextStepTime + (this.step % 2 === 1 ? swing : 0);
      this.scheduleStep(this.step, triggerAt);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % STEPS;
      if (this.step === 0) this.loopStart = this.nextStepTime; // re-anchor for playhead
    }
  }

  private scheduleStep(step: number, time: number) {
    const frame = this.voiceSource?.();
    if (!frame) return;

    // Skill height bends the filter; the panel tone knob is the master range.
    const tone = this.state.tone;
    const skill = frame.skillTone; // 0 top .. 1 bottom
    const cutoff = 260 * Math.pow(2, tone * 5.2 + (0.5 - skill) * 1.2); // ~260..7000Hz
    if (this.filter && this.ctx) this.filter.frequency.setTargetAtTime(cutoff, time, 0.02);

    for (const v of frame.voices) {
      if (Math.floor(v.x01 * STEPS) % STEPS !== step) continue;
      const vel = 0.5 + v.weight * 0.5;
      switch (v.kind) {
        case 'stage':
          this.kick(time, vel * 1.1);
          break;
        case 'installation':
          this.snare(time, vel);
          break;
        case 'game':
          this.hat(time, vel * 0.8);
          break;
        default: // conceptual + tool → 808 bass
          this.bass(time, v.y01, vel);
      }
    }
  }

  // ── voices ──
  private pitchFromY(y01: number, octaves: number, base: number): number {
    // y01 0 (top) = high, 1 (bottom) = low. Quantize to the pentatonic scale.
    const span = SCALE.length * octaves;
    const idx = Math.round((1 - y01) * (span - 1));
    const semis = SCALE[idx % SCALE.length] + 12 * Math.floor(idx / SCALE.length);
    return base * Math.pow(2, semis / 12);
  }

  private kick(time: number, vel: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.11);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.9 * vel, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
    osc.connect(g);
    g.connect(this.filter!);
    osc.start(time);
    osc.stop(time + 0.36);
  }

  private snare(time: number, vel: number) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1750;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.filter!);
    g.connect(this.delay!);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  private hat(time: number, vel: number) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.filter!);
    noise.start(time);
    noise.stop(time + 0.07);
  }

  private bass(time: number, y01: number, vel: number) {
    const ctx = this.ctx!;
    const freq = this.pitchFromY(y01, 2, A);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06); // glide down
    // gentle drive for 808 body
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.driveCurve();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.7 * vel, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    osc.connect(shaper);
    shaper.connect(g);
    g.connect(this.filter!);
    g.connect(this.delay!);
    osc.start(time);
    osc.stop(time + 0.55);
  }

  private _drive: Float32Array | null = null;
  private driveCurve(): Float32Array {
    if (this._drive) return this._drive;
    const n = 1024;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * 1.8);
    }
    this._drive = c;
    return c;
  }

  // ── drag drone (teaser) ──
  private drone: {
    a: OscillatorNode;
    b: OscillatorNode;
    vib: OscillatorNode;
    vibG: GainNode;
    filt: BiquadFilterNode;
    g: GainNode;
    pan: StereoPannerNode | null;
    freq: number;
  } | null = null;

  private droneFreq(y01: number): number {
    return 90 * Math.pow(2, (1 - Math.min(Math.max(y01, 0), 1)) * 2.2);
  }

  startDrone(x01: number, y01: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.drone) return;
    this.resume();
    const now = ctx.currentTime;
    const freq = this.droneFreq(y01);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'sine';
    b.type = 'sine';
    a.frequency.value = freq;
    b.frequency.value = freq;
    b.detune.value = 6;
    const vib = ctx.createOscillator();
    vib.type = 'sine';
    vib.frequency.value = 4.5;
    const vibG = ctx.createGain();
    vibG.gain.value = 0;
    vib.connect(vibG);
    vibG.connect(a.detune);
    vibG.connect(b.detune);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 700;
    filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.12);
    const pan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = x01 * 2 - 1;
    a.connect(filt);
    b.connect(filt);
    filt.connect(g);
    if (pan) {
      g.connect(pan);
      pan.connect(this.master);
    } else {
      g.connect(this.master);
    }
    a.start(now);
    b.start(now);
    vib.start(now);
    this.drone = { a, b, vib, vibG, filt, g, pan, freq };
  }

  updateDrone(x01: number, y01: number, stretch: number) {
    if (!this.ctx || !this.drone) return;
    const t = this.ctx.currentTime;
    const s = Math.min(Math.max(stretch, 0), 1);
    const freq = this.droneFreq(y01);
    const d = this.drone;
    d.freq = freq;
    d.a.frequency.setTargetAtTime(freq, t, 0.06);
    d.b.frequency.setTargetAtTime(freq, t, 0.06);
    d.b.detune.setTargetAtTime(6 + s * 14, t, 0.08);
    d.vibG.gain.setTargetAtTime(s * 10, t, 0.1);
    d.filt.frequency.setTargetAtTime(700 + s * 1900, t, 0.08);
    if (d.pan) d.pan.pan.setTargetAtTime(x01 * 2 - 1, t, 0.06);
  }

  endDrone() {
    if (!this.ctx || !this.master || !this.drone) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const d = this.drone;
    this.drone = null;
    d.g.gain.cancelScheduledValues(now);
    d.g.gain.setTargetAtTime(0.0001, now, 0.08);
    const stopAt = now + 0.5;
    d.a.stop(stopAt);
    d.b.stop(stopAt);
    d.vib.stop(stopAt);
    // resolve with one quantized beep in the mid register
    let f = d.freq;
    while (f < 440) f *= 2;
    const notes = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const note = notes.reduce((best, p) => (Math.abs(p - f) < Math.abs(best - f) ? p : best), notes[0]);
    const beep = ctx.createOscillator();
    beep.type = 'sine';
    beep.frequency.value = note;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, now);
    bg.gain.exponentialRampToValueAtTime(0.1, now + 0.012);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    beep.connect(bg);
    bg.connect(this.master);
    beep.start(now);
    beep.stop(now + 0.25);
  }

  dispose() {
    this.endDrone();
    this.pause();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
      this.filter = null;
      this.delay = null;
      this.feedback = null;
    }
  }
}

export const synth = new ConstellationSynth();
