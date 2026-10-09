// How far the Body of Work map has built itself, published by WorkBuild from
// the scroll position and read by ConstellationFull on every frame.
//   value  the map's build, 0..1 (1 is the finished map, all lite mode sees)
//   pour   the dust pour out of About, 0..1; the globe is poured with it
//   source where the dust comes from: About's paragraph, in client px

type Listener = () => void;
export interface Box { left: number; top: number; width: number; height: number }

let value = 1;
let pour = 1;
let source: Box | null = null;
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
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
