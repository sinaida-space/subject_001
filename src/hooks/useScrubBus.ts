// ── Scrub bus (Phase 1 minimal) ──
// Single conductor translating scroll position into a per-frame ScrubState.
// One shared rAF, started on scroll, stopped 200ms after the last scroll
// event (drawing one final frame first). No pointermove listener, no vel
// tracking (kept at 0 per the Phase 1 delta — full vel smoothing is a later
// phase). See docs/spec-dreamcore-tesseract.md §0 (motion law): nothing runs
// at rest.

export interface ScrubState {
  p: number;
  P: number;
  vel: number;
  pointerX: number;
  pointerY: number;
  hoverAllowed: boolean;
}

type Subscriber = (s: ScrubState) => void;

const subscribers = new Set<Subscriber>();

let heroEl: HTMLElement | null = null;
let rafId: number | null = null;
let dirty = false;
let lastScrollAt = 0;

const hoverAllowed =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches === true;

function computeState(): ScrubState {
  const vh = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;
  let p = 0;
  if (heroEl) {
    const rect = heroEl.getBoundingClientRect();
    p = Math.max(0, Math.min(1, -rect.top / vh));
  }
  const docHeight = typeof document !== 'undefined' ? document.documentElement.scrollHeight : 0;
  const denom = docHeight - vh;
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  const P = denom > 0 ? Math.max(0, Math.min(1, scrollY / denom)) : 0;

  return { p, P, vel: 0, pointerX: 0, pointerY: 0, hoverAllowed };
}

function tick() {
  const state = computeState();
  subscribers.forEach((cb) => cb(state));

  const idleFor = performance.now() - lastScrollAt;
  if (idleFor >= 200) {
    // Final frame already drawn above; stop the loop.
    rafId = null;
    dirty = false;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureRunning() {
  if (rafId != null) return;
  dirty = true;
  rafId = requestAnimationFrame(tick);
}

function onScroll() {
  lastScrollAt = performance.now();
  ensureRunning();
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', onScroll, { passive: true });
}

/** Register the hero section element so `p` can be computed against it. */
export function registerHeroSection(el: HTMLElement | null) {
  heroEl = el;
  // Draw one frame immediately so subscribers get an initial, correct state
  // (e.g. after route mount, before any scroll happens).
  const state = computeState();
  subscribers.forEach((cb) => cb(state));
}

/**
 * Compute the current scrub state on demand, independent of the rAF loop.
 * Used by subscribers to paint an initial frame right after subscribing,
 * since mount order between `registerHeroSection` and a given subscriber
 * isn't guaranteed (the one-off dispatch inside `registerHeroSection` can
 * fire before that subscriber has subscribed).
 */
export function getScrubState(): ScrubState {
  return computeState();
}

/** Subscribe to per-frame scrub state while the bus is running. */
export function subscribeScrub(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
