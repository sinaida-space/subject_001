// How far the Body of Work map has built itself (0..1), published by
// WorkBuild from the scroll position and read by ConstellationFull on every
// frame. 1 is the finished map, which is also what lite mode always sees.

type Listener = (v: number) => void;

let value = 1;
const listeners = new Set<Listener>();

export const workBuildBus = {
  get: () => value,
  set(v: number) {
    if (v === value) return;
    value = v;
    listeners.forEach((l) => l(v));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
