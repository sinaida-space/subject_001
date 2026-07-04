import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectById } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import DisplacementImage from '@/components/DisplacementImage';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import NotFound from '@/pages/NotFound';

const SITE_NAME = 'sin.ai.da';

// Sets document.title + the meta description tag at runtime (client-side nav).
// Vanilla DOM, no new dependency — the static <title>/<meta> in index.html
// remain the fallback for crawlers that don't execute JS.
function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const prevContent = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (meta && prevContent !== null) meta.setAttribute('content', prevContent);
    };
  }, [title, description]);
}

// ── Compact labeled card for the process strip. Placeholder content —
// Sinaida can swap these for real photos/screenshots later. Clearly marked
// as method/process, not a fabricated screenshot.
function ProcessCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      className="flex-1 min-w-[140px]"
      style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '16px' }}
    >
      <div
        className="font-mono uppercase"
        style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#CC1414' }}
      >
        {label}
      </div>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-white/55">{detail}</p>
    </div>
  );
}

export default function WorkCase() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectById(slug ?? '');
  const [heroLoaded, setHeroLoaded] = useState(false);

  const title = project ? `${project.title} — Case Study | ${SITE_NAME}` : '';
  const description = project
    ? `${project.tagline}. ${project.blurb ?? ''}`.slice(0, 300)
    : '';

  usePageMeta(title || document.title, description || '');

  if (!project) return <NotFound />;

  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto max-w-3xl px-6">
        <Link
          to="/"
          className="clinical-label mb-8 inline-block text-primary transition-colors hover:text-accent"
        >
          ← Back
        </Link>

        {/* ── Header / context ── */}
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
            Stage
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.15em] text-white/55">
            {project.tagline}
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-light text-foreground md:text-5xl">
          {project.title}
        </h1>

        {/* ── The brief ── */}
        {project.blurb && (
          <p className="mt-6 max-w-[70ch] font-mono text-[16px] leading-relaxed text-white/80">
            {project.blurb}
          </p>
        )}

        {/* ── Hero still — pointer-driven ripple on desktop, static on touch ── */}
        {project.image && (
          <div className="relative mt-10 w-full" style={{ aspectRatio: '16 / 9' }}>
            <DisplacementImage
              src={project.image}
              alt={project.title}
              onLoad={() => setHeroLoaded(true)}
              style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
              imgClassName="h-full w-full object-cover"
            />
            <HeartbeatPlaceholder loaded={heroLoaded} width="100%" height="100%" className="absolute inset-0" />
          </div>
        )}

        {/* ── 19 projections, count + format, not a fabricated per-song list ── */}
        <div
          className="mt-8 flex flex-col gap-4 sm:flex-row"
          style={{ border: '1px solid #CC1414', background: 'rgba(204,20,20,0.05)', padding: '20px' }}
        >
          <div className="font-display text-5xl leading-none text-primary">19</div>
          <div>
            <div className="font-mono text-[13px] uppercase tracking-[0.12em] text-white">
              Audio-reactive projections, one per song
            </div>
            <p className="mt-2 max-w-[55ch] font-mono text-[13px] leading-relaxed text-white/55">
              A full-set backdrop: each song in the set got its own real-time TouchDesigner system,
              built to listen to the live mix and respond in the room — no two songs share a look.
            </p>
          </div>
        </div>

        {/* ── Tech stack ── */}
        {project.tools && (
          <div className="mt-8">
            <div className="clinical-label mb-3 text-white/45">Tech stack</div>
            <div className="flex flex-wrap gap-2">
              {project.tools.map((t) => (
                <span
                  key={t}
                  style={{
                    border: '1px solid #1a1a1a',
                    padding: '4px 8px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Lazy video ── */}
        {project.video && (
          <div className="mt-10">
            <div className="clinical-label mb-3 text-white/45">Live at Sklad №3</div>
            <VideoEmbed id={project.video} title={project.title} />
          </div>
        )}

        {/* ── Process strip — labeled placeholders, not fabricated screenshots ── */}
        <div className="mt-10">
          <div className="clinical-label mb-3 text-white/45">Method</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ProcessCard
              label="Signal chain"
              detail="Live audio in → TouchDesigner CHOP analysis → per-song visual patch."
            />
            <ProcessCard
              label="TouchDesigner network"
              detail="Node graph placeholder — real screenshot to be swapped in."
            />
            <ProcessCard
              label="Rehearsal"
              detail="On-site tech + band rehearsal photo — to be swapped in."
            />
            <ProcessCard
              label="Live show"
              detail="Sklad №3, Moscow, 26 March 2026 — full-set run."
            />
          </div>
        </div>

        {/* ── Links ── */}
        {project.links && project.links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4">
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

        {/* ── What a festival can order ── */}
        <div className="mt-14" style={{ borderTop: '1px solid #1a1a1a', paddingTop: '32px' }}>
          <h2 className="font-display text-2xl font-light text-foreground">
            What a festival can order
          </h2>
          <p className="mt-4 max-w-[70ch] font-mono text-[15px] leading-relaxed text-white/80">
            This is the service behind the show: a real-time TouchDesigner system built to listen
            to your live mix and respond per song, delivered as a turnkey visual set or operated
            live on the night. Same signal chain, built for your stage, your setlist, your rider.{' '}
            <a href="/#services" className="text-accent transition-opacity hover:opacity-70">
              See services
            </a>{' '}
            or{' '}
            <a href="/#contact" className="text-accent transition-opacity hover:opacity-70">
              get in touch
            </a>{' '}
            to brief a show.
          </p>
        </div>
      </div>
    </div>
  );
}
