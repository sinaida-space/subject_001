// ── Portrait develop for the quote gate (#161) ──
// Once the stars have settled into the portrait square, the site's own image
// dither (the Bayer red-on-void used for every work image, lib/ditherPreview)
// fades in over the whole square, then the photo lights up cell by cell: each
// 3 px cell has its own Bayer threshold, and when the progress passes it the
// cell turns from red to the photo's true colour there, with a brief bright
// over-shoot so it reads as a pixel switching on. At the end the real <img>
// takes over (QuoteGate flips its opacity) and this canvas hides.
//
// A small 2D canvas laid over the photo; the colour cells are drawn one pixel
// each into a buffer and scaled up without smoothing, so a frame costs two
// drawImage calls.

import { getDitheredPreview } from '@/lib/ditherPreview';
import { BAYER } from '@/components/constellation/cardBuild';

const CELL = 3;
const FLASH = 1.6; // brightness of a cell the moment it lights up
const FLASH_FOR = 0.08; // and for how much progress it stays over-bright

// the filter the <img> wears, so the lit cells match it at the hand-over
const PHOTO_FILTER = 'contrast(1.08) brightness(0.92) saturate(0.85)';

export interface PortraitBuild {
  /** red 0..1: the soft red dither fades in; colour 0..1: cells light up into the photo (1 = canvas hidden) */
  draw(red: number, colour: number): void;
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
  const front = document.createElement('canvas');
  front.width = cols;
  front.height = rows;
  const fctx = front.getContext('2d')!;
  const fImg = fctx.createImageData(cols, rows);

  let dither: HTMLImageElement | null = null;
  let truth: Uint8ClampedArray | null = null; // the photo's colour at each cell
  let last = [-1, -1];
  let pending: [number, number] | null = null;
  const ready = () => {
    if (dither && truth && pending) draw(...pending);
  };

  // the same dither every work image on the site uses, at twice the shown size
  getDitheredPreview(src, w * 2, h * 2).then((url) => {
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      dither = img;
      ready();
    };
    img.src = url;
  });

  // the photo, averaged down to one pixel per cell, cropped like object-fit: cover
  const photo = new Image();
  photo.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = cols;
    cv.height = rows;
    const c = cv.getContext('2d', { willReadFrequently: true });
    if (!c) return;
    const s = Math.max(cols / photo.naturalWidth, rows / photo.naturalHeight);
    const dw = photo.naturalWidth * s, dh = photo.naturalHeight * s;
    c.filter = PHOTO_FILTER;
    c.imageSmoothingQuality = 'high';
    c.drawImage(photo, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    truth = c.getImageData(0, 0, cols, rows).data;
    ready();
  };
  photo.src = src;

  function draw(red: number, colour: number) {
    if (!dither || !truth) { pending = [red, colour]; return; }
    if (red === last[0] && colour === last[1]) return;
    last = [red, colour];
    // fully lit: the real photo shows, this canvas steps aside
    const hidden = colour >= 1 || (red <= 0 && colour <= 0);
    canvas.style.visibility = hidden ? 'hidden' : '';
    if (hidden) return;

    const fd = fImg.data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lit = colour - BAYER[(y & 7) * 8 + (x & 7)];
        if (lit <= 0) { fd[i + 3] = 0; continue; }
        // over-bright for a moment, then its true colour
        const k = FLASH + (1 - FLASH) * Math.min(1, lit / FLASH_FOR);
        fd[i] = truth[i] * k; fd[i + 1] = truth[i + 1] * k; fd[i + 2] = truth[i + 2] * k; fd[i + 3] = 255;
      }
    }
    fctx.putImageData(fImg, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // the soft red dither over the whole square, by alpha
    ctx.globalAlpha = red;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(dither, 0, 0, w, h);
    ctx.globalAlpha = 1;
    // the lit cells cover it
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
