import { useEffect, useRef, type ReactNode } from 'react';

// ── Glitter on a word (#179) ──
// LET'S TALK laced with star points, in the memory of her first MySpace
// pages, kept neat: a sparse scatter of points on the word's own ink, each a
// tiny four-point star that glints only while the page scrolls. Which ones
// flash depends on where the scroll is, how bright on how fast it moves; when
// the scroll stops they go out within a breath, and nothing is drawn at rest.
// Full mode only; the word itself stays real text.

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const RED = 'rgb(255,26,26)';

interface Point { x: number; y: number; phase: number; arm: number; red: boolean }

const fract = (x: number) => x - Math.floor(x);

/** points on the ink of `el`'s text, laid out the way the browser lays it */
function sample(el: HTMLElement, w: number, h: number): Point[] {
  const cs = getComputedStyle(el);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing;
  const text = cs.textTransform === 'uppercase' ? (el.textContent ?? '').toUpperCase() : el.textContent ?? '';
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize);
  // the baseline sits where the line box centres the font's content area
  const base = (lh - (asc + desc)) / 2 + asc;
  ctx.fillStyle = '#fff';
  ctx.fillText(text.trim(), 0, base);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  const ink: number[] = [];
  for (let y = 0; y < c.height; y += 3) {
    for (let x = 0; x < c.width; x += 3) if (px[(y * c.width + x) * 4 + 3] > 200) ink.push(x, y);
  }
  const n = Math.max(30, Math.min(140, Math.round((w * h) / 1600)));
  const pts: Point[] = [];
  for (let i = 0; i < n && ink.length; i++) {
    const k = Math.floor(fract(Math.sin(i * 91.17) * 43758.5) * (ink.length / 2)) * 2;
    const r = fract(Math.sin(i * 12.9898) * 43758.5453);
    pts.push({ x: ink[k], y: ink[k + 1], phase: r * Math.PI * 2, arm: 2 + 3 * fract(r * 7.3), red: fract(r * 3.1) < 0.2 });
  }
  return pts;
}

export default function GlitterText({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const word = wrap?.firstElementChild as HTMLElement | null;
    const ctx = canvas?.getContext('2d');
    if (REDUCED || !wrap || !canvas || !word || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pts: Point[] = [];
    let w = 0, h = 0;
    let level = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let raf = 0;
    let dead = false;

    const measure = () => {
      w = word.offsetWidth;
      h = word.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.style.left = `${word.offsetLeft}px`;
      canvas.style.top = `${word.offsetTop}px`;
      pts = sample(word, w, h);
    };
    const draw = () => {
      raf = 0;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // the scroll's speed lights them; it goes out within a breath of stopping
      level *= Math.exp(-dt * 7);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (level < 0.01) {
        level = 0;
        return;
      }
      const at = window.scrollY * 0.035;
      for (const p of pts) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(at + p.phase), 10) * level;
        if (tw < 0.04) continue;
        const arm = p.arm * tw;
        ctx.globalAlpha = Math.min(1, tw * 1.4);
        ctx.fillStyle = p.red ? RED : '#fff';
        ctx.fillRect(p.x - 0.5, p.y - arm, 1, 2 * arm);
        ctx.fillRect(p.x - arm, p.y - 0.5, 2 * arm, 1);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    const onScroll = () => {
      const y = window.scrollY;
      level = Math.min(1, Math.max(level, Math.abs(y - lastY) / 30));
      lastY = y;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    const start = () => {
      if (dead) return;
      measure();
    };
    document.fonts.ready.then(start, start);
    const ro = new ResizeObserver(start);
    ro.observe(word);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-fit">
      {children}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0" />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
