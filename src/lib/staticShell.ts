// ── Handoff from the static shell to the app ──
// The built index.html carries a static render of the header and hero (see
// scripts/prerender-shell.mjs) so the headline paints before any JS arrives.
// The home hero (HeroLetters) has no reveal, so the shell's text shows from
// the first frame; HeroSection's decode reveal is skipped whenever the shell
// was visible, rather than scrambling words the visitor is looking at.
//
// Evaluated once, at import time in main.tsx, before React replaces #root.

function readShell(): boolean {
  if (typeof document === 'undefined') return false;
  const hero = document.querySelector('#root [data-shell-hero]');
  if (!hero) return false;
  return getComputedStyle(hero).visibility === 'visible';
}

export const heroShellWasVisible = readShell();
