import { Suspense, lazy, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CATEGORY_COLORS, CATEGORY_LABEL, type Category, type GraphNode } from '@/data/graph';
import ConstellationLite from './ConstellationLite';

const ConstellationFull = lazy(() => import('./ConstellationFull'));

const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];

export default function Constellation() {
  const { mode } = useRenderMode();
  const [active, setActive] = useState<GraphNode['project'] | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} id="constellation" className="relative z-10 py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* LEFT COLUMN — label + legend (matches site pattern) */}
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[200px] md:self-start">
            <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
              Constellation
            </div>
            <div className="mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              [ HOW IT CONNECTS ]
            </div>

            <p className="mt-6 max-w-[230px] font-mono text-[14px] leading-relaxed text-white/70">
              A map of how the work fits together. The bright stars are projects; the small ones
              are the skills and tools behind them.
            </p>

            {/* legend */}
            <div className="mt-8 space-y-2">
              {CATEGORIES.map((c) => (
                <div key={c} className="flex items-center gap-2 font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[c], boxShadow: `0 0 6px ${CATEGORY_COLORS[c]}` }}
                  />
                  {CATEGORY_LABEL[c]}
                </div>
              ))}
            </div>

            <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              {mode === 'full' ? 'hover · drag · click a star' : 'tap a star'}
            </div>
          </div>

          {/* RIGHT COLUMN — the graph */}
          <div className="relative flex-1">
            {mode === 'full' ? (
              <Suspense fallback={<ConstellationLite onActiveProject={setActive} />}>
                <ConstellationFull onActiveProject={setActive} />
              </Suspense>
            ) : (
              <ConstellationLite onActiveProject={setActive} />
            )}

            {/* live caption of the focused project (screen-reader + mobile friendly) */}
            <div className="mt-2 min-h-[2.5rem] font-mono text-[13px] leading-relaxed text-white/70" aria-live="polite">
              {active ? (
                <span>
                  <span style={{ color: '#f2efe9' }}>{active.title}</span>
                  {active.tagline ? <span className="text-white/55"> — {active.tagline}</span> : null}
                </span>
              ) : (
                <span className="text-white/40">Explore a star to trace what it connects to.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
