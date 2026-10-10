import { useEffect, useRef } from 'react';
import { BAYER_FLAT, buildDitherFrames, loadDitherImage, type DitherFrames } from '@/lib/ditherPreview';

// A dithered image whose true colour melts through under the pointer. A low-res
// mask holds the "revealed" amount; it is compared against the Bayer threshold
// per pixel, so the edge of the reveal is dots shrinking into colour. The rAF
// loop only runs while the mask has energy (motion law: it settles and stops).
// `revealed` shows the full colour while it is true (keyboard focus on the
// card around it). `touch={false}` keeps touch and pen out of it, so a tap only
// opens what the image sits in; a mouse still reveals on hover.

interface DitherRevealProps {
  src: string;
  alt: string;
  className?: string;
  aspect?: number;
  /** full colour while true (e.g. keyboard focus) */
  revealed?: boolean;
  /** false: touch and pen do not reveal */
  touch?: boolean;
}

const MASK_SCALE = 4; // mask cell = 4 device px
const RADIUS = 0.22; // disc radius as a share of frame width
const DECAY_TAU = 0.85; // seconds; the trail still reads at 1 s and is gone by ~2.5 s
const EPS = 0.03; // below the lowest Bayer threshold, invisible
const SMEAR_PX = 8; // max colour offset against pointer velocity
// The dither is pixel art: one dot per css px reads the same on every screen
// and keeps the per-pixel composite cheap on an old laptop.
const DPR = 1;

export default function DitherReveal({ src, alt, className = '', aspect = 4 / 3, revealed = false, touch = true }: DitherRevealProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const revealRef = useRef<(() => void) | null>(null);

  // focus reveal: full colour on, back to dither (and any hover trail) off
  useEffect(() => {
    revealRef.current?.();
  }, [revealed]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let img: HTMLImageElement | null = null;
    let frames: DitherFrames | null = null;
    let imageData: ImageData | null = null;
    let out: Uint32Array | null = null;
    let mask = new Float32Array(0);
    let mw = 0;
    let mh = 0;
    let raf = 0;
    let lastT = 0;
    let last: { x: number; y: number } | null = null; // pointer, in canvas px
    let vx = 0;
    let vy = 0;
    // rows [y0,y1) touched by the previous composite, so they get cleaned up
    let dirtyY0 = 0;
    let dirtyY1 = 0;
    let loading = false;
    let disposed = false;

    const build = () => {
      if (!img) return;
      const dpr = DPR;
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      frames = buildDitherFrames(img, w, h);
      if (!frames) return;
      imageData = ctx.createImageData(w, h);
      out = new Uint32Array(imageData.data.buffer);
      out.set(revealedRef.current ? frames.color : frames.dither);
      ctx.putImageData(imageData, 0, 0);
      mw = Math.ceil(w / MASK_SCALE);
      mh = Math.ceil(h / MASK_SCALE);
      mask = new Float32Array(mw * mh);
      dirtyY0 = dirtyY1 = 0;
    };

    const load = async () => {
      if (loading || img) return;
      loading = true;
      try {
        const loaded = await loadDitherImage(src);
        if (disposed) return;
        img = loaded;
        build();
      } catch {
        // load failure: leave the empty void frame
      }
    };

    // Stamp a soft disc into the mask (max-blend so overlaps don't over-brighten).
    const stamp = (px: number, py: number) => {
      if (!frames) return;
      const cx = px / MASK_SCALE;
      const cy = py / MASK_SCALE;
      const r = (frames.width * RADIUS) / MASK_SCALE;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(mw - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(mh - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x - cx, y - cy) / r;
          if (d >= 1) continue;
          const v = Math.min(1, (1 - d) * 1.8);
          const i = y * mw + x;
          if (v > mask[i]) mask[i] = v;
        }
      }
    };

    // Composite only the rows that hold energy now or did last frame.
    const composite = () => {
      if (!frames || !out || !imageData) return false;
      if (revealedRef.current) return false; // focus holds the full colour
      const { width: w, height: h, color, dither } = frames;
      let minRow = mh;
      let maxRow = -1;
      let energy = false;
      for (let y = 0; y < mh; y++) {
        const o = y * mw;
        for (let x = 0; x < mw; x++) {
          if (mask[o + x] > EPS) {
            energy = true;
            if (y < minRow) minRow = y;
            if (y > maxRow) maxRow = y;
            break;
          }
        }
      }
      // mask rows -> pixel rows, padded by a cell for the bilinear taps
      const cy0 = energy ? Math.max(0, (minRow - 1) * MASK_SCALE) : h;
      const cy1 = energy ? Math.min(h, (maxRow + 2) * MASK_SCALE) : 0;
      const y0 = Math.min(cy0, dirtyY0 || cy0);
      const y1 = Math.max(cy1, dirtyY1);
      const speed = Math.min(1, Math.hypot(vx, vy) / 2400);
      const sx = speed ? (vx / Math.hypot(vx, vy)) * SMEAR_PX * speed : 0;
      const sy = speed ? (vy / Math.hypot(vx, vy)) * SMEAR_PX * speed : 0;

      for (let y = y0; y < y1; y++) {
        const fy = Math.max(0, y / MASK_SCALE - 0.5);
        const my = Math.min(mh - 2, Math.floor(fy));
        const ty = fy - my;
        for (let x = 0; x < w; x++) {
          const fx = Math.max(0, x / MASK_SCALE - 0.5);
          const mx = Math.min(mw - 2, Math.floor(fx));
          const tx = fx - mx;
          const i0 = Math.max(0, my) * mw + Math.max(0, mx);
          const a = mask[i0] + (mask[i0 + 1] - mask[i0]) * tx;
          const b = mask[i0 + mw] + (mask[i0 + mw + 1] - mask[i0 + mw]) * tx;
          const m = a + (b - a) * ty;
          const p = y * w + x;
          if (m > BAYER_FLAT[(y & 3) * 4 + (x & 3)]) {
            // smear: sample colour behind the motion, more where the mask is full
            let cxp = x - sx * m;
            let cyp = y - sy * m;
            cxp = cxp < 0 ? 0 : cxp > w - 1 ? w - 1 : cxp;
            cyp = cyp < 0 ? 0 : cyp > h - 1 ? h - 1 : cyp;
            out[p] = color[(cyp | 0) * w + (cxp | 0)];
          } else {
            out[p] = dither[p];
          }
        }
      }
      if (y1 > y0) ctx.putImageData(imageData, 0, 0, 0, y0, w, y1 - y0);
      dirtyY0 = energy ? cy0 : 0;
      dirtyY1 = energy ? cy1 : 0;
      return energy;
    };

    const tick = (t: number) => {
      const dt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
      lastT = t;
      const k = Math.exp(-dt / DECAY_TAU);
      for (let i = 0; i < mask.length; i++) mask[i] = mask[i] > EPS ? mask[i] * k : 0;
      vx *= k;
      vy *= k;
      raf = composite() ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (raf) return;
      lastT = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const toCanvas = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const sxr = (frames?.width ?? r.width) / r.width;
      return { x: (e.clientX - r.left) * sxr, y: (e.clientY - r.top) * sxr, k: sxr };
    };

    const showFull = (full: boolean) => {
      if (!frames || !out || !imageData) return;
      out.set(full ? frames.color : frames.dither);
      ctx.putImageData(imageData, 0, 0);
    };

    const onDown = (e: PointerEvent) => {
      void load();
      if (!touch && e.pointerType !== 'mouse') return;
      if (reduced) return showFull(true);
      const p = toCanvas(e);
      last = { x: p.x, y: p.y };
      stamp(p.x, p.y);
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (reduced || !frames) return;
      // touch and pen only reveal while pressed; a mouse reveals on hover
      if (e.pointerType !== 'mouse' && (e.buttons === 0 || !touch)) return;
      const p = toCanvas(e);
      if (last) {
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (frames.width * RADIUS * 0.3)));
        for (let s = 1; s <= steps; s++) stamp(last.x + (dx * s) / steps, last.y + (dy * s) / steps);
        const dtMs = Math.max(8, e.timeStamp - lastMove);
        vx = (dx / dtMs) * 1000;
        vy = (dy / dtMs) * 1000;
      } else {
        stamp(p.x, p.y);
      }
      lastMove = e.timeStamp;
      last = { x: p.x, y: p.y };
      kick();
    };
    let lastMove = 0;
    const onEnter = (e: PointerEvent) => {
      void load();
      if (reduced && e.pointerType === 'mouse') showFull(true);
    };
    const onLeave = () => {
      last = null;
      if (reduced && !revealedRef.current) showFull(false);
    };

    revealRef.current = () => {
      mask.fill(0);
      dirtyY0 = dirtyY1 = 0;
      showFull(revealedRef.current);
    };
    wrap.addEventListener('pointerenter', onEnter);
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('pointerup', onLeave);
    wrap.addEventListener('pointercancel', onLeave);

    // Load only when near the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          void load();
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    // a frame in a strip may sit translated off-screen or clipped, so it
    // loads with the strip around it
    io.observe(wrap.closest('ul') || wrap);

    // Re-dither at the new size; the decoded image is reused.
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (img && w !== lastW) build();
      lastW = w;
    });
    ro.observe(wrap);

    return () => {
      disposed = true;
      revealRef.current = null;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener('pointerenter', onEnter);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      wrap.removeEventListener('pointerup', onLeave);
      wrap.removeEventListener('pointercancel', onLeave);
    };
  }, [src, touch]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: String(aspect),
        background: '#050505',
        border: '1px solid hsl(var(--sinaida-red) / 0.35)',
        touchAction: 'pan-y',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
