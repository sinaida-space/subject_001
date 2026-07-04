import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import type { GraphNode } from '@/data/graph';
import { projectById } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import ConstellationLite from './ConstellationLite';
import PlainSignalIndex from './PlainSignalIndex';
import ProjectDetail from './ProjectDetail';

const ConstellationFull = lazy(() => import('./ConstellationFull'));

export default function Constellation() {
  const { mode } = useRenderMode();
  const [active, setActive] = useState<GraphNode['project'] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const unsub = constellationBus.subscribeFocus((id) => setOpenId(id));
    return () => unsub();
  }, []);

  const openProject = openId ? projectById(openId) : undefined;

  return (
    <section ref={sectionRef} id="work" className="relative z-10 py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* LEFT COLUMN — label + legend */}
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[220px] md:self-start">
            <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
              Body of Work
            </div>

            <p className="mt-6 max-w-[230px] font-mono text-[14px] leading-relaxed text-white/70">
              Every skill and every project, one living graph.
            </p>
          </div>

          {/* RIGHT COLUMN — the graph, always paired with its plain reading below */}
          <div className="relative flex-1">
            {mode === 'full' && (
              <Suspense fallback={<ConstellationLite onActiveProject={setActive} />}>
                <ConstellationFull onActiveProject={setActive} />
              </Suspense>
            )}

            {/* live caption of the focused project (screen-reader + mobile friendly) */}
            {mode === 'full' && active && (
              <div className="mt-2 min-h-[2.5rem] font-mono text-[13px] leading-relaxed text-white/70" aria-live="polite">
                <span style={{ color: '#f2efe9' }}>{active.title}</span>
                {active.tagline ? <span className="text-white/55"> — {active.tagline}</span> : null}
              </div>
            )}

            {/* announce the opened project to screen readers regardless of visual presentation */}
            <div className="sr-only" aria-live="polite">
              {openProject ? `Opened ${openProject.title}. ${openProject.tagline}` : ''}
            </div>

            {/* Readout: inline-docked below the canvas on desktop, full-screen modal on mobile.
               Both variants live inside ProjectDetail; the modal uses fixed positioning so this
               DOM placement only affects the desktop inline panel (docked here, within #work). */}
            {openProject && <ProjectDetail project={openProject} onClose={() => setOpenId(null)} />}

            {/* Plain-text reading always sits below the map (or is the whole thing, in lite mode) —
               map and index coexist, no manual toggle picks one over the other. */}
            <div className={mode === 'full' ? 'mt-16' : undefined}>
              <PlainSignalIndex />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
