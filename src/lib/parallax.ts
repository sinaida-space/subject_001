// Scroll-driven depth parallax for the starfield.
//
// The field spans ~14 world units vertically, so the near layer's total travel
// is capped at roughly a fifth of that: enough separation to read as depth,
// not enough to empty the bottom of the frame on a long scroll.
export const PARALLAX_NEAR = 1.4;
export const PARALLAX_FAR = 0.08;
/** Past this many viewport-heights the drift stops accumulating. */
export const PARALLAX_MAX_SCREENS = 2.0;

/** Half-depth of the star volume; z is generated in [-Z_HALF, Z_HALF]. */
const Z_HALF = 4;

/**
 * World units a star at depth `z` travels per viewport-height scrolled.
 * Squared falloff so the near/far separation reads perceptually rather than
 * linearly.
 */
export function depthParallaxFactor(z: number): number {
  const t = Math.min(1, Math.max(0, (z + Z_HALF) / (Z_HALF * 2)));
  return PARALLAX_FAR + (PARALLAX_NEAR - PARALLAX_FAR) * t * t;
}

/** Scroll position expressed in viewport-heights, clamped to the cap. */
export function parallaxScreens(scrollY: number, viewportHeight: number): number {
  return Math.min(Math.max(scrollY, 0) / Math.max(viewportHeight, 1), PARALLAX_MAX_SCREENS);
}
