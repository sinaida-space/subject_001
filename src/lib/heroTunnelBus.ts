// Tiny pub/sub: hovering the hero name/role triggers the starfield's
// dive-into-the-stars tunnel motion. Decoupled from ParticleField (a global
// fixed canvas) so the hero text doesn't need a direct reference to it.

type Listener = (active: boolean) => void;

const listeners = new Set<Listener>();

export const heroTunnelBus = {
  setActive(active: boolean) {
    listeners.forEach((l) => l(active));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
