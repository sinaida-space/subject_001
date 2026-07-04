// ── Lite / Full render mode ──
// Lite is not a fallback page — it's the same page without the expensive layers
// (WebGL starfield, canvas constellation, heavy motion). Detection runs once at
// first paint (<5ms, no benchmark). A manual footer toggle overrides and persists.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type RenderMode = 'lite' | 'full';

const STORAGE_KEY = 'sinaida:render-mode';

/** Heuristic capability check. Conservative: anything marginal → lite. */
function detectMode(): RenderMode {
  if (typeof window === 'undefined') return 'lite';

  // Respect explicit user intent first.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'lite';

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };

  const conn = nav.connection;
  if (conn?.saveData) return 'lite';
  if (conn?.effectiveType && ['slow-2g', '2g'].includes(conn.effectiveType)) return 'lite';

  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'lite';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return 'lite';

  // No WebGL → no full scene.
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return 'lite';
  } catch {
    return 'lite';
  }

  return 'full';
}

function readStored(): RenderMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'lite' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}

interface Ctx {
  mode: RenderMode;
  /** true when the mode was chosen by the visitor, not detected */
  overridden: boolean;
  toggle: () => void;
}

const RenderModeContext = createContext<Ctx>({ mode: 'full', overridden: false, toggle: () => {} });

export function RenderModeProvider({ children }: { children: ReactNode }) {
  // Start from the stored override if present, else detect.
  const [mode, setMode] = useState<RenderMode>(() => readStored() ?? detectMode());
  const [overridden, setOverridden] = useState<boolean>(() => readStored() !== null);

  useEffect(() => {
    // Re-detect once on mount in case the first render was SSR-safe default.
    if (!overridden) setMode(detectMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      overridden,
      toggle: () => {
        setMode((m) => {
          const next: RenderMode = m === 'full' ? 'lite' : 'full';
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          return next;
        });
        setOverridden(true);
      },
    }),
    [mode, overridden],
  );

  return <RenderModeContext.Provider value={value}>{children}</RenderModeContext.Provider>;
}

export function useRenderMode(): Ctx {
  return useContext(RenderModeContext);
}
