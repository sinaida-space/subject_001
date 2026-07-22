import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectById } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import DisplacementImage from '@/components/DisplacementImage';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import SignalChain from '@/components/SignalChain';
import NotFound from '@/pages/NotFound';
import { nbsp } from '@/lib/typo';

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

// Case pages are fully data-driven from `project.caseStudy` (src/data/projects.ts).
// Projects without a caseStudy have no case page — the route 404s.
export default function WorkCase() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectById(slug ?? '');
  const cs = project?.caseStudy;
  const [heroLoaded, setHeroLoaded] = useState(false);

  const title = project ? `${project.title} · Case Study | ${SITE_NAME}` : '';
  const description = project
    ? `${project.tagline}. ${project.blurb ?? ''}`.slice(0, 300)
    : '';

  usePageMeta(title || document.title, description || '');

  if (!project || !cs) return <NotFound />;

  const intro = cs.intro ?? (project.blurb ? [project.blurb] : []);

  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto max-w-3xl px-6">
        <Link
          to="/"
          className="clinical-label mb-8 inline-block text-primary-legible transition-colors hover:text-primary-legible/70"
        >
          ← Back
        </Link>

        {/* ── Header / context ── */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            style={{
              border: '1px solid #fa0000',
              padding: '3px 8px',
              fontFamily: "'Jersey 20', sans-serif",
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#fa0000',
            }}
          >
            {cs.kindLabel}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-foreground/55">
            {project.tagline}
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-light text-foreground md:text-5xl">
          {project.title}
        </h1>

        {/* ── The brief / narrative intro ── */}
        {intro.map((p) => (
          <p
            key={p.slice(0, 32)}
            className="mt-6 max-w-[70ch] font-mono text-base leading-relaxed text-foreground/80"
          >
            {nbsp(p)}
          </p>
        ))}

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

        {/* ── Prominent case action (e.g. enter the live web experience) ── */}
        {cs.heroCta && (
          <a
            href={cs.heroCta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.15em] text-foreground transition-colors hover:text-primary-legible"
            style={{ border: '1px solid #fa0000', padding: '12px 24px' }}
          >
            {cs.heroCta.label} ↗
          </a>
        )}

        {/* ── Big-number stat card ── */}
        {cs.stat && (
          <div
            className="mt-8 flex flex-col gap-4 sm:flex-row"
            style={{ border: '1px solid #fa0000', background: 'rgba(250,0,0,0.05)', padding: '20px' }}
          >
            <div className="font-display text-5xl leading-none text-primary">{cs.stat.value}</div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-white">
                {cs.stat.heading}
              </div>
              <p className="mt-2 max-w-[55ch] font-mono text-xs leading-relaxed text-foreground/55">
                {nbsp(cs.stat.body)}
              </p>
            </div>
          </div>
        )}

        {/* ── Tech stack ── */}
        {project.tools && (
          <div className="mt-8">
            <div className="clinical-label mb-3 text-foreground/45">Tech stack</div>
            <div className="flex flex-wrap gap-2">
              {project.tools.map((t) => (
                <span
                  key={t}
                  style={{
                    border: '1px solid #1a1a1a',
                    padding: '4px 8px',
                    fontFamily: "'Jersey 20', sans-serif",
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    color: 'hsl(var(--foreground) / 0.55)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Labeled media sections (lazy YouTube embeds) ── */}
        {cs.media?.map((m) => (
          <div key={m.video} className="mt-10">
            <div className="clinical-label mb-3 text-foreground/45">{m.label}</div>
            <VideoEmbed id={m.video} title={`${project.title} · ${m.label}`} />
            {m.caption && (
              <p className="mt-2 max-w-[62ch] font-mono text-xs leading-relaxed text-foreground/55">
                {nbsp(m.caption)}
              </p>
            )}
          </div>
        ))}

        {/* ── Method — animated signal-chain diagram (CSS-only) ── */}
        {cs.method && (
          <div className="mt-10">
            <div className="clinical-label mb-3 text-foreground/45">Method</div>
            <SignalChain {...cs.method} />
          </div>
        )}

        {/* ── Credits ── */}
        {cs.credits && (
          <div className="mt-10">
            <div className="clinical-label mb-3 text-foreground/45">Credits</div>
            {cs.credits.map((c) => (
              <p key={c} className="font-mono text-xs leading-relaxed text-foreground/60">
                {nbsp(c)}
              </p>
            ))}
          </div>
        )}

        {/* ── Case links ── */}
        {cs.links && cs.links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4">
            {cs.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        )}

        {/* ── Conversion block ── */}
        <div className="mt-14" style={{ borderTop: '1px solid #1a1a1a', paddingTop: '32px' }}>
          <h2 className="font-display text-2xl font-light text-foreground">
            {cs.order.heading}
          </h2>
          <p className="mt-4 max-w-[70ch] font-mono text-sm leading-relaxed text-foreground/80">
            {nbsp(cs.order.body)}{' '}
            <a href="https://sinaida.eu/collaborate/" className="text-accent transition-opacity hover:opacity-70">
              Get in touch
            </a>{' '}
            {nbsp(cs.order.suffix)}
          </p>
        </div>
      </div>
    </div>
  );
}
