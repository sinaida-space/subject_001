// Where home was scrolled to when a case was opened from it (#187). Kept in
// sessionStorage: it lives for this tab's visit only, nothing persists.
//
// Home mounts its heavy sections lazily, so on the way back the page above
// the spot can still grow after the first frame. The spot is therefore kept
// relative to the nearest section above it, and restoring re-aims at it for
// a short while until the layout settles, jumping (never smooth) so no seam
// plays on the way. Any input from the visitor ends the re-aiming.

const KEY = 'sinaida:home-scroll';
const RETURN_KEY = 'sinaida:home-return';
const SETTLE_MS = 2000;

type Spot = { id: string; offset: number };

const sections = () => [...document.querySelectorAll<HTMLElement>('main section[id]')];

export function rememberHomeScroll() {
  let spot: Spot = { id: '', offset: Math.round(window.scrollY) };
  for (const el of sections()) {
    const top = el.getBoundingClientRect().top;
    if (top <= 0) spot = { id: el.id, offset: Math.round(-top) };
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(spot));
  } catch {
    /* storage blocked: Back lands at the top, as before */
  }
}

/** a case's own Back link: treat the next arrival home like browser Back.
 * A flag, not router state: RouteEnhancer re-navigates links without it. */
export function markHomeReturn() {
  try {
    sessionStorage.setItem(RETURN_KEY, '1');
  } catch {
    /* storage blocked */
  }
}

/** true once after markHomeReturn */
export function takeHomeReturn(): boolean {
  try {
    const v = sessionStorage.getItem(RETURN_KEY) === '1';
    sessionStorage.removeItem(RETURN_KEY);
    return v;
  } catch {
    return false;
  }
}

/** jumps home to the remembered spot; false when there is none */
export function restoreHomeScroll(): boolean {
  let spot: Spot | null = null;
  try {
    spot = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    sessionStorage.removeItem(KEY);
  } catch {
    return false;
  }
  if (!spot || typeof spot.offset !== 'number') return false;
  const { id, offset } = spot;
  const target = () => {
    const el = id ? document.getElementById(id) : null;
    return el ? el.getBoundingClientRect().top + window.scrollY + offset : offset;
  };
  const until = performance.now() + SETTLE_MS;
  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.removeEventListener(t, stop);
  };
  for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.addEventListener(t, stop, { passive: true });
  const aim = () => {
    const y = Math.max(0, Math.round(target()));
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    if (performance.now() < until) raf = requestAnimationFrame(aim);
    else stop();
  };
  aim();
  return true;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
