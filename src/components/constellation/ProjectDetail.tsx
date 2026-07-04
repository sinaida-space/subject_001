import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectKind } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';

const KIND_LABEL: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive',
  tool: 'Tool',
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

function projectLinks(project: Project) {
  const links = [...(project.links ?? [])];
  if (project.url && !links.some((l) => l.url === project.url)) {
    links.push({ label: 'Open case', url: project.url });
  }
  return links;
}

// Shared inner content — media, kind badge, one-line context, title, blurb, tools, links.
function Readout({ project }: { project: Project }) {
  const links = projectLinks(project);
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <>
      {project.video ? (
        <VideoEmbed id={project.video} title={project.title} />
      ) : project.image ? (
        <div className="relative w-full" style={{ aspectRatio: '16 / 9', maxHeight: '46vh' }}>
          <img
            src={project.image}
            alt={project.title}
            onLoad={() => setImgLoaded(true)}
            className="max-h-[46vh] w-full object-cover"
            style={{ position: 'absolute', inset: 0, height: '100%' }}
          />
          <HeartbeatPlaceholder loaded={imgLoaded} width="100%" height="100%" className="absolute inset-0" />
        </div>
      ) : null}

      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            style={{
              border: '1px solid #CC1414',
              padding: '3px 8px',
              fontFamily: 'monospace',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#CC1414',
            }}
          >
            {KIND_LABEL[project.kind]}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.15em] text-white/55">
            {project.tagline}
          </span>
        </div>

        <h3 className="mt-3 font-display text-2xl text-foreground md:text-3xl">{project.title}</h3>

        {project.blurb && (
          <p className="mt-4 max-w-[62ch] font-mono text-[15px] leading-relaxed text-white/80">
            {project.blurb}
          </p>
        )}

        {project.tools && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.tools.map((t) => (
              <span
                key={t}
                style={{ border: '1px solid #1a1a1a', padding: '4px 8px', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-4">
            {links.map((l) => (
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
    </>
  );
}

export default function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Only lock page scroll for the mobile modal; the inline desktop panel scrolls with the page.
    if (!isDesktop) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, isDesktop]);

  // Bring the inline readout into view when it opens (or when switching projects) on desktop.
  useEffect(() => {
    if (isDesktop && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isDesktop, project.id]);

  const headerLabel = project.title.split(' — ')[0].toUpperCase();

  // ── Desktop: inline readout docked below the canvas, inside #work (no overlay) ──
  if (isDesktop) {
    return (
      <div
        ref={panelRef}
        className="relative mt-8 w-full"
        style={{ background: '#060606', border: '1px solid #CC1414', boxShadow: '0 0 40px rgba(204,20,20,0.18)' }}
        role="region"
        aria-label={`${project.title} — project readout`}
      >
        <div style={{ borderBottom: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#CC1414', letterSpacing: '2px' }}>
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: 'monospace', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}
          >
            [ CLOSE ]
          </button>
        </div>
        <Readout project={project} />
      </div>
    );
  }

  // ── Mobile: full-screen modal (small screens make an overlay reasonable) ──
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl"
        style={{ background: '#060606', border: '1px solid #CC1414', boxShadow: '0 0 60px rgba(204,20,20,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#CC1414', letterSpacing: '2px' }}>
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: 'monospace', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}
          >
            [ ESC ]
          </button>
        </div>
        <Readout project={project} />
      </div>
    </div>
  );
}
