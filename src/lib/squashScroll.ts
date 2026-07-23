// ── Squash-and-stretch scroll ──
// A slow, cartoon-camera scrollTo: the page content (passed in as `stageEl`,
// normally <main>) squashes down at takeoff, stretches as it travels, and
// settles back to rest at arrival. Full mode + click-triggered only — see
// HeroSection's tag buttons for the caller and index.css's tag-launch-squash
// for the matching cue on the clicked tag itself.

// Hard cap at 2s — anything longer risks reading as a stuck page, and this
// motion runs unprompted by the user's own scrolling, so it needs to resolve
// quickly for photosensitive visitors regardless.
const DURATION = 1200; // ms

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Piecewise squash (compressed, wide) → stretch (elongated, narrow) → settle.
// scaleY drives the vertical squash/stretch; scaleX moves opposite to keep
// the shape feeling like it has volume rather than just squishing flat.
// Amplitudes kept low (≤3%) — a subtle wobble, not a flash-y distortion.
function squashFactor(t: number): number {
  if (t < 0.15) {
    const p = t / 0.15;
    return 1 - 0.025 * Math.sin(p * (Math.PI / 2));
  }
  if (t < 0.85) {
    const p = (t - 0.15) / 0.7;
    return 0.975 + 0.045 * Math.sin(p * Math.PI);
  }
  const p = (t - 0.85) / 0.15;
  return 1 + 0.02 * (1 - p);
}

export function squashScrollTo(targetEl: Element, stageEl: HTMLElement | null) {
  const startY = window.scrollY;
  const targetY = startY + targetEl.getBoundingClientRect().top;
  const distance = targetY - startY;
  const start = performance.now();

  if (stageEl) stageEl.style.transformOrigin = 'top center';

  const step = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / DURATION);

    // behavior: 'auto' is required — the site sets `scroll-behavior: smooth`
    // globally, which would otherwise fight this rAF loop's own per-frame
    // positions with the browser's separate smooth-scroll interpolation.
    window.scrollTo({ top: startY + distance * easeInOutCubic(t), left: 0, behavior: 'auto' });

    if (stageEl) {
      const scaleY = squashFactor(t);
      const scaleX = 1 + (1 - scaleY) * 0.6;
      stageEl.style.transform = `scale(${scaleX}, ${scaleY})`;
    }

    if (t < 1) {
      requestAnimationFrame(step);
    } else if (stageEl) {
      stageEl.style.transform = '';
      stageEl.style.transformOrigin = '';
    }
  };

  requestAnimationFrame(step);
}
