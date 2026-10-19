import { Fragment, lazy, Suspense, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { projectById, PROJECTS } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import DisplacementImage from '@/components/DisplacementImage';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import SignalChain from '@/components/SignalChain';
import NotFound from '@/pages/NotFound';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useMounted } from '@/lib/hydration';
import { usePageMeta, SITE_NAME } from '@/hooks/usePageMeta';
import { CaseDiveControls, ProcessFloor, RelatedWorks } from '@/components/dive/CaseDive';
import { markHomeReturn } from '@/lib/homeScroll';
import { withProjectNames } from '@/lib/projectNames';
import { DitherHeading, DrawnRule } from '@/components/PageParts';
import WorkFacts from '@/components/WorkFacts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const INLINE_LINK_CLASS =
  'text-primary-legible underline decoration-primary-legible/40 underline-offset-2 transition-opacity hover:opacity-70';

// Turns bare https:// URLs inside a credit line into clickable links,
// displayed without the protocol/trailing slash for readability.
function linkifyCredit(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.flatMap((part, i) => {
    if (!/^https?:\/\//.test(part)) return [<Fragment key={i}>{withProjectNames(part)}</Fragment>];
    // strip trailing sentence punctuation caught by the greedy match
    const trailing = part.match(/[.,;:)]+$/)?.[0] ?? '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return [
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={INLINE_LINK_CLASS}
      >
        {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </a>,
      trailing,
    ];
  });
}

// Paragraph text with inline links: `[label](/work/id)` renders as a router
// Link, `[label](https://...)` as an external link; any bare URL left over
// still goes through linkifyCredit. The prerender strips the same syntax down
// to the label (scripts/lib/site-data.mjs, stripInlineLinks).
function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return parts.flatMap((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!m) return part ? [<Fragment key={i}>{linkifyCredit(part)}</Fragment>] : [];
    const [, label, href] = m;
    // Allowlist: site paths and http(s) only. javascript:, data:, //host fall back to plain label.
    const internal = href.startsWith('/') && !href.startsWith('//');
    if (!internal && !/^https?:\/\//i.test(href)) return [<Fragment key={i}>{label}</Fragment>];
    return internal ? (
      <Link key={i} to={href} className={INLINE_LINK_CLASS}>
        {withProjectNames(label)}
      </Link>
    ) : (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={INLINE_LINK_CLASS}>
        {label}
      </a>
    );
  });
}

// Case pages are fully data-driven from `project.caseStudy` (src/data/projects.ts).
// Projects without a caseStudy have no case page: the route 404s.
export default function WorkCase() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectById(slug ?? '');
  const cs = project?.caseStudy;
  const [heroLoaded, setHeroLoaded] = useState(false);
  // the starfield is browser-only, after the first commit (studio#16)
  const mounted = useMounted();
  const { mode } = useRenderMode();
  // DEPTH 02 (#119): the process floor lives on the same route
  const [search] = useSearchParams();
  const depth = search.get('depth') === '2' ? 2 : 1;

  const title = project
    ? `${project.title}${project.subtitle ? `: ${project.subtitle}` : ''} · Case Study | ${SITE_NAME}`
    : document.title;
  const description = project
    ? `${project.tagline}. ${project.blurb ?? ''}`.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').slice(0, 300)
    : '';
  const canonical = project ? `https://sinaida.eu/work/${project.id}/` : undefined;

  usePageMeta({ title, description, canonical });

  if (!project || !cs) return <NotFound />;

  const intro = cs.intro ?? (project.blurb ? [project.blurb] : []);

  // Case pages form a loop, in PROJECTS order, so a reader who reaches the
  // end of one case always has somewhere to go besides back.
  const cases = PROJECTS.filter((p) => p.caseStudy);
  const at = cases.findIndex((p) => p.id === project.id);
  const prev = cases[(at - 1 + cases.length) % cases.length];
  const next = cases[(at + 1) % cases.length];

  return (
    <div className="relative min-h-screen bg-background">
      {/* Same starfield as the homepage, dialed way down — a subtle sense of
          continuity behind a page that's mostly here to be read. */}
      {mode === 'full' && mounted && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className="container relative z-10 mx-auto max-w-6xl px-6 pt-40 pb-24 md:pt-32 lg:pt-36">
        {depth === 2 ? (
          <ProcessFloor project={project} full={mode === 'full'} />
        ) : (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-12">
          {/* ── Identity — back link, kind badge, title. Left column only; the
              empty spacer beside it completes row 1, so row 2 (image + text)
              starts level across both columns — that's what lines the intro
              text up with the top of the hero image instead of the title. ── */}
          <div className="md:col-span-5">
            <Link
              to="/"
              onClick={markHomeReturn}
              className="clinical-label mb-8 inline-block text-primary-legible transition-colors hover:text-accent"
            >
              ← Back
            </Link>

            {/* Home's heading law: a red kicker over a solid white headline */}
            <div className="clinical-label text-primary-legible">{cs.kindLabel}</div>

            <h1 className="mt-3 font-display text-5xl uppercase font-light leading-[0.95] text-foreground md:text-6xl md:leading-[1.05]">
              {project.title}
              {project.subtitle && (
                <span className="mt-1 block text-2xl text-foreground/60 md:text-3xl">
                  {project.subtitle}
                </span>
              )}
            </h1>
            <p className="mt-5 max-w-[40ch] font-mono text-[19px] leading-[1.3] text-foreground/70">
              {project.tagline}
            </p>
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
                  srcSet={project.imageSrcSet}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  width={1600}
                  height={900}
                  priority
                  alt={project.title}
                  onLoad={() => setHeroLoaded(true)}
                  style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
                  imgClassName="h-full w-full object-cover"
                />
                <HeartbeatPlaceholder loaded={heroLoaded} width="100%" height="100%" className="absolute inset-0" />
              </div>
            )}

            {/* ── Dive one floor down, or sideways along a thread (#119) ── */}
            <CaseDiveControls project={project} />

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

            {/* ── Facts — a ruled table, label and fact at one size (as About) ── */}
            <WorkFacts project={project} withMade />
          </div>
          </div>

          {/* ── RIGHT — everything that reads, scrolls in the normal flow ── */}
          <div className="md:col-span-7">
            {/* ── The brief / narrative intro ── */}
            {intro.map((p) => (
              <p
                key={p.slice(0, 32)}
                className="mt-0 max-w-[70ch] font-mono text-[17px] leading-relaxed text-foreground/85 first:mt-0 not-first:mt-6"
              >
                {renderInline(p)}
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

            {/* ── Big number between hairlines; the number is the one red ── */}
            {cs.stat && (
              <div className="relative mt-10 flex flex-col gap-4 py-6 sm:flex-row sm:items-baseline sm:gap-8">
                <DrawnRule className="top-0" />
                <div className="font-display text-6xl leading-none text-primary">{cs.stat.value}</div>
                <div>
                  <div className="font-mono text-[17px] uppercase tracking-[0.12em] text-foreground">
                    {cs.stat.heading}
                  </div>
                  <p className="mt-2 max-w-[55ch] font-mono text-[17px] leading-relaxed text-foreground/65">
                    {cs.stat.body}
                  </p>
                </div>
                <DrawnRule className="bottom-0" />
              </div>
            )}

            {/* ── Headed story sections — long cases stay scannable ── */}
            {cs.sections?.map((s) => (
              <section key={s.heading} className="mt-10">
                <h2 className="clinical-label mb-3 text-primary-legible">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 32)}
                    className="max-w-[70ch] font-mono text-[17px] leading-relaxed text-foreground/85 not-first-of-type:mt-6"
                  >
                    {renderInline(p)}
                  </p>
                ))}
              </section>
            ))}

            {/* ── Labeled media sections (lazy YouTube embeds) ── */}
            {cs.media?.map((m) => (
              <div key={m.video} className="mt-10">
                <div className="clinical-label mb-3 text-foreground/65">{m.label}</div>
                <VideoEmbed id={m.video} title={`${project.title}: ${m.label}`} />
                {m.date && (
                  <div className="clinical-label mt-2 text-foreground/65">{m.date}</div>
                )}
                {m.caption && (
                  <p className="mt-2 max-w-[62ch] font-mono text-[13px] leading-relaxed text-foreground/65">
                    {withProjectNames(m.caption)}
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

            {/* ── Testimonial (review) — a collaborator's words, verbatim.
                 Visible label is poetic; class, data attribute, aria-label
                 and the JSON-LD Review node say plainly what it is. ── */}
            {cs.testimonial && (
              <figure
                className="testimonial mt-10"
                data-content-type="testimonial"
                aria-label={`Testimonial from ${cs.testimonial.name}`}
              >
                <div className="clinical-label mb-3 text-foreground/65">A word from the other side</div>
                <blockquote className="max-w-[62ch] border-l-2 border-primary/40 pl-4 font-mono text-[14px] italic leading-[1.85] text-foreground/82">
                  {cs.testimonial.paragraphs.map((q) => (
                    <p key={q.slice(0, 32)} className="not-first:mt-4">
                      {withProjectNames(q)}
                    </p>
                  ))}
                </blockquote>
                <figcaption className="mt-3 font-mono text-[13px] text-foreground/65">
                  {cs.testimonial.name}, {cs.testimonial.role}
                </figcaption>
              </figure>
            )}

            {/* ── Visitor quotes — short lines from visitors, translated, with their source ── */}
            {cs.visitorQuotes && (
              <figure className="mt-10" data-content-type="visitor-quotes" aria-label="Visitor quotes">
                <div className="clinical-label mb-3 text-foreground/65">Visitors</div>
                <ul className="flex max-w-[62ch] flex-col gap-3 border-l-2 border-primary/40 pl-4">
                  {cs.visitorQuotes.quotes.map((v) => (
                    <li key={v.name} className="font-mono text-[14px] leading-[1.85] text-foreground/82">
                      <span className="italic">“{v.text}”</span>{' '}
                      <span className="text-foreground/65">{v.name}</span>
                    </li>
                  ))}
                </ul>
                <figcaption className="mt-3 font-mono text-[13px] text-foreground/65">
                  Translated from Russian, from{' '}
                  <a
                    href={cs.visitorQuotes.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-legible underline decoration-primary-legible/40 underline-offset-2 transition-opacity hover:opacity-70"
                  >
                    {cs.visitorQuotes.source.label}
                  </a>
                </figcaption>
              </figure>
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
                          className="text-primary-legible underline decoration-primary-legible/40 underline-offset-2 transition-opacity hover:opacity-70"
                        >
                          {p.name}
                        </a>
                      </p>
                      <p className="mt-1 max-w-[62ch] font-mono text-[13px] leading-relaxed text-foreground/65">
                        {p.bioLink && p.bio.includes(p.bioLink.text) ? (
                          <>
                            {withProjectNames(p.bio.slice(0, p.bio.indexOf(p.bioLink.text)))}
                            <a
                              href={p.bioLink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-legible underline decoration-primary-legible/40 underline-offset-2 transition-opacity hover:opacity-70"
                            >
                              {p.bioLink.text}
                            </a>
                            {withProjectNames(p.bio.slice(p.bio.indexOf(p.bioLink.text) + p.bioLink.text.length))}
                          </>
                        ) : (
                          withProjectNames(p.bio)
                        )}
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
                      {renderInline(c)}
                    </p>
                  ))}
                </div>
              )
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
                    className="font-mono text-[12px] uppercase tracking-[0.12em] text-primary-legible transition-opacity hover:opacity-70"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}

            {/* ── Conversion block ── */}
            <div className="mt-14" style={{ borderTop: '1px solid hsl(var(--graphite))', paddingTop: '32px' }}>
              <DitherHeading className="font-display text-4xl uppercase font-light leading-[0.95] text-foreground md:text-5xl md:leading-[1.1]">
                {cs.order.heading}
              </DitherHeading>
              <p className="mt-6 max-w-[60ch] font-mono text-[19px] leading-relaxed text-foreground/85">
                {withProjectNames(cs.order.body)}{' '}
                <a href="https://sinaida.eu/collaborate/" className="text-primary-legible underline decoration-primary-legible/40 underline-offset-2 transition-opacity hover:opacity-70">
                  Get in touch
                </a>{' '}
                {cs.order.suffix}
              </p>
            </div>

            <RelatedWorks project={project} />

            {/* ── Case loop ── */}
            {cases.length > 1 && (
              <nav aria-label="More case studies" className="mt-14 flex flex-wrap justify-between gap-6" style={{ borderTop: '1px solid hsl(var(--graphite))', paddingTop: '24px' }}>
                <Link to={`/work/${prev.id}`} className="clinical-label text-primary-legible transition-colors hover:text-accent">
                  ← {prev.title}
                </Link>
                <Link to={`/work/${next.id}`} className="clinical-label text-primary-legible transition-colors hover:text-accent">
                  {next.title} →
                </Link>
              </nav>
            )}
          </div>
        </div>
        )}
      </main>
      <ContactChannel question="Still here? I like that." />
      <Footer />
    </div>
  );
}
