// Text as dither: every visible glyph under a root, read back on the site's
// 3 px grid. Shared by the horizon gate (#120) and the work build (#121).

const CELL = 3; // css px, the site's dither cell

export interface Cell { x: number; y: number; r: number; g: number; b: number; blk?: number }

// Decoded background images (the hero's red project dither), keyed by url.
// Sampling is synchronous, so callers prime them first.
const images = new Map<string, HTMLImageElement>();
const urlOf = (bg: string) => /^url\("?(.*?)"?\)$/.exec(bg)?.[1] ?? '';
export function primeImages(root: HTMLElement): Promise<unknown> {
  const urls = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .map((el) => urlOf(getComputedStyle(el).backgroundImage))
    .filter((u) => u && !images.has(u));
  return Promise.all(urls.map((u) => {
    const img = new Image();
    img.src = u;
    return img.decode().then(() => { images.set(u, img); }, () => undefined);
  }));
}

// false when the element or an ancestor up to `root` is transparent (a
// hidden caption, a footnote waiting for its click)
function shown(el: Element, root: Element) {
  for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) {
    if (parseFloat(getComputedStyle(e).opacity) < 0.05) return false;
  }
  return true;
}

// Draws every visible glyph under `root` into a canvas at its rendered place,
// then reads it back on the 3 px grid. Coordinates come back in page px.
// `blockOf` tags each cell with the block it was drawn from (drawn a second
// time into an id canvas). The index is spread over red and green in steps
// of 16, so antialiased glyph edges cannot shift it to a neighbouring block.
export function sampleText(root: HTMLElement, skip: (el: Element) => boolean, box: DOMRect, checkOpacity: boolean, blockOf?: (el: Element) => number): Cell[] {
  const w = Math.ceil(box.width), h = Math.ceil(box.height);
  if (w < 1 || h < 1) return [];
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const idCv = blockOf ? document.createElement('canvas') : null;
  const idCtx = idCv?.getContext('2d', { willReadFrequently: true }) ?? null;
  if (idCv) { idCv.width = w; idCv.height = h; }
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || (checkOpacity && !shown(el, root))) continue;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // a glyph filled through background-clip: text (the hero's project words)
    // has a transparent colour; its visible fill is the background colour
    const clipped = (cs.backgroundClip === 'text' || cs.getPropertyValue('-webkit-background-clip') === 'text') && /^rgba\(.*,\s*0\)$/.test(cs.color);
    ctx.fillStyle = clipped ? cs.backgroundColor : cs.color;
    ctx.textBaseline = 'alphabetic';
    if (idCtx && blockOf) {
      idCtx.font = ctx.font;
      const id = blockOf(el) + 1;
      idCtx.fillStyle = `rgb(${(id % 16) * 16},${Math.floor(id / 16) * 16},0)`;
    }
    const upper = cs.textTransform === 'uppercase';
    const text = n.data;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width < 1 || r.bottom < box.top || r.top > box.bottom) continue;
      const ch = upper ? text[i].toUpperCase() : text[i];
      const m = ctx.measureText(ch);
      const base = r.top + (r.height + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
      ctx.fillText(ch, r.left - box.left, base - box.top);
      idCtx?.fillText(ch, r.left - box.left, base - box.top);
    }
    // lay the element's dither into the glyphs just drawn, as the page does
    const img = clipped ? images.get(urlOf(cs.backgroundImage)) : undefined;
    if (img) {
      const r = el.getBoundingClientRect();
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, r.left - box.left, r.top - box.top, r.width, r.height);
      ctx.restore();
    }
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  const ids = idCtx?.getImageData(0, 0, w, h).data;
  const cells: Cell[] = [];
  const sy = window.scrollY;
  // the grid is aligned to the page, so cells land on the same lattice everywhere
  const x0 = Math.ceil(box.left / CELL) * CELL - box.left;
  const y0 = Math.ceil((box.top + sy) / CELL) * CELL - (box.top + sy);
  for (let y = y0 + 1; y < h; y += CELL) {
    for (let x = x0 + 1; x < w; x += CELL) {
      const k = ((y | 0) * w + (x | 0)) * 4;
      if (data[k + 3] < 110) continue;
      cells.push({ x: box.left + x, y: box.top + sy + y, r: data[k] / 255, g: data[k + 1] / 255, b: data[k + 2] / 255, blk: ids ? Math.round(ids[k] / 16) + 16 * Math.round(ids[k + 1] / 16) - 1 : undefined });
    }
  }
  return cells;
}


// Je suis le spectre d'une rose que tu portais hier au bal.
