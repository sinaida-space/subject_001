// How far the Body of Work map has built itself, published by WorkBuild from
// the scroll position and read by ConstellationFull on every frame.
//   value  the map's build, 0..1 (1 is the finished map, all lite mode sees)
//   pour   the big bang's pull out of About onto the globe, 0..1; the globe's
//          own cells fade in as it ends
//   source unused since the big bang (#166), kept null
//   sweep  once the map is whole, the sweep of light across it, 0..1 over the
//          next stretch of scroll (1 settled)
//   drift  the slow turn across the rest of Work, 0..1

type Listener = () => void;
export interface Box { left: number; top: number; width: number; height: number }

let value = 1;
let pour = 1;
let source: Box | null = null;
let sweep = 1;
let drift = 0;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const workBuildBus = {
  get: () => value,
  getPour: () => pour,
  getSource: () => source,
  set(v: number) {
    if (v === value) return;
    value = v;
    emit();
  },
  setPour(p: number, src: Box | null) {
    if (p === pour && (src?.top ?? 0) === (source?.top ?? 0)) return;
    pour = p;
    source = src;
    emit();
  },
  getSweep: () => sweep,
  getDrift: () => drift,
  setAfter(s: number, d: number) {
    // steps of a thousandth: no emit for sub-pixel scroll noise
    const qs = Math.round(s * 1000) / 1000, qd = Math.round(d * 1000) / 1000;
    if (qs === sweep && qd === drift) return;
    sweep = qs;
    drift = qd;
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
