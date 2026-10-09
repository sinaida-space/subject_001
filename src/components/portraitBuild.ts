// ── Portrait build for the horizon gate (#120) ──
// The About portrait develops out of the site's own image dither (the 4x4
// Bayer red-on-void used for every work image, lib/ditherPreview) as the
// line's stars land on it, cell by cell from the top, then
// resolves into the real photo the same way. A small 2D canvas laid over
// the photo; cells are 3 css px, drawn one pixel each into a buffer and
// scaled up without smoothing, so a frame costs two drawImage calls.

import { getDitheredPreview } from '@/lib/ditherPreview';
import { BAYER } from '@/components/constellation/cardBuild';

const CELL = 3;

export interface PortraitBuild {
  /** build 0..1: dither developed; resolve 0..1: real photo shows through */
  draw(build: number, resolve: number): void;
  destroy(): void;
}

export function createPortraitBuild(host: HTMLElement, src: string): PortraitBuild {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
  host.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
  const mask = document.createElement('canvas');
  mask.width = cols;
  mask.height = rows;
  const mctx = mask.getContext('2d')!;
  const front = document.createElement('canvas');
  front.width = cols;
  front.height = rows;
  const fctx = front.getContext('2d')!;
  const mImg = mctx.createImageData(cols, rows);
  const fImg = fctx.createImageData(cols, rows);

  let dither: HTMLImageElement | null = null;
  let last = [-1, -1];
  let pending: [number, number] | null = null;
  // the same dither every work image on the site uses, at twice the shown size
  getDitheredPreview(src, w * 2, h * 2).then((url) => {
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      dither = img;
      if (pending) draw(...pending);
    };
    img.src = url;
  });

  function draw(build: number, resolve: number) {
    if (!dither) { pending = [build, resolve]; return; }
    if (build === last[0] && resolve === last[1]) return;
    last = [build, resolve];
    const md = mImg.data, fd = fImg.data;
    for (let y = 0; y < rows; y++) {
      const dist = y / rows;
      const grow = build * 1.3 - dist * 0.3; // develops from the top, where the stars fall in
      const gone = resolve * 1.3 - dist * 0.3; // and resolves into the photo the same way
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const t = BAYER[(y & 7) * 8 + (x & 7)];
        const shown = t < grow - 0.09 && t >= gone;
        const edge = false;
        md[i + 3] = shown ? 255 : 0;
        fd[i] = 255; fd[i + 1] = 40; fd[i + 2] = 34; fd[i + 3] = edge ? 255 : 0; // the hot red front
      }
    }
    mctx.putImageData(mImg, 0, 0);
    fctx.putImageData(fImg, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mask, 0, 0, cols * CELL, rows * CELL);
    ctx.globalCompositeOperation = 'source-in';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(dither, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(front, 0, 0, cols * CELL, rows * CELL);
  }

  return {
    draw,
    destroy() {
      canvas.remove();
    },
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
