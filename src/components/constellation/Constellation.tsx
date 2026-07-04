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
              Selected skills and projects, one living graph.
            </p>
          </div>

          {/* RIGHT COLUMN — the graph, always paired with its plain reading below */}
          {/* CLS fix: reserve the taller of Lite/Full's own heights here, at the
              outer wrapper, so swapping the Suspense fallback (Lite) for the
              loaded ConstellationFull never shifts anything below this section.
              Purely a height-reservation wrapper — no motion/physics touched. */}
          <div className="relative flex-1" style={mode === 'full' ? { minHeight: 'clamp(520px, 84vh, 940px)' } : undefined}>
            {mode === 'full' && (
              <Suspense fallback={<ConstellationLite onActiveProject={setActive} />}>
                <ConstellationFull onActiveProject={setActive} />
              </Suspense>
            )}

            {/* announce the hovered/opened project to screen readers only — a
               second visible caption here duplicated the project's name and
               tagline that the map/list already show directly, so it's
               sr-only now instead of a second visible line. */}
            <div className="sr-only" aria-live="polite">
              {active ? `${active.title}${active.tagline ? `. ${active.tagline}` : ''}` : ''}
            </div>
            <div className="sr-only" aria-live="polite">
              {openProject ? `Opened ${openProject.title}. ${openProject.tagline}` : ''}
            </div>

            {/* Readout opens as a fixed-position modal window (ProjectDetail) —
               same treatment on every screen size, doesn't affect page layout. */}
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
