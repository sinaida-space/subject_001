import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// ── Smooth scroll ──
// Wheel and trackpad scrolling eased on the main thread, in the same frame
// every scroll-driven effect reads it. Without it Safari scrolls on its
// compositor first and the effects (the Contact dolly, the title layer, the
// gate) catch up a frame later, which reads as shaking. Phones keep their
// own touch scroll; reduced motion keeps the native one. Programmatic jumps
// (navLand, ScrollToTop) still use window.scrollTo: Lenis follows a native
// scroll it did not start.

let lenis: Lenis | null = null;

export function startSmoothScroll(): void {
  if (lenis || typeof window === 'undefined') return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?smooth=0 keeps the native scroll, to compare the two on a real screen
  const off = new URLSearchParams(window.location.search).get('smooth') === '0';
  if (!fine || still || off) return;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.075, // softer than the default 0.1
    wheelMultiplier: 1,
    // modals with their own scroll (project details) scroll natively
    allowNestedScroll: true,
    stopInertiaOnNavigate: true,
  });
}

/** the running instance, if smooth scroll is on (desktop, motion allowed) */
export const smoothScroll = () => lenis;

/** run `fn` on every scroll step: in the same frame Lenis moved the page
 * when it is on (no frame of lag), else on the native scroll event */
export function onScrollStep(fn: () => void): () => void {
  // the native event too: jumps (navLand, ScrollToTop) move the page
  // without Lenis, and the caller skips a step it has already drawn
  const offLenis = lenis?.on('scroll', fn);
  window.addEventListener('scroll', fn, { passive: true });
  return () => {
    offLenis?.();
    window.removeEventListener('scroll', fn);
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal. — Théophile Gautier
