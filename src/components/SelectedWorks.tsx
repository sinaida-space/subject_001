import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { FEATURED_WORKS, type Project } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import { useRenderMode } from '@/hooks/useRenderMode';
import VideoEmbed from '@/components/VideoEmbed';

const WorksNebula = lazy(() => import('./works/WorksNebula'));

// Desktop scatter layout: hand-tuned so the four windows read as floating in
// space rather than a grid. { top/left in %, rotate in deg, parallax speed }.
const SCATTER = [
  { top: 2, left: 4, rotate: -2.5, speed: 70 },
  { top: 20, left: 48, rotate: 2, speed: 130 },
  { top: 48, left: 2, rotate: 1.8, speed: 95 },
  { top: 64, left: 46, rotate: -1.5, speed: 150 },
];

function thumbnail(p: Project): string | undefined {
  return p.image ?? (p.video ? `https://img.youtube.com/vi/${p.video}/hqdefault.jpg` : undefined);
}

function WorkWindow({
  project,
  layout,
  cardRef,
  onOpen,
}: {
  project: Project;
  layout: (typeof SCATTER)[number] | null;
  cardRef: (el: HTMLButtonElement | null) => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const fileName = `${project.id.replace(/-/g, '_')}.stage`;
  const thumb = thumbnail(project);

  return (
    <button
      type="button"
      ref={cardRef}
      id={`work-${project.id}`}
      onClick={onOpen}
      onMouseEnter={() => {
        setHovered(true);
        constellationBus.highlight(project.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        constellationBus.highlight(null);
      }}
      className="group block w-full max-w-[420px] text-left will-change-transform md:absolute md:max-w-[380px]"
      style={
        layout
          ? {
              top: `${layout.top}%`,
              left: `${layout.left}%`,
              transform: `rotate(${layout.rotate}deg)`,
            }
          : undefined
      }
    >
      <div
        className="overflow-hidden border bg-black/60 backdrop-blur-[2px] transition-[border-color,box-shadow,transform] duration-300"
        style={{
          borderColor: hovered ? 'rgba(255,59,82,0.6)' : 'rgba(255,255,255,0.12)',
          boxShadow: hovered ? '0 0 32px rgba(255,59,82,0.25)' : 'none',
          transform: hovered ? 'translateY(-4px) scale(1.015)' : 'none',
        }}
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full" style={{ background: hovered ? '#ff3b52' : 'rgba(255,255,255,0.15)' }} />
          </span>
          <span className="ml-1 truncate font-mono text-[10px] tracking-wide text-white/35">{fileName}</span>
        </div>

        {/* thumbnail */}
        <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
          {thumb && (
            <img
              src={thumb}
              alt={project.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: 'contrast(1.08) saturate(0.92)' }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="font-display text-lg leading-tight text-foreground md:text-xl">{project.title.split(' — ')[0]}</div>
            <div className="mt-1 font-mono text-[11px] leading-snug text-white/60">{project.tagline}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

function WorkDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md md:p-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl border border-white/15 bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 font-mono text-[13px] text-white/50 transition-colors hover:text-primary"
          aria-label="Close"
        >
          ✕ close
        </button>

        {project.video ? (
          <VideoEmbed id={project.video} title={project.title} />
        ) : project.image ? (
          <img src={project.image} alt={project.title} className="max-h-[46vh] w-full object-cover" />
        ) : null}

        <div className="p-6 md:p-8">
          <div className="font-mono text-[12px] uppercase tracking-[0.15em] text-primary">{project.tagline}</div>
          <h3 className="mt-2 font-display text-2xl text-foreground md:text-3xl">{project.title}</h3>
          {project.blurb && (
            <p className="mt-4 max-w-[62ch] font-mono text-[15px] leading-relaxed text-white/80">{project.blurb}</p>
          )}
          {project.tools && (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tools.map((t) => (
                <span key={t} className="border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                  {t}
                </span>
              ))}
            </div>
          )}
          {project.links && (
            <div className="mt-5 flex flex-wrap gap-4">
              {project.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[12px] uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelectedWorks() {
  const { mode } = useRenderMode();
  const sectionRef = useRef<HTMLElement>(null);
  const scatterRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const isDesktopRef = useRef(isDesktop);
  const [openId, setOpenId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const check = () => {
      const next = window.innerWidth >= 768;
      isDesktopRef.current = next;
      setIsDesktop(next);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scroll-driven parallax float — direct DOM writes, no re-render per frame.
  const tick = useCallback(() => {
    if (!runningRef.current || !isDesktopRef.current) {
      rafRef.current = null; // allow the observer to restart the loop later
      return;
    }
    const vh = window.innerHeight;
    cardsRef.current.forEach((el, i) => {
      if (!el) return;
      const layout = SCATTER[i];
      if (!layout) return;
      const rect = el.getBoundingClientRect();
      const centerDelta = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5..0.5 roughly
      const offset = -centerDelta * layout.speed;
      el.style.transform = `translateY(${offset}px) rotate(${layout.rotate}deg)`;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const el = scatterRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        runningRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !rafRef.current) rafRef.current = requestAnimationFrame(tick);
      },
      { threshold: 0, rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // clear any parallax transform left behind when leaving desktop layout
      cardsRef.current.forEach((c) => c?.style.removeProperty('transform'));
    };
  }, [isDesktop, tick]);

  // A star click in the constellation opens this project's detail.
  useEffect(() => {
    const unsub = constellationBus.subscribeFocus((id) => {
      setOpenId(id);
      document.getElementById(`work-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => {
      unsub();
    };
  }, []);

  const openProject = FEATURED_WORKS.find((p) => p.id === openId) ?? null;

  return (
    <section ref={sectionRef} id="work" className="relative z-10 overflow-hidden py-24">
      <div className="container relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[200px] md:self-start">
            <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
              Selected Works
            </div>
            <div className="mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              [ PORTFOLIO ]
            </div>
            <p className="mt-6 max-w-[220px] font-mono text-[14px] leading-relaxed text-white/65">
              Four systems, one practice. Open a window for the full story.
            </p>
          </div>

          <div
            ref={scatterRef}
            className="relative flex flex-1 flex-col gap-8 md:block md:min-h-[1500px]"
          >
            {mode === 'full' && isDesktop && (
              <Suspense fallback={null}>
                <WorksNebula />
              </Suspense>
            )}
            {FEATURED_WORKS.map((p, i) => (
              <WorkWindow
                key={p.id}
                project={p}
                layout={isDesktop ? SCATTER[i] : null}
                cardRef={(el) => {
                  cardsRef.current[i] = el;
                }}
                onOpen={() => setOpenId(p.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {openProject && <WorkDetail project={openProject} onClose={() => setOpenId(null)} />}
    </section>
  );
}
