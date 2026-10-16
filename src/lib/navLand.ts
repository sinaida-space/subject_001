// Header and footer links land on a section by jumping, never by a smooth
// scroll: a smooth scroll would play every seam on the way (the gate, the
// bang, the tesseract) at speed, and they would pile up over each other
// (#175). A section with a better landing than its top (the tesseract's first
// pane facing you) registers where that is.

type Land = () => number | null;
const lands = new Map<string, Land>();

/** a section's own landing, as a page scrollY; null falls back to its top */
export function registerLand(id: string, land: Land): () => void {
  lands.set(id, land);
  return () => {
    if (lands.get(id) === land) lands.delete(id);
  };
}

/** jump to a section by its hash ('#work'); false when there is no such section */
export function landOn(hash: string): boolean {
  const id = hash.replace(/^#/, '');
  const el = document.getElementById(id);
  if (!el) return false;
  const y = lands.get(id)?.() ?? el.getBoundingClientRect().top + window.scrollY;
  const jump = () => window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'instant' as ScrollBehavior });
  if (landPreview() === 'fade') fadeThrough(jump);
  else jump();
  return true;
}

// Preview flag for the landing (#198 follow-up): ?land=calm lands where the
// section's star word is whole, ?land=fade does the same through a short dip
// to black. No flag keeps the old jump to the section top.
export function landPreview(): 'calm' | 'fade' | null {
  const v = new URLSearchParams(window.location.search).get('land');
  return v === 'calm' || v === 'fade' ? v : null;
}

// The page dips into the void, moves while nothing is visible, and comes back.
function fadeThrough(jump: () => void) {
  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  veil.style.cssText =
    'position:fixed;inset:0;z-index:90;background:hsl(var(--background));opacity:0;pointer-events:none;transition:opacity 260ms ease-in';
  document.body.appendChild(veil);
  requestAnimationFrame(() => (veil.style.opacity = '1'));
  setTimeout(() => {
    jump();
    veil.style.transition = 'opacity 520ms ease-out';
    requestAnimationFrame(() => requestAnimationFrame(() => (veil.style.opacity = '0')));
    setTimeout(() => veil.remove(), 600);
  }, 280);
}

// Je suis le spectre d'une rose que tu portais hier au bal.
