// Torch cursor: one shared clock for the soft light that follows a fine
// pointer. The starfield reads it to light stars and draw its pool of light;
// the CSS writer below turns it into --torch-x / --torch-y / --torch-on so
// hairlines can catch a chrome glint. Both stop completely once the pointer
// has been still for TORCH.fadeEnd: nothing here runs at rest.

export const TORCH = {
  /** Pool radius as a fraction of the viewport's shorter side (22vmin). */
  radiusVmin: 0.22,
  /** Pointer easing time constant, seconds. */
  ease: 0.12,
  /** Fade-in after the first move, ms. */
  fadeIn: 180,
  /** Full strength is held this long after the last move, ms. */
  hold: 350,
  /** Fully faded this long after the last move (or leaving the window), ms. */
  fadeEnd: 1500,
};

export const torchState = {
  /** Last pointer position, CSS px in the viewport. */
  x: 0,
  y: 0,
  /** performance.now() of the last move; -Infinity until the first one. */
  lastMove: -Infinity,
  /** performance.now() when the current lit stretch began. */
  litAt: -Infinity,
};

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 0..1 torch strength at time `now` (performance.now()). Pure function of the clock. */
export function torchLevel(now: number): number {
  const since = now - torchState.lastMove;
  if (!(since < TORCH.fadeEnd)) return 0;
  return smooth(0, TORCH.fadeIn, now - torchState.litAt) * (1 - smooth(TORCH.hold, TORCH.fadeEnd, since));
}

/** Desktop only: a hovering, fine pointer. */
export function torchSupported(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** The thin lines that catch the torch as a chrome glint (see index.css). */
export const TORCH_LINES = '[data-rule], .chrome-line, .photo-frame-wrapper';

/**
 * Track the pointer and mirror the torch into CSS custom properties:
 * --torch-x / --torch-y (px, relative to each line's own border box) and
 * --torch-on (0..1). They are written on the chrome lines themselves, not on
 * <html>: a custom property on the root restyles the whole document on every
 * move (~2ms here, several on an older laptop), on a handful of lines it is
 * free. Local coordinates (one rect per line, only while lit) keep the glint
 * right under the torch even inside transformed sections, where a fixed
 * background would not stay in viewport space. The writer is
 * rAF-throttled, only scheduled by pointermove, and keeps running only while
 * the torch is fading. data-torch is present on <html> only while lit, so the
 * glint styles (and their fixed backgrounds) exist only then.
 * Returns a cleanup function.
 */
export function startTorch(): () => void {
  if (!torchSupported()) return () => {};
  const root = document.documentElement;
  let raf: number | null = null;
  let writtenOn = -1;
  let lines: HTMLElement[] = [];
  const write = (name: string, value: string) => {
    for (const el of lines) el.style.setProperty(name, value);
  };
  const clear = () => {
    for (const el of lines) {
      el.style.removeProperty('--torch-x');
      el.style.removeProperty('--torch-y');
      el.style.removeProperty('--torch-on');
    }
  };

  const frame = () => {
    raf = null;
    const now = performance.now();
    const on = torchLevel(now);
    // Re-collect the lines at the start of each lit stretch (routes and lazy
    // sections come and go between stretches).
    if (writtenOn <= 0 && on > 0) {
      clear();
      lines = Array.from(document.querySelectorAll<HTMLElement>(TORCH_LINES));
    }
    for (const el of lines) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--torch-x', `${Math.round(torchState.x - r.left)}px`);
      el.style.setProperty('--torch-y', `${Math.round(torchState.y - r.top)}px`);
    }
    const rounded = Math.round(on * 100) / 100;
    if (rounded !== writtenOn) {
      writtenOn = rounded;
      write('--torch-on', String(rounded));
      if (rounded > 0) root.setAttribute('data-torch', '');
      else {
        root.removeAttribute('data-torch');
        clear();
        lines = [];
      }
    }
    // Keep going only while the fade is still in progress.
    if (on > 0) raf = requestAnimationFrame(frame);
  };
  const schedule = () => {
    if (raf == null) raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (torchLevel(now) <= 0) torchState.litAt = now;
    torchState.x = e.clientX;
    torchState.y = e.clientY;
    torchState.lastMove = now;
    schedule();
  };
  // Leaving the window starts the fade straight away.
  const onLeave = (e: MouseEvent) => {
    if (e.relatedTarget) return;
    const now = performance.now();
    torchState.lastMove = Math.min(torchState.lastMove, now - TORCH.hold);
    schedule();
  };

  // Lines move under a still torch while scrolling: follow them while lit.
  const onScroll = () => {
    if (writtenOn > 0) schedule();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('mouseout', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mouseout', onLeave);
    if (raf != null) cancelAnimationFrame(raf);
    torchState.lastMove = -Infinity;
    clear();
    lines = [];
    root.removeAttribute('data-torch');
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
