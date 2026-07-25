// ── One-shot Bayer dither for the floating project preview ──
// Pure canvas util: takes an image src, loads it once, downsamples, and
// thresholds each pixel through a 4x4 ordered (Bayer) dither matrix into the
// site's near-black / red palette. Result is cached as a dataURL keyed by
// src so repeated hovers over the same project never re-run the dither.

const PREVIEW_SIZE = 480;

// 4x4 Bayer matrix, normalized to 0..15.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Site palette (see index.css --background / --primary), hardcoded as hex
// per the issue's contract — this runs in a canvas pixel loop, not CSS.
const COLOR_DARK: [number, number, number] = [7, 5, 8]; // ~hsl(280 33% 3%)
const COLOR_RED: [number, number, number] = [250, 0, 0]; // #fa0000

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Dither an image (by src) into a 4x4 Bayer-ordered 1-bit dataURL in the
 * site's black/red palette. Cached — the actual canvas work runs at most
 * once per src for the lifetime of the page.
 */
export async function getDitheredPreview(src: string): Promise<string | null> {
  const cached = cache.get(src);
  if (cached) return cached;

  const pending = inflight.get(src);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const img = await loadImage(src);
      const canvas = document.createElement('canvas');
      const w = PREVIEW_SIZE;
      const h = PREVIEW_SIZE;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Cover-fit crop into the square canvas.
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;
          const on = lum > threshold;
          const [cr, cg, cb] = on ? COLOR_RED : COLOR_DARK;
          data[i] = cr;
          data[i + 1] = cg;
          data[i + 2] = cb;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      cache.set(src, dataUrl);
      return dataUrl;
    } catch {
      // Tainted canvas (remote/CORS image) or load failure — no preview,
      // no crash.
      return null;
    } finally {
      inflight.delete(src);
    }
  })();

  inflight.set(src, promise);
  return promise;
}
