import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Internal case-study pages, keyed by project id — every project with a
// `caseStudy` block in projects.ts gets a `/work/<id>` page.
const CASE_PAGES: Record<string, string> = {
  'redkie-ptitsy': '/work/redkie-ptitsy',
  'the-eyes-chico': '/work/the-eyes-chico',
  'aether-currents': '/work/aether-currents',
};

function projectLinks(project: Project) {
  const links = [...(project.links ?? [])];
  if (project.url && !links.some((l) => l.url === project.url)) {
    const label = project.kind === 'game' ? 'Go to the experience' : 'Open case';
    links.push({ label, url: project.url });
  }
  return links;
}

// Shared inner content — media, kind badge, one-line context, title, blurb, tools, links.
function Readout({ project }: { project: Project }) {
  const links = projectLinks(project);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [essayOpen, setEssayOpen] = useState(false);
  const hasMedia = !!(project.video || project.image);
  return (
    <>
      {/* Two columns from md up. LEFT owns everything visual and factual
          about the piece: media, then kind badge, tagline and tool tags
          directly under it. RIGHT is pure action — title, then the links
          (case study / external) get the visual weight, since those are
          what someone opening this card actually wants to do next. The
          blurb is real but secondary, so it sits last and quiet — small,
          muted, no competing for attention with the links above it. */}
      <div className={hasMedia ? 'md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start' : ''}>
        {hasMedia && (
          <div className="flex flex-col md:border-r" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="relative flex flex-col justify-start bg-black">
              {project.video ? (
                <VideoEmbed id={project.video} title={project.title} />
              ) : (
                <div className="relative aspect-video w-full">
                  <DisplacementImage
                    src={project.image!}
                    alt={project.title}
                    onLoad={() => setImgLoaded(true)}
                    className="h-full w-full"
                    style={{ position: 'absolute', inset: 0, height: '100%' }}
                    imgClassName="h-full w-full object-cover"
                  />
                  <HeartbeatPlaceholder loaded={imgLoaded} width="100%" height="100%" className="absolute inset-0" />
                </div>
              )}
            </div>

            {/* Tags and one-line description, directly under the media. */}
            <div className="flex flex-col gap-3 p-5 md:p-8">
              <span
                className="inline-block w-fit"
                style={{
                  border: '1px solid hsl(var(--sinaida-red))',
                  padding: '2px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  lineHeight: 1.3,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'hsl(var(--primary-legible))',
                }}
              >
                {KIND_LABEL[project.kind]}
              </span>
              <p className="font-mono uppercase leading-snug tracking-[0.12em] text-foreground/55" style={{ fontSize: 16 }}>
                {project.tagline}
              </p>
              {project.tools && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.tools.map((t) => (
                    <span
                      key={t}
                      className="uppercase"
                      style={{ border: '1px solid hsl(var(--border))', padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: '16px', letterSpacing: '0.15em', color: 'hsl(var(--foreground) / 0.45)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 p-5 md:p-8">
          <h3 className="font-display text-3xl uppercase leading-[1.05] text-foreground md:text-4xl">
            {project.title}
          </h3>

          {/* The links are the point of this column — bigger, bolder, and
              first, not buried under the blurb. */}
          {(links.length > 0 || CASE_PAGES[project.id] || project.essay) && (
            <div className="flex flex-col gap-3">
              {CASE_PAGES[project.id] && (
                <Link
                  to={CASE_PAGES[project.id]}
                  className="font-mono uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
                  style={{ fontSize: 20 }}
                >
                  View full case study →
                </Link>
              )}
              {project.essay && !CASE_PAGES[project.id] && (
                <button
                  type="button"
                  onClick={() => setEssayOpen(true)}
                  className="text-left font-mono uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
                  style={{ fontSize: 20 }}
                >
                  Read the full text →
                </button>
              )}
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
                  style={{ fontSize: 20 }}
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}

          {/* Least priority in the layout: smaller, dimmer, last. */}
          {project.blurb && (
            <p className="mt-auto border-t pt-4 font-mono leading-relaxed text-foreground/50" style={{ fontSize: 14, borderColor: 'hsl(var(--border))' }}>
              {project.blurb}
            </p>
          )}
        </div>
      </div>

      {project.essay && essayOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEssayOpen(false)}
        >
          <div
            className="relative w-full max-w-xl"
            style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--sinaida-red))', boxShadow: '0 0 40px hsl(var(--sinaida-red) / 0.22)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} — full text`}
          >
            <div style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--primary-legible))', letterSpacing: '2px' }}>
                FULL TEXT
              </span>
              <button
                type="button"
                onClick={() => setEssayOpen(false)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}
              >
                [ CLOSE ]
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5 md:p-6">
              {project.essay.contentWarning && (
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                  {project.essay.contentWarning}
                </p>
              )}
              {project.essay.paragraphs.map((p, i) => (
                <p key={i} className="mb-4 font-mono text-[14px] leading-relaxed text-foreground/85 last:mb-0">
                  {p}
                </p>
              ))}
              {project.essay.credits && project.essay.credits.length > 0 && (
                <>
                  <div className="my-5 border-t border-border/60" />
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    Credits
                  </span>
                  {project.essay.credits.map((c, i) => (
                    <p key={i} className="font-mono text-[12px] leading-relaxed text-foreground/60">
                      {c}
                    </p>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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

  // Portalled to <body> — the Constellation section this opens from sets its
  // own `relative z-10` stacking context, which otherwise trapped this
  // modal's z-index inside it and let the fixed site header (z-50, but
  // outside that context) render on top of the modal's own top edge.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-4 pt-24 pb-10 transition-opacity duration-[180ms]"
      style={{ opacity: mounted ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl transition-all duration-[180ms] ease-out md:max-w-[1400px]"
        style={{
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--sinaida-red))',
          boxShadow: '0 0 40px hsl(var(--sinaida-red) / 0.22)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.97)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} — project readout`}
      >
        <div style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--primary-legible))', letterSpacing: '2px' }}>
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}
          >
            [ CLOSE ]
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">
          <Readout project={project} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
