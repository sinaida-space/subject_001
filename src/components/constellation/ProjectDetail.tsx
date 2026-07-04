import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectKind } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import DisplacementImage from '@/components/DisplacementImage';

const KIND_LABEL: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive',
  tool: 'Tool',
};

// Internal case-study pages, keyed by project id. Currently just the one
// template built in Task 6; add future `/work/<slug>` entries here.
const CASE_PAGES: Record<string, string> = {
  'redkie-ptitsy': '/work/redkie-ptitsy',
};

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
        <VideoEmbed id={project.video} title={project.title} maxHeightVh={34} />
      ) : project.image ? (
        <div className="relative w-full" style={{ aspectRatio: '16 / 9', maxHeight: '46vh' }}>
          <DisplacementImage
            src={project.image}
            alt={project.title}
            onLoad={() => setImgLoaded(true)}
            className="max-h-[46vh] w-full"
            style={{ position: 'absolute', inset: 0, height: '100%' }}
            imgClassName="max-h-[46vh] w-full object-cover"
          />
          <HeartbeatPlaceholder loaded={imgLoaded} width="100%" height="100%" className="absolute inset-0" />
        </div>
      ) : null}

      <div className="p-5 md:p-6">
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
          <span className="font-mono text-[12px] uppercase tracking-[0.15em] text-foreground/55">
            {project.tagline}
          </span>
        </div>

        <h3 className="mt-2 font-display text-2xl text-foreground md:text-3xl">{project.title}</h3>

        {project.blurb && (
          <p className="mt-3 max-w-[62ch] font-mono text-[14px] leading-snug text-foreground/80">
            {project.blurb}
          </p>
        )}

        {project.tools && (
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tools.map((t) => (
              <span
                key={t}
                style={{ border: '1px solid #1a1a1a', padding: '4px 8px', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.15em', color: 'hsl(var(--foreground) / 0.4)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {(links.length > 0 || CASE_PAGES[project.id]) && (
          <div className="mt-3 flex flex-wrap gap-4">
            {CASE_PAGES[project.id] && (
              <Link
                to={CASE_PAGES[project.id]}
                className="font-mono text-[12px] uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
              >
                View full case study →
              </Link>
            )}
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

// Opens as a small desktop-app-style window: a titlebar with a close
// control, floating over a dimmed but still-visible backdrop — not a
// full-black overlay, not a page-reflowing inline panel. Same treatment on
// every screen size. The open/close transition is a single, fast (180ms)
// fade + scale triggered directly by the click that opened it — no idle
// animation, no page scroll required to reach it.
export default function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mount closed, then flip to open on the next frame so the transition
    // actually plays instead of snapping straight to its end state.
    const raf = requestAnimationFrame(() => setMounted(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const headerLabel = project.title.split(' — ')[0].toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-4 transition-opacity duration-[180ms]"
      style={{ opacity: mounted ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl transition-all duration-[180ms] ease-out"
        style={{
          background: '#060606',
          border: '1px solid #CC1414',
          boxShadow: '0 0 40px rgba(204,20,20,0.22)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.97)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} — project readout`}
      >
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div className="max-h-[88vh] overflow-y-auto">
          <Readout project={project} />
        </div>
      </div>
    </div>
  );
}
