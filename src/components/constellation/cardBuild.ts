// Card build-up (#119): once a card lands at the end of its projection
// throw, its contents come up in the work's own dialect, the same grammar
// the constellation dives speak. A canvas lies over the card and starts as
// a solid cover; draw(q) uncovers it, q = 0 covered .. 1 fully clear. The
// frame is a pure function of q, so closing plays the same frames backwards.
//
//   crt     a TV finding signal: a hot line opens into a band, scanlines and
//           an RGB split settle as the picture locks
//   dither  a red ordered-dither front develops across the card, leaving
//           the real content behind it
//   ascii   rows print top to bottom through a glyph density ramp

import type { Dialect } from '@/lib/diveBus';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// 8x8 Bayer matrix, thresholds 0..1
const BAYER = (() => {
  const m = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ];
  return m.map((v) => (v + 0.5) / 64);
})();

const RAMP = '@%#*+=-:.';

export interface CardBuild {
  draw(q: number): void;
  /** RGB split for the card element itself (crt only), px */
  split(q: number): number;
}

export function createCardBuild(canvas: HTMLCanvasElement, dialect: Dialect, cover: string, red: string): CardBuild {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (dialect === 'dither') {
    // cells are rendered one pixel each into a small buffer, then scaled up
    // without smoothing: 1-bit cells at the cost of a single drawImage
    const CELL = 6;
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    const buf = document.createElement('canvas');
    buf.width = cols;
    buf.height = rows;
    const bctx = buf.getContext('2d')!;
    const img = bctx.createImageData(cols, rows);
    const rgb = (css: string) => {
      bctx.fillStyle = css;
      bctx.fillRect(0, 0, 1, 1);
      return bctx.getImageData(0, 0, 1, 1).data;
    };
    const cv = rgb(cover);
    const rv = rgb(red);
    // the front develops outward from the image side (left), slightly radial
    const reach = Math.hypot(cols, rows * 1.4);
    return {
      split: () => 0,
      draw(q) {
        const d = img.data;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const dist = Math.hypot(x, (y - rows / 2) * 1.4) / reach;
            const front = q * 1.3 - dist * 0.3; // where the develop has reached
            const t = BAYER[(y & 7) * 8 + (x & 7)];
            if (t < front - 0.09) {
              d[i + 3] = 0; // developed: the real card shows
            } else if (t < front) {
              d[i] = rv[0]; d[i + 1] = rv[1]; d[i + 2] = rv[2]; d[i + 3] = 255; // the red front
            } else {
              d[i] = cv[0]; d[i + 1] = cv[1]; d[i + 2] = cv[2]; d[i + 3] = 255; // still covered
            }
          }
        }
        bctx.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, cols * CELL, rows * CELL);
      },
    };
  }

  if (dialect === 'ascii') {
    const CW = 10;
    const CH = 16;
    const cols = Math.ceil(w / CW);
    const rows = Math.ceil(h / CH);
    const mono = getComputedStyle(canvas).getPropertyValue('--font-mono').trim() || 'monospace';
    ctx.font = `${CH - 3}px ${mono}`;
    ctx.textBaseline = 'top';
    const hash = (x: number, y: number) => {
      const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    return {
      split: () => 0,
      draw(q) {
        ctx.clearRect(0, 0, w, h);
        for (let y = 0; y < rows; y++) {
          // each row prints a little after the one above it
          const local = q * 1.7 - (y / rows) * 0.7;
          if (local >= 1) continue; // printed: the real line shows
          const yy = y * CH;
          if (local <= 0) {
            ctx.fillStyle = cover;
            ctx.fillRect(0, yy, w, CH);
            continue;
          }
          for (let x = 0; x < cols; x++) {
            // every cell walks the ramp from dense to sparse, a little out of step
            const k = clamp01(local * 1.25 - hash(x, y) * 0.25);
            if (k >= 1) continue;
            ctx.fillStyle = cover;
            ctx.fillRect(x * CW, yy, CW, CH);
            if (k > 0) {
              ctx.fillStyle = red;
              ctx.globalAlpha = 1 - k * 0.6;
              ctx.fillText(RAMP[Math.min(RAMP.length - 1, Math.floor(k * RAMP.length))], x * CW + 1, yy + 1);
              ctx.globalAlpha = 1;
            }
          }
        }
      },
    };
  }

  // crt
  return {
    split: (q) => 3 * (1 - smooth(0.35, 1, q)),
    draw(q) {
      ctx.clearRect(0, 0, w, h);
      const open = smooth(0, 0.5, q); // the line opens into a band
      const settle = smooth(0.4, 1, q); // scanlines and glow cool off
      const band = Math.max(2, h * open);
      const top = (h - band) / 2;
      ctx.fillStyle = cover;
      ctx.fillRect(0, 0, w, top);
      ctx.fillRect(0, top + band, w, h - top - band);
      if (settle < 1) {
        // scanlines across the open band
        ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - settle)})`;
        for (let y = Math.floor(top); y < top + band; y += 3) ctx.fillRect(0, y, w, 1);
        // the hot edges of the opening picture
        ctx.globalAlpha = 1 - settle;
        ctx.shadowColor = red;
        ctx.shadowBlur = 18;
        ctx.fillStyle = open < 0.15 ? '#fff' : red;
        ctx.fillRect(0, top - 1, w, 2);
        ctx.fillRect(0, top + band - 1, w, 2);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    },
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
