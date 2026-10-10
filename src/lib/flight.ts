// ── The home page's flight (#175) ──
// Scroll is the only input; the site answers by moving through space. The
// page from the top of the hero to the footer is one progress p, 0..1, and
// each axis runs its own course over it, also 0..1:
//
//   x  a sideways glide, left to right on the way down (eased at both ends)
//   y  a steady descent, linear in p
//   z  the dive: it comes in surges, one per chapter of the page, with a
//      slow drift between them, always forward, never back
//
// The star field turns these into its camera; anything else that wants to
// share the flight reads the same function. A pure function of scroll:
// scrolling back flies the same path home.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** chapters of the dive: hero → quote → About → Work → Services → Contact, roughly */
const SURGES = 5;
/** share of the dive taken in the surges; the rest is a steady drift */
const SURGE_SHARE = 0.6;

export interface Flight {
  x: number;
  y: number;
  z: number;
}

/** world units the camera travels over the flight: it glides left `x`, sinks
 * `y` and dives `z` from its home at z = `home` */
export const FLIGHT = { x: 6, y: 1.6, z: 9, home: 7 };

// the city footer (#179) takes over where it comes in: the flight ends as its
// top reaches the bottom of the screen
let cityFooter: HTMLElement | null = null;

/** the page's scroll progress, 0 at the top, 1 at the footer */
export function pageProgress(): number {
  if (typeof window === 'undefined') return 0;
  const vh = window.innerHeight;
  let max = document.documentElement.scrollHeight - vh;
  if (!cityFooter?.isConnected) cityFooter = document.querySelector<HTMLElement>('footer[data-city]');
  if (cityFooter) max = Math.min(max, cityFooter.getBoundingClientRect().top + window.scrollY - vh);
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

/** where the flight is at progress p; each axis 0..1 */
export function flightAt(p: number): Flight {
  const t = clamp01(p);
  const c = t * SURGES;
  const i = Math.min(SURGES - 1, Math.floor(c));
  const stepped = (i + smoother(clamp01(c - i))) / SURGES;
  return {
    x: smoother(t),
    y: t,
    z: (1 - SURGE_SHARE) * t + SURGE_SHARE * stepped,
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
