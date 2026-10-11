// ── Resolving out of dither, by CSS mask (#179) ──
// The footer's pieces (logo, columns, the bottom line) come through a 4x4
// Bayer mask of 2 css px cells, the site's one dither grain. Level k of 16
// opens the cells whose threshold is under k: 0 shows nothing, 16 drops the
// mask. Seventeen tiny tiles are made once; a step of the scroll only swaps
// which one an element wears, so it works on text and the SVG logo alike.
// While forming the piece is tinted red (index.css, .dither-forming); a
// focused piece always shows whole.

const CELL = 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
let tiles: string[] | null = null;

function makeTiles() {
  const c = document.createElement('canvas');
  c.width = c.height = 4 * CELL;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const out: string[] = [];
  for (let k = 0; k <= 16; k++) {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    BAYER.forEach((b, i) => {
      if (b < k) ctx.fillRect((i % 4) * CELL, Math.floor(i / 4) * CELL, CELL, CELL);
    });
    out.push(`url(${c.toDataURL()})`);
  }
  return out;
}

/** show `el` at dither level k, 0..16 */
export function ditherMask(el: HTMLElement, k: number) {
  const s = el.style;
  // a piece not yet showing keeps no clearing in the ground (city.ts textRects)
  el.toggleAttribute('data-unformed', k <= 0);
  if (k >= 16) {
    s.maskImage = s.webkitMaskImage = '';
    el.classList.remove('dither-forming');
    return;
  }
  tiles ??= makeTiles();
  if (!tiles) return;
  s.maskImage = s.webkitMaskImage = tiles[Math.max(0, k)];
  s.maskSize = s.webkitMaskSize = `${4 * CELL}px ${4 * CELL}px`;
  s.maskRepeat = s.webkitMaskRepeat = 'repeat';
  el.classList.add('dither-forming');
}

// Je suis le spectre d'une rose que tu portais hier au bal.
