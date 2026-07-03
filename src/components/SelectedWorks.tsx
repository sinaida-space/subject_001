import { useEffect, useRef, useState } from 'react';
import { FEATURED_WORKS, type Project } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';

// Lazy YouTube facade — a poster + play button; the heavy iframe only mounts
// after a click. Keeps LCP fast and CLS ≈ 0.
function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden border border-white/10 bg-black">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label={`Play ${title}`}
        >
          <img
            src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
            loading="lazy"
          />
          <span
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/70 bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-110"
            style={{ boxShadow: '0 0 24px rgba(255,59,82,0.4)' }}
          >
            <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-primary" />
          </span>
        </button>
      )}
    </div>
  );
}

function WorkRow({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // A star click in the constellation opens + scrolls this row.
  useEffect(() => {
    const unsub = constellationBus.subscribeFocus((id) => {
      if (id === project.id) setOpen(true);
    });
    return () => {
      unsub();
    };
  }, [project.id]);

  return (
    <div
      ref={rowRef}
      id={`work-${project.id}`}
      className="border-t border-white/10 py-6 transition-colors"
      onMouseEnter={() => constellationBus.highlight(project.id)}
      onMouseLeave={() => constellationBus.highlight(null)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-baseline gap-4 text-left"
        aria-expanded={open}
      >
        <span className="w-12 shrink-0 font-mono text-[12px] text-white/40">{project.year ?? '—'}</span>
        <span className="flex-1">
          <span className="font-display text-xl text-foreground transition-colors group-hover:text-primary md:text-2xl">
            {project.title}
          </span>
          <span className="mt-1 block font-mono text-[12px] leading-relaxed text-white/55">{project.tagline}</span>
        </span>
        <span
          className="mt-1 shrink-0 font-mono text-[18px] text-primary transition-transform"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
          aria-hidden
        >
          +
        </span>
      </button>

      {open && (
        <div className="mt-5 grid gap-6 pl-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:pl-16">
          <div>
            {project.blurb && (
              <p className="max-w-[60ch] font-mono text-[14px] leading-relaxed text-white/80">{project.blurb}</p>
            )}
            {project.tools && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tools.map((t) => (
                  <span
                    key={t}
                    className="border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50"
                  >
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
          {project.video && (
            <div className="self-start">
              <VideoEmbed id={project.video} title={project.title} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SelectedWorks() {
  return (
    <section id="work" className="relative z-10 py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[200px] md:self-start">
            <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
              Selected Works
            </div>
            <div className="mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              [ STAGE // INSTALLATION ]
            </div>
          </div>

          <div className="flex-1 border-b border-white/10">
            {FEATURED_WORKS.map((p) => (
              <WorkRow key={p.id} project={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
