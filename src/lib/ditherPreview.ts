// ── One-shot Bayer dither for the floating project preview ──
// Pure canvas util: takes an image src, loads it once, downsamples, and
// thresholds each pixel through a 4x4 ordered (Bayer) dither matrix into the
// site's near-black / red palette. Result is cached as a dataURL keyed by
// src so repeated hovers over the same project never re-run the dither.

const PREVIEW_SIZE = 960; // twice the shown size: finer dither dots

// 4x4 Bayer matrix, normalized to 0..15.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Site palette (see index.css --background / --sinaida-red), hardcoded as hex
// per the issue's contract — this runs in a canvas pixel loop, not CSS.
const COLOR_DARK: [number, number, number] = [5, 5, 5]; // Void, #050505
const COLOR_RED: [number, number, number] = [205, 0, 0]; // sinaida-red, #cd0000

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
export async function getDitheredPreview(
  src: string,
  w = PREVIEW_SIZE,
  h = PREVIEW_SIZE,
): Promise<string | null> {
  const key = `${src}|${w}x${h}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const img = await loadImage(src);
      const canvas = document.createElement('canvas');
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
      cache.set(key, dataUrl);
      return dataUrl;
    } catch {
      // Tainted canvas (remote/CORS image) or load failure — no preview,
      // no crash.
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

// ── Raw pixel frames for DitherReveal ──
// Same palette and 4x4 Bayer rule as getDitheredPreview, but returns the
// colour and dither pixels as packed Uint32 so a per-frame composite can pick
// between them without touching the canvas API.

export const BAYER_FLAT = new Float32Array(16);
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 4; x++) BAYER_FLAT[y * 4 + x] = (BAYER_4X4[y][x] + 0.5) / 16;
}

// Little-endian ABGR packing, matches ImageData's RGBA byte order.
const pack = (r: number, g: number, b: number) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const PACK_DARK = pack(...COLOR_DARK);
const PACK_RED = pack(...COLOR_RED);

export interface DitherFrames {
  width: number;
  height: number;
  color: Uint32Array;
  dither: Uint32Array;
}

/** The card image, decoded off the main thread (fetch → blob → ImageBitmap),
 *  so building its frames mid-scroll costs no synchronous decode. Falls back
 *  to a plain <img> where that path is missing or fails. */
export async function loadDitherImage(src: string): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      const res = await fetch(src);
      if (res.ok) return await createImageBitmap(await res.blob());
    } catch {
      // fall through to the <img> path
    }
  }
  return loadImage(src);
}

/** Cover-crop `img` into w x h and return its colour and dithered pixels. */
export function buildDitherFrames(img: HTMLImageElement | ImageBitmap, w: number, h: number): DitherFrames | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const color = new Uint32Array(data.data.buffer);
  const dither = new Uint32Array(w * h);
  const bytes = data.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lum = (0.299 * bytes[i * 4] + 0.587 * bytes[i * 4 + 1] + 0.114 * bytes[i * 4 + 2]) / 255;
      dither[i] = lum > BAYER_FLAT[(y & 3) * 4 + (x & 3)] ? PACK_RED : PACK_DARK;
    }
  }
  return { width: w, height: h, color, dither };
}
