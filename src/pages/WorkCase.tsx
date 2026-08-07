import { lazy, Suspense, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectById } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import DisplacementImage from '@/components/DisplacementImage';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import SignalChain from '@/components/SignalChain';
import NotFound from '@/pages/NotFound';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRenderMode } from '@/hooks/useRenderMode';
import { usePageMeta, SITE_NAME } from '@/hooks/usePageMeta';

const ParticleField = lazy(() => import('@/components/ParticleField'));

// Turns bare https:// URLs inside a credit line into clickable links,
// displayed without the protocol/trailing slash for readability.
function linkifyCredit(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.flatMap((part, i) => {
    if (!/^https?:\/\//.test(part)) return [part];
    // strip trailing sentence punctuation caught by the greedy match
    const trailing = part.match(/[.,;:]+$/)?.[0] ?? '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return [
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline decoration-accent/40 underline-offset-2 transition-opacity hover:opacity-70"
      >
        {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </a>,
      trailing,
    ];
  });
}

// Case pages are fully data-driven from `project.caseStudy` (src/data/projects.ts).
// Projects without a caseStudy have no case page: the route 404s.
export default function WorkCase() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectById(slug ?? '');
  const cs = project?.caseStudy;
  const [heroLoaded, setHeroLoaded] = useState(false);
  const { mode } = useRenderMode();

  const title = project
    ? `${project.title}${project.subtitle ? `: ${project.subtitle}` : ''} · Case Study | ${SITE_NAME}`
    : document.title;
  const description = project
    ? `${project.tagline}. ${project.blurb ?? ''}`.slice(0, 300)
    : '';
  const canonical = project ? `https://sinaida.eu/work/${project.id}/` : undefined;

  usePageMeta({ title, description, canonical });

  if (!project || !cs) return <NotFound />;

  const intro = cs.intro ?? (project.blurb ? [project.blurb] : []);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Same starfield as the homepage, dialed way down — a subtle sense of
          continuity behind a page that's mostly here to be read. */}
      {mode === 'full' && (
        <Suspense fallback={null}>
          <ParticleField subtle />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className="container relative z-10 mx-auto max-w-6xl px-6 pt-40 pb-24 md:pt-32 lg:pt-36">
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-12">
          {/* ── Identity — back link, kind badge, title. Left column only; the
              empty spacer beside it completes row 1, so row 2 (image + text)
              starts level across both columns — that's what lines the intro
              text up with the top of the hero image instead of the title. ── */}
          <div className="md:col-span-5">
            <Link
              to="/"
              className="clinical-label mb-8 inline-block text-primary-legible transition-colors hover:text-accent"
            >
              ← Back
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <span
                style={{
                  border: '1px solid hsl(var(--sinaida-red))',
                  padding: '3px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'hsl(var(--primary-legible))',
                }}
              >
                {cs.kindLabel}
              </span>
              <span className="font-mono text-[13px] uppercase tracking-[0.15em] text-foreground/65">
                {project.tagline}
              </span>
            </div>

            <h1 className="mt-4 font-display text-4xl uppercase font-light leading-[0.95] text-foreground md:text-5xl">
              {project.title}
              {project.subtitle && (
                <span className="mt-1 block text-2xl text-foreground/60 md:text-3xl">
                  {project.subtitle}
                </span>
              )}
            </h1>
          </div>
          <div className="hidden md:block md:col-span-7" aria-hidden="true" />

          {/* ── LEFT — preview media, pinned while the right column scrolls ── */}
          {/* Outer cell is left un-sized (default grid stretch) so it spans
              the full row height, matching the right column — that height is
              exactly what gives the inner sticky div room to pin instead of
              scrolling in lockstep with it. */}
          <div className="md:col-span-5">
          <div className="md:sticky md:top-[15vh]">
            {/* ── Hero still — pointer-driven ripple on desktop, static on touch ── */}
            {project.image && (
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
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
                className="mt-6 inline-block font-mono text-[13px] uppercase tracking-[0.15em] text-foreground transition-colors hover:text-accent"
                style={{ border: '1px solid hsl(var(--sinaida-red))', padding: '12px 24px' }}
              >
                {cs.heroCta.label} ↗
              </a>
            )}

            {/* ── Tech stack ── */}
            {project.tools && (
              <div className="mt-8">
                <div className="clinical-label mb-3 text-foreground/65">Tech stack</div>
                <div className="flex flex-wrap gap-2">
                  {project.tools.map((t) => (
                    <span
                      key={t}
                      style={{
                        border: '1px solid hsl(var(--graphite))',
                        padding: '4px 8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '20px',
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
          </div>
          </div>

          {/* ── RIGHT — everything that reads, scrolls in the normal flow ── */}
          <div className="md:col-span-7">
            {/* ── The brief / narrative intro ── */}
            {intro.map((p) => (
              <p
                key={p.slice(0, 32)}
                className="mt-0 max-w-[70ch] font-mono text-[17px] leading-relaxed text-foreground/85 first:mt-0 [&:not(:first-child)]:mt-6"
              >
                {p}
              </p>
            ))}

            {/* ── Original painting the piece translates ── */}
            {cs.painting && (
              <div className="mt-10">
                <div className="clinical-label mb-3 text-foreground/65">Original painting</div>
                <img
                  src={cs.painting.image}
                  alt={cs.painting.title}
                  loading="lazy"
                  className="w-full max-w-[420px] object-cover"
                  style={{ border: '1px solid hsl(var(--graphite))' }}
                />
                <p className="mt-3 max-w-[62ch] font-mono text-[13px] italic text-foreground/70">
                  {cs.painting.title}
                </p>
                <p className="mt-1 max-w-[62ch] font-mono text-[13px] leading-relaxed text-foreground/65">
                  {cs.painting.attribution}
                </p>
              </div>
            )}

            {/* ── Big-number stat card ── */}
            {cs.stat && (
              <div
                className="mt-8 flex flex-col gap-4 sm:flex-row"
                style={{ border: '1px solid hsl(var(--sinaida-red))', background: 'hsl(var(--sinaida-red) / 0.05)', padding: '20px' }}
              >
                <div className="font-display text-5xl leading-none text-primary">{cs.stat.value}</div>
                <div>
                  {/* text-foreground, not text-white: this sits on a 5%-red
                      tint, which in lite mode is a near-white plate, and a
                      hardcoded white heading disappeared into it. The token
                      flips to near-black there and stays Chalk in dark mode. */}
                  <div className="font-mono text-[14px] uppercase tracking-[0.12em] text-foreground">
                    {cs.stat.heading}
                  </div>
                  <p className="mt-2 max-w-[55ch] font-mono text-[14px] leading-relaxed text-foreground/65">
                    {cs.stat.body}
                  </p>
                </div>
              </div>
            )}

            {/* ── Labeled media sections (lazy YouTube embeds) ── */}
            {cs.media?.map((m) => (
              <div key={m.video} className="mt-10">
                <div className="clinical-label mb-3 text-foreground/65">{m.label}</div>
                <VideoEmbed id={m.video} title={`${project.title}: ${m.label}`} />
                {m.caption && (
                  <p className="mt-2 max-w-[62ch] font-mono text-[13px] leading-relaxed text-foreground/65">
                    {m.caption}
                  </p>
                )}
              </div>
            ))}

            {/* ── Method — animated signal-chain diagram (CSS-only) ── */}
            {cs.method && (
              <div className="mt-10">
                <div className="clinical-label mb-3 text-foreground/65">Method</div>
                <SignalChain {...cs.method} />
              </div>
            )}

            {/* ── Credits ── */}
            {cs.creditsPeople ? (
              <div className="mt-10">
                <div className="clinical-label mb-3 text-foreground/65">Credits</div>
                <div className="flex flex-col gap-5">
                  {cs.creditsPeople.map((p) => (
                    <div key={p.name}>
                      <p className="font-mono text-[13px] leading-relaxed text-foreground/70">
                        <strong className="font-semibold text-foreground/85">{p.role}:</strong>{' '}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline decoration-accent/40 underline-offset-2 transition-opacity hover:opacity-70"
                        >
                          {p.name}
                        </a>
                      </p>
                      <p className="mt-1 max-w-[62ch] font-mono text-[13px] leading-relaxed text-foreground/65">
                        {p.bio}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              cs.credits && (
                <div className="mt-10">
                  <div className="clinical-label mb-3 text-foreground/65">Credits</div>
                  {cs.credits.map((c) => (
                    <p key={c} className="font-mono text-[13px] leading-relaxed text-foreground/70">
                      {linkifyCredit(c)}
                    </p>
                  ))}
                </div>
              )
            )}

            {/* ── Case links ── */}
            {cs.links && cs.links.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-4">
                {cs.links.map((l) => (
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

            {/* ── Conversion block ── */}
            <div className="mt-14" style={{ borderTop: '1px solid hsl(var(--graphite))', paddingTop: '32px' }}>
              <h2 className="font-display text-2xl uppercase font-light text-foreground">
                {cs.order.heading}
              </h2>
              <p className="mt-4 max-w-[70ch] font-mono text-[16px] leading-relaxed text-foreground/85">
                {cs.order.body}{' '}
                <a href="https://sinaida.eu/collaborate/" className="text-accent transition-opacity hover:opacity-70">
                  Get in touch
                </a>{' '}
                {cs.order.suffix}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
