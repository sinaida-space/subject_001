import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { Project, ProjectKind } from '@/data/projects';
import type { FocusOrigin } from '@/lib/constellationBus';
import { createCardBuild } from './cardBuild';
import type { Dialect } from '@/lib/diveBus';
import VideoEmbed from '@/components/VideoEmbed';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import DisplacementImage from '@/components/DisplacementImage';

const KIND_LABEL: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive',
  tool: 'Tool',
  tutorial: 'Tutorial',
};

// Internal case-study pages, keyed by project id — every project with a
// `caseStudy` block in projects.ts gets a `/work/<id>` page.
const CASE_PAGES: Record<string, string> = {
  'redkie-ptitsy': '/work/redkie-ptitsy',
  'the-eyes-chico': '/work/the-eyes-chico',
  'aether-currents': '/work/aether-currents',
  'conspace-rooms': '/work/conspace-rooms',
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
            aria-label={`${project.title}: full text`}
          >
            <div style={{ position: 'relative', zIndex: 30, background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--primary-legible))', letterSpacing: '2px' }}>
                FULL TEXT
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEssayOpen(false)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px' }}
              >
                <span aria-hidden="true">[X]</span>
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
// Opening from an index row: the row's two rules light up, then part like
// a stage door to the card's top and bottom edges, and the card is revealed
// between them. Closing plays it backwards into the row.
const THROW_MS = 1150; // the whole projection and the build-up, open or close
// eased 0..1 inside [a, b] of the timeline
const seg = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Cards opened from the list build up in a random look each time, never the
// same one twice in a row: CRT lock, dither develop, raster dither. Same
// code paths as the per-work dialects, so the variety costs nothing extra.
const BUILDS: Dialect[] = ['crt', 'dither', 'ascii'];
let lastBuild: Dialect | null = null;
const pickBuild = (): Dialect => {
  const pool = BUILDS.filter((d) => d !== lastBuild);
  lastBuild = pool[Math.floor(Math.random() * pool.length)];
  return lastBuild;
};
type Pt = [number, number];
// convex hull (monotone chain): the throw is the hull of lens and screen
const hull = (pts: Pt[]): Pt[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const h: Pt[] = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half([...p].reverse())];
};

export default function ProjectDetail({
  project,
  onClose: close,
  origin,
}: {
  project: Project;
  onClose: () => void;
  origin?: FocusOrigin;
}) {
  const shutter = !!origin;
  const [mounted, setMounted] = useState(shutter);
  const cardRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<SVGPolygonElement>(null);
  const edgesRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const buildRef = useRef<HTMLCanvasElement>(null);
  // chosen once per card, so closing plays the same look backwards
  const [buildLook] = useState<Dialect>(pickBuild); // lazy: picked once, not on every render
  const closing = useRef(false);

  // Projection screen: the row is the projector. Its title lifts off the
  // list and flies up to become the card's title; its two rules extrude
  // into a lit throw of light whose far end travels out to the card; the
  // card lands at the end of the throw as a screen tilting flat while its
  // exposure comes up. One clock drives every layer, so closing is the
  // same frames played backwards.
  const run = useCallback(
    (dir: 'open' | 'close') =>
      new Promise<void>((resolve) => {
        const card = cardRef.current;
        const backdrop = card?.parentElement;
        const beam = beamRef.current;
        const edges = edgesRef.current;
        const svg = svgRef.current;
        const title = titleRef.current;
        const label = labelRef.current;
        if (!origin || !card || !backdrop || !beam || !edges || !svg || !title || !label) return resolve();

        const live = origin.el?.isConnected ? origin.el.getBoundingClientRect() : null;
        const o = live ? { left: live.left, top: live.top, width: live.width, height: live.height } : origin;
        // per-frame styles must not be smeared by the card's CSS transition
        card.style.transition = 'none';
        backdrop.style.transition = 'none';
        // measure the card flat, before any transform of ours touches it
        card.style.transform = 'none';
        const c = card.getBoundingClientRect();
        const lr = label.getBoundingClientRect();
        const rowTitle = origin.el?.querySelector('[data-row-title]');
        const tr = rowTitle?.getBoundingClientRect() ?? new DOMRect(o.left + 40, o.top + 12, 200, 24);
        if (rowTitle) {
          title.textContent = rowTitle.textContent;
          const cs = getComputedStyle(rowTitle);
          title.style.font = cs.font;
          title.style.letterSpacing = cs.letterSpacing;
          title.style.textTransform = cs.textTransform;
        }
        const titleScale = lr.height / Math.max(tr.height, 1);
        // the contents come up in the work's own dialect once the screen lands
        const buildCanvas = buildRef.current;
        // after an open the cover is hidden; it must be laid out again to be measured
        if (buildCanvas) buildCanvas.style.display = '';
        const cs0 = getComputedStyle(card);
        const build = buildCanvas
          ? createCardBuild(buildCanvas, buildLook, cs0.backgroundColor, cs0.getPropertyValue('--sinaida-red') ? `hsl(${cs0.getPropertyValue('--sinaida-red').trim()})` : '#ff0a0a')
          : null;
        // the row itself is the lens: its two rules are the near edge of the throw
        const lens = { l: o.left, r: o.left + o.width, t: o.top, b: o.top + o.height };

        const frame = (p: number) => {
          // rules ignite (0-.2), throw travels (.12-.7), screen lands (.42-.92)
          const ignite = seg(p, 0, 0.2);
          const throwT = easeOut(seg(p, 0.1, 0.6));
          const land = seg(p, 0.36, 0.7); // solid before the build-up gets going
          const fly = seg(p, 0.08, 0.66);
          const fadeBeam = 1 - seg(p, 0.55, 0.82);

          backdrop.style.opacity = String(seg(p, 0.05, 0.6));

          // the throw: the row's arrow is the lens; the screen flies out of it
          // to the card, and the light is the hull between the two
          const fl = mix(lens.l, c.left, throwT), fr = mix(lens.r, c.right, throwT);
          const ft = mix(lens.t, c.top, throwT), fb = mix(lens.b, c.bottom, throwT);
          const lensPts: Pt[] = [[lens.l, lens.t], [lens.r, lens.t], [lens.r, lens.b], [lens.l, lens.b]];
          const far: Pt[] = [[fl, ft], [fr, ft], [fr, fb], [fl, fb]];
          beam.setAttribute('points', hull([...lensPts, ...far]).map((q) => q.join(',')).join(' '));
          // the rules, the four rails extruding from the row's corners, the screen's frame
          edges.setAttribute(
            'd',
            `M${lens.l},${lens.t}H${lens.r} M${lens.l},${lens.b}H${lens.r} ` +
              lensPts.map(([x, y], i) => `M${x},${y}L${far[i][0]},${far[i][1]}`).join(' ') +
              ` M${fl},${ft}H${fr}V${fb}H${fl}Z`,
          );
          svg.style.opacity = String(ignite * fadeBeam);
          beam.style.opacity = String(0.55 * seg(p, 0.1, 0.35));

          // the screen: tilted back and dim at the end of the throw, settling flat and lit
          card.style.opacity = String(land);
          card.style.transform = `perspective(1400px) translateZ(${mix(-140, 0, land)}px) rotateX(${mix(14, 0, land)}deg)`;
          const q = seg(p, 0.5, 1);
          const sp = build ? build.split(q) : 0;
          const fx = [
            land < 1 ? `brightness(${mix(0.25, 1, land)})` : '',
            sp > 0.05 ? `drop-shadow(${sp}px 0 0 rgba(255,10,10,0.55)) drop-shadow(${-sp}px 0 0 rgba(0,220,255,0.35))` : '',
          ].join(' ').trim();
          card.style.filter = fx;
          if (build && buildCanvas) {
            build.draw(q);
            buildCanvas.style.display = q >= 1 ? 'none' : '';
          }

          // the title lifts off the row and becomes the card's titlebar label
          const lift = Math.sin(Math.PI * fly) * 18;
          title.style.opacity = String(1 - seg(p, 0.62, 0.72)); // sits exactly on the row title at p = 0
          title.style.transform = `translate(${mix(tr.left, lr.left, fly)}px, ${mix(tr.top, lr.top, fly) - lift}px) scale(${mix(1, titleScale, fly)})`;
          title.style.color = fly > 0.5 ? 'hsl(var(--primary-legible))' : '';
          label.style.opacity = String(seg(p, 0.64, 0.74));
          if (rowTitle instanceof HTMLElement) rowTitle.style.opacity = p > 0 ? '0' : '';
        };

        const t0 = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - t0) / THROW_MS);
          frame(dir === 'open' ? k : 1 - k);
          if (k < 1) requestAnimationFrame(tick);
          else {
            if (dir === 'open') {
              card.style.transform = '';
              card.style.filter = '';
            } else if (rowTitle instanceof HTMLElement) {
              rowTitle.style.opacity = '';
            }
            resolve();
          }
        };
        frame(dir === 'open' ? 0 : 1);
        requestAnimationFrame(tick);
      }),
    [origin, buildLook],
  );

  // play the door before the first paint so the card never flashes whole
  useLayoutEffect(() => {
    if (shutter) run('open');
  }, [shutter, run]);

  const onClose = useCallback(() => {
    if (!shutter) return close();
    if (closing.current) return;
    closing.current = true;
    run('close').then(close);
  }, [shutter, run, close]);

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

  // Titles carry non-breaking spaces so they never split in the body; the
  // titlebar has to be free to wrap by word next to the close button.
  const headerLabel = project.title.toUpperCase().replace(/\u00a0/g, ' ');
  // Long titles read as two balanced lines on phones (SUBMERGED / REALITIES):
  // break at the space nearest the middle. From md up the line stays whole.
  const splitAt = (() => {
    if (headerLabel.length <= 16) return -1;
    let best = -1;
    for (let i = 0; i < headerLabel.length; i++) {
      if (headerLabel[i] === ' ' && (best < 0 || Math.abs(i - headerLabel.length / 2) < Math.abs(best - headerLabel.length / 2))) best = i;
    }
    return best;
  })();

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
      {shutter && (
        <>
          <svg ref={svgRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[71] h-full w-full" style={{ opacity: 0 }}>
            <defs>
              <filter id="throw-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polygon ref={beamRef} fill="hsl(var(--sinaida-red) / 0.14)" />
            <path ref={edgesRef} fill="none" stroke="hsl(var(--sinaida-red))" strokeWidth="1" filter="url(#throw-glow)" />
          </svg>
          <div
            ref={titleRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[72] whitespace-nowrap text-foreground"
            style={{ transformOrigin: '0 0', opacity: 0 }}
          />
        </>
      )}
      <div
        ref={cardRef}
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
        aria-label={`${project.title}: project readout`}
      >
        {shutter && <canvas ref={buildRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-full w-full" />}
        <div style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span ref={labelRef} style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', lineHeight: 1.15, minWidth: 0, color: 'hsl(var(--primary-legible))', letterSpacing: '2px' }}>
            {splitAt < 0 ? headerLabel : (
              <>
                {headerLabel.slice(0, splitAt)}
                <br className="md:hidden" />
                <span className="hidden md:inline"> </span>
                {headerLabel.slice(splitAt + 1)}
              </>
            )}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px' }}
          >
            <span aria-hidden="true">[X]</span>
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
