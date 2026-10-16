import { useEffect, type RefObject } from 'react';

// One passive scroll/resize listener for every scroll-driven effect on the
// subpages (#198). Each subscriber gets its element's progress through the
// viewport, 0 → 1, only on frames where the page actually scrolled: nothing
// here ticks on its own (motion law).

type Sub = { el: HTMLElement; start: number; end: number; set: (p: number) => void };

const subs = new Set<Sub>();
let frame = 0;

function measure() {
  frame = 0;
  const vh = window.innerHeight;
  for (const s of subs) {
    const top = s.el.getBoundingClientRect().top;
    // start/end are viewport fractions: the element's top at `start` is 0,
    // at `end` is 1 (e.g. 0.95 → 0.55: from the bottom edge to just above centre)
    const p = (vh * s.start - top) / (vh * (s.start - s.end));
    s.set(Math.min(1, Math.max(0, p)));
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function subscribe(sub: Sub) {
  if (subs.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  subs.add(sub);
  schedule();
  return () => {
    subs.delete(sub);
    if (subs.size === 0) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    }
  };
}

/** Writes the element's scroll progress into the CSS variable `--p`. */
export function useScrollProgress(
  ref: RefObject<HTMLElement>,
  { start = 0.95, end = 0.55, enabled = true }: { start?: number; end?: number; enabled?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.setProperty('--p', '1');
      return;
    }
    return subscribe({ el, start, end, set: (p) => el.style.setProperty('--p', p.toFixed(3)) });
  }, [ref, start, end, enabled]);
}

/** Calls `onScroll` with progress, for effects that draw rather than style. */
export function useScrollCallback(
  ref: RefObject<HTMLElement>,
  onScroll: (p: number) => void,
  { start = 1, end = 0, enabled = true }: { start?: number; end?: number; enabled?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    return subscribe({ el, start, end, set: onScroll });
  }, [ref, onScroll, start, end, enabled]);
}

// Je suis le spectre d'une rose que tu portais hier au bal.
