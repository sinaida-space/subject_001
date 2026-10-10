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
  window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'instant' as ScrollBehavior });
  return true;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
