// ── Lite / Full decision, self-contained on purpose ──
// Used by useRenderMode at runtime, and serialized with Function#toString by
// scripts/prerender-shell.mjs into a tiny inline <head> script, so the page
// paints in the right mode (Chalk for lite, Void for full) before the app
// bundle arrives. Because of that it must not reference anything outside
// its own body: no imports, no module constants.

export function resolveRenderMode(): 'lite' | 'full' {
  if (typeof window === 'undefined') return 'lite';

  // A visitor's own choice from the footer toggle wins.
  try {
    const stored = window.localStorage.getItem('sinaida:render-mode');
    if (stored === 'lite' || stored === 'full') return stored;
  } catch {
    // Storage blocked: fall through to detection.
  }

  // Respect explicit user intent first.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'lite';

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };

  const conn = nav.connection;
  if (conn && conn.saveData) return 'lite';
  if (conn && conn.effectiveType && ['slow-2g', '2g'].indexOf(conn.effectiveType) !== -1) return 'lite';

  // Conservative: anything marginal gets lite.
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'lite';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return 'lite';

  // No WebGL, no full scene.
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return 'lite';
  } catch {
    return 'lite';
  }

  return 'full';
}
