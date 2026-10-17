// Header and footer links on the home page reach a section through a scan
// (see ditherThrough); arriving from another page jumps. A section with a better landing than its top (the tesseract's first
// pane facing you) registers where that is.

type Land = () => number | null;
const lands = new Map<string, Land>();

/** a section's own landing, as a page scrollY; null falls back to its top */
export function registerLand(id: string, land: Land): () => void {
  lands.set(id, land);
  return () => {
    if (lands.get(id) === land) lands.delete(id);
  };
}

/** go to a section by its hash ('#work'); false when there is no such section.
 * fly: a very fast flight there (a click on the home page), else a jump
 * (arriving from another page). Reduced motion always jumps. */
export function landOn(hash: string, fly = false): boolean {
  const id = hash.replace(/^#/, '');
  const el = document.getElementById(id);
  if (!el) return false;
  const y = Math.max(0, Math.round(lands.get(id)?.() ?? el.getBoundingClientRect().top + window.scrollY));
  const jump = () => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (landPreview() === 'fade') fadeThrough(jump);
  else if (fly && !still && landPreview() === 'fly') flyTo(y);
  else if (fly && !still) ditherThrough(jump, y > window.scrollY);
  else jump();
  return true;
}

// The flight (2026-10-18, revisits #175): short enough that the seams on the
// way read as one rush, eased at both ends so the landing is calm. Its length
// grows with the distance but never past FLY_MAX. Any wheel, touch or key
// from the reader takes over at once.
const FLY_MIN = 380;
const FLY_MAX = 900;
let flight = 0;
function flyTo(y: number) {
  const from = window.scrollY;
  const dist = y - from;
  if (Math.abs(dist) < 2) return;
  const screens = Math.abs(dist) / window.innerHeight;
  const dur = Math.min(FLY_MAX, FLY_MIN + screens * 90);
  const id = ++flight;
  const t0 = performance.now();
  const stop = () => { flight++; off(); };
  const off = () => ['wheel', 'touchstart', 'keydown'].forEach((t) => window.removeEventListener(t, stop));
  ['wheel', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, stop, { passive: true, once: true }));
  const step = (now: number) => {
    if (id !== flight) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in-out cubic
    window.scrollTo({ top: Math.round(from + dist * e), behavior: 'instant' as ScrollBehavior });
    if (t < 1) requestAnimationFrame(step);
    else off();
  };
  requestAnimationFrame(step);
}

// Preview flag for the landing (#198 follow-up): ?land=calm lands where the
// section's star word is whole, ?land=fade does the same through a short dip
// to black. No flag keeps the old jump to the section top.
export function landPreview(): 'calm' | 'fade' | 'fly' | null {
  const v = new URLSearchParams(window.location.search).get('land');
  return v === 'calm' || v === 'fade' || v === 'fly' ? v : null;
}

// The page dips into the void, moves while nothing is visible, and comes back.
function fadeThrough(jump: () => void) {
  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  veil.style.cssText =
    'position:fixed;inset:0;z-index:90;background:hsl(var(--background));opacity:0;pointer-events:none;transition:opacity 260ms ease-in';
  document.body.appendChild(veil);
  requestAnimationFrame(() => (veil.style.opacity = '1'));
  setTimeout(() => {
    jump();
    veil.style.transition = 'opacity 520ms ease-out';
    requestAnimationFrame(() => requestAnimationFrame(() => (veil.style.opacity = '0')));
    setTimeout(() => veil.remove(), 600);
  }, 280);
}

// The landing (2026-10-18): a scan. An ordered dither of the ground colour
// sweeps across the screen in the direction of travel, led by one red line,
// the way a tracking camera reads a body line by line; the page moves while
// covered and the same scan clears it. A canvas at a quarter of the screen,
// scaled up without smoothing, so each Bayer cell is a 4px dot: the site's
// own fade, cheap enough for any phone.
const DOT = 4;
const SCAN_IN = 300;
const SCAN_OUT = 380;
const SPREAD = 0.35; // how deep the dithered edge of the scan is, in screens
const EDGE = 0.012; // the red line's depth, in screens
const BAYER8 = (() => {
  const m: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let v = 0, xx = x, yy = y ^ x;
    for (let bit = 0; bit < 3; bit++) {
      v = (v << 2) | (((yy & 1) << 1) | (xx & 1));
      xx >>= 1; yy >>= 1;
    }
    m.push((v + 0.5) / 64);
  }
  return m;
})();
function rgbOf(css: string): [number, number, number] {
  const probe = document.createElement('div');
  probe.style.color = css;
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/\d+/g) ?? ['5', '5', '5'];
  probe.remove();
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function ditherThrough(jump: () => void, down: boolean) {
  const w = Math.ceil(window.innerWidth / DOT), h = Math.ceil(window.innerHeight / DOT);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:90;pointer-events:none;image-rendering:pixelated';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  if (!ctx) { c.remove(); jump(); return; }
  const [r, g, b] = rgbOf('hsl(var(--background))');
  const [rr, rg, rb] = rgbOf('hsl(var(--primary-legible))');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  // front: where the scan has got to, 0..1+SPREAD along the travel; cover
  // (true) fills behind the front, clear (false) empties behind it
  const paint = (front: number, cover: boolean) => {
    for (let y = 0; y < h; y++) {
      const along = down ? y / h : 1 - y / h;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const past = front - along; // > 0: the scan has passed this dot
        const thr = BAYER8[(y & 7) * 8 + (x & 7)] * SPREAD;
        let on = cover ? past > thr : past <= thr;
        const red = past > 0 && past < EDGE;
        if (red) on = true;
        d[i] = red ? rr : r; d[i + 1] = red ? rg : g; d[i + 2] = red ? rb : b;
        d[i + 3] = on ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
  const run = (dur: number, cover: boolean, done: () => void) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = cover ? t * t : 1 - (1 - t) * (1 - t);
      paint(e * (1 + SPREAD + EDGE), cover);
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  };
  run(SCAN_IN, true, () => {
    jump();
    // two frames for the new place to paint under the cover
    requestAnimationFrame(() => requestAnimationFrame(() => run(SCAN_OUT, false, () => c.remove())));
  });
}

// Je suis le spectre d'une rose que tu portais hier au bal.
