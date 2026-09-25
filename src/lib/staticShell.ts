// ── Handoff from the static shell to the app ──
// The built index.html carries a static render of the header and hero (see
// scripts/prerender-shell.mjs) so the headline paints before any JS arrives.
// In full mode the shell's hero text is held back for a moment by CSS
// (.shell-hold in index.css): on a fast load the app replaces it before it
// ever shows and the decode reveal plays as usual. On a slow load the text
// has already been read, so the reveal is skipped rather than scrambling
// words the visitor is looking at.
//
// Evaluated once, at import time in main.tsx, before React replaces #root.

function readShell(): boolean {
  if (typeof document === 'undefined') return false;
  const hero = document.querySelector('#root [data-shell-hero]');
  if (!hero) return false;
  return getComputedStyle(hero).visibility === 'visible';
}

export const heroShellWasVisible = readShell();
