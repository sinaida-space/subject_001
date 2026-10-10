import { useEffect, useRef } from 'react';
import { BAYER_FLAT, buildDitherFrames, loadDitherImage, type DitherFrames } from '@/lib/ditherPreview';

// A dithered image whose true colour melts through under the pointer. A low-res
// mask holds the "revealed" amount; it is compared against the Bayer threshold
// per pixel, so the edge of the reveal is dots shrinking into colour. The rAF
// loop only runs while the mask has energy (motion law: it settles and stops).
// With `progress` set the pointer is ignored: the caller scrubs the reveal
// (0 red dither, 1 full colour) and pixels switch in Bayer-threshold order,
// each flashing a little brighter for a short stretch after it switches.

interface DitherRevealProps {
  src: string;
  alt: string;
  className?: string;
  aspect?: number;
  /** scrubbed reveal, 0..1; undefined keeps the pointer-driven reveal */
  progress?: number;
}

const MASK_SCALE = 4; // mask cell = 4 device px
const RADIUS = 0.22; // disc radius as a share of frame width
const DECAY_TAU = 0.85; // seconds; the trail still reads at 1 s and is gone by ~2.5 s
const EPS = 0.03; // below the lowest Bayer threshold, invisible
const SMEAR_PX = 8; // max colour offset against pointer velocity
const OVERSHOOT = 0.09; // progress band in which a just-switched pixel stays brighter

// Brighten one packed ABGR pixel for the over-shoot flash.
const brighten = (c: number) => {
  const r = Math.min(255, (c & 255) * 1.35 + 30);
  const g = Math.min(255, ((c >>> 8) & 255) * 1.35 + 30);
  const b = Math.min(255, ((c >>> 16) & 255) * 1.35 + 30);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
};

export default function DitherReveal({ src, alt, className = '', aspect = 4 / 3, progress }: DitherRevealProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrubbed = progress !== undefined;
  const progressRef = useRef(progress ?? 0);
  progressRef.current = progress ?? 0;
  const paintRef = useRef<(() => void) | null>(null);

  // scrubbed mode: repaint when the caller moves the progress
  useEffect(() => {
    paintRef.current?.();
  }, [progress]);

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
    let bright: Uint32Array | null = null;
    let lastKey = -1;

    // Scrubbed paint. Each of the 16 Bayer levels is dither, bright or colour,
    // so the picture only changes when that state changes: a repaint costs one
    // pass, and most scroll frames cost nothing.
    const paintProgress = (force = false) => {
      if (!frames || !out || !imageData || !bright) return;
      const q = Math.min(1, Math.max(0, progressRef.current)) * (1 + OVERSHOOT);
      const state = new Uint8Array(16);
      let key = 0;
      for (let i = 0; i < 16; i++) {
        const d = q - BAYER_FLAT[i];
        state[i] = d <= 0 ? 0 : d < OVERSHOOT ? 1 : 2;
        key = key * 3 + state[i];
      }
      if (!force && key === lastKey) return;
      lastKey = key;
      const { width: w, height: h, color, dither } = frames;
      const src = [dither, bright, color];
      for (let y = 0; y < h; y++) {
        const row = (y & 3) * 4;
        const o = y * w;
        for (let x = 0; x < w; x++) out[o + x] = src[state[row + (x & 3)]][o + x];
      }
      ctx.putImageData(imageData, 0, 0);
    };

    const build = () => {
      if (!img) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      frames = buildDitherFrames(img, w, h);
      if (!frames) return;
      imageData = ctx.createImageData(w, h);
      out = new Uint32Array(imageData.data.buffer);
      out.set(frames.dither);
      ctx.putImageData(imageData, 0, 0);
      mw = Math.ceil(w / MASK_SCALE);
      mh = Math.ceil(h / MASK_SCALE);
      mask = new Float32Array(mw * mh);
      dirtyY0 = dirtyY1 = 0;
      if (scrubbed) {
        bright = frames.color.map(brighten);
        paintProgress(true);
      }
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
      if (reduced) return showFull(true);
      const p = toCanvas(e);
      last = { x: p.x, y: p.y };
      stamp(p.x, p.y);
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (reduced || !frames) return;
      // touch and pen only reveal while pressed; a mouse reveals on hover
      if (e.pointerType !== 'mouse' && e.buttons === 0) return;
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
      if (reduced) showFull(false);
    };

    if (scrubbed) {
      paintRef.current = () => paintProgress();
    } else {
      wrap.addEventListener('pointerenter', onEnter);
      wrap.addEventListener('pointerdown', onDown);
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerleave', onLeave);
      wrap.addEventListener('pointerup', onLeave);
      wrap.addEventListener('pointercancel', onLeave);
    }

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
    // a scrubbed frame may sit translated off-screen inside its strip, so it
    // loads with the strip around it
    io.observe((scrubbed && wrap.closest('ul')) || wrap);

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
      paintRef.current = null;
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
  }, [src, scrubbed]);

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
