// ── Lite / Full render mode ──
// Lite is not a fallback page — it's the same page without the expensive layers
// (WebGL starfield, canvas constellation, heavy motion). Detection runs once at
// first paint (<5ms, no benchmark). A manual footer toggle overrides and persists.
// The decision itself lives in resolveRenderMode, which also runs as an inline
// <head> script in the built HTML (see scripts/prerender-shell.mjs).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveRenderMode } from '@/lib/resolveRenderMode';

export type RenderMode = 'lite' | 'full';

const STORAGE_KEY = 'sinaida:render-mode';

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

export function RenderModeProvider({ children, initialMode }: { children: ReactNode; initialMode?: RenderMode }) {
  // Start from the stored override if present, else detect. initialMode is
  // only passed by the build-time static render (src/entry-shell.tsx).
  const [mode, setMode] = useState<RenderMode>(() => initialMode ?? resolveRenderMode());
  const [overridden, setOverridden] = useState<boolean>(() => readStored() !== null);

  useEffect(() => {
    // Re-detect once on mount in case the first render was SSR-safe default.
    if (!overridden) setMode(resolveRenderMode());
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
        const next: RenderMode = mode === 'full' ? 'lite' : 'full';
        let stored = true;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          stored = false;
        }
        // Lite paints a light page, full a dark one. iOS Safari samples the
        // colour behind its toolbars once per page load and does not re-sample
        // when the page recolours, so switching lite to full left a white strip
        // under the bottom bar. A reload lets it sample the new ground. The
        // choice is already persisted, so the page comes back in the new mode.
        // Without storage a reload would drop the choice, so switch in place.
        if (stored) {
          window.location.reload();
          return;
        }
        setMode(next);
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
