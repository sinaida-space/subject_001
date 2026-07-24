import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { buildGraph } from '@/data/graph';
import type { GraphNode } from '@/data/graph';
import { projectById } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import ConstellationLite from './ConstellationLite';
import PlainSignalIndex from './PlainSignalIndex';
import ProjectDetail from './ProjectDetail';
import DitherPreview from './DitherPreview';

const ConstellationFull = lazy(() => import('./ConstellationFull'));

const IS_COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
// Mirrors ConstellationFull's own mobile band-height formula (one connected
// web, not one band per project — see ConstellationFull's `layout()`) so this
// CLS estimate doesn't reserve far more space than the graph actually renders.
const MOBILE_BAND_HEIGHT = 640;
const MOBILE_RESERVED_HEIGHT = Math.max(MOBILE_BAND_HEIGHT, Math.round(buildGraph().nodes.length * 58));

export default function Constellation() {
  const { mode } = useRenderMode();
  const [active, setActive] = useState<GraphNode['project'] | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
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
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[300px] md:self-start">
            <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 32 }}>
              Body of Work
            </h2>

            <p
              className="mt-2 max-w-[460px] font-mono uppercase leading-relaxed"
              style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 16 }}
            >
              Selected works and the skills that happen to resonate.
            </p>
          </div>

          {/* RIGHT COLUMN — the graph, always paired with its plain reading below */}
          {/* CLS fix: reserve the taller of Lite/Full's own heights here, at the
              outer wrapper, so swapping the Suspense fallback (Lite) for the
              loaded ConstellationFull never shifts anything below this section.
              Purely a height-reservation wrapper — no motion/physics touched. */}
          <div
            className="relative flex-1"
            style={
              mode === 'full'
                ? { minHeight: IS_COARSE ? `${MOBILE_RESERVED_HEIGHT}px` : 'clamp(560px, 90vh, 1000px)' }
                : undefined
            }
          >
            {mode === 'full' && (
              <Suspense fallback={<ConstellationLite onActiveProject={setActive} />}>
                <ConstellationFull onActiveProject={setActive} onPointerPosition={(x, y) => setPointerPos({ x, y })} />
              </Suspense>
            )}

            {/* Dithered image preview — trails the cursor while hovering a
               project star on the graph itself, same specimen-tag treatment
               as the plain-list rows below (desktop mouse only). */}
            {mode === 'full' && !IS_COARSE && (
              <DitherPreview src={active?.image ?? null} x={pointerPos.x} y={pointerPos.y} visible={!!active?.image} />
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

            {/* Plain-text reading always sits below the map in full mode; in
               lite mode (auto-detected or manually toggled via Header/Footer)
               it's the whole section — a fully semantic, keyboard-navigable
               list with no canvas/WebGL dependency. */}
            <div className={mode === 'full' ? 'mt-16' : undefined}>
              <PlainSignalIndex />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
