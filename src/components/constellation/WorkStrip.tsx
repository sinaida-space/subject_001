import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PROJECTS, type Project, type ProjectKind } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import { useRenderMode } from '@/hooks/useRenderMode';
import { getDitheredPreview } from '@/lib/ditherPreview';
import DitherReveal from '@/components/DitherReveal';

// Body of Work as a horizontal strip of tall columns, one per project.
// Full mode on a desktop with a fine pointer: the strip pins and vertical
// scroll carries it sideways; each still develops from red dither into colour
// as its column reaches the centre. Lite, phones and coarse pointers get a
// plain swipe row with plain images.
const KIND_ORDER: ProjectKind[] = ['stage', 'installation', 'conceptual', 'game', 'tool', 'tutorial'];
const KIND_LABEL: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive web',
  tool: 'Tools',
  tutorial: 'Tutorials',
};

const NBSP = ' ';
const COL_W = 'clamp(260px, 24vw, 420px)';
const PIN_QUERY = '(min-width: 1024px) and (pointer: fine)';
// a still starts to light up when its centre is this many column widths
// right of the viewport centre, and is full colour once it reaches the centre
const LIGHT_BAND = 0.9;
const STEPS = 64; // progress resolution handed to the stills

const ITEMS: Project[] = KIND_ORDER.flatMap((kind) =>
  PROJECTS.filter((p) => p.kind === kind && !p.unlisted && (!p.background || p.listed)),
);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface ColumnProps {
  project: Project;
  progress?: number;
  onFocusColumn?: (li: HTMLLIElement) => void;
}

function Column({ project, progress, onFocusColumn }: ColumnProps) {
  const liRef = useRef<HTMLLIElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const alt = `${project.title}, project still`;

  return (
    <li ref={liRef} className="shrink-0 snap-start" style={{ width: COL_W }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          // opens the card exactly as the old index row did
          const r = btnRef.current?.getBoundingClientRect();
          constellationBus.focusWork(project.id, false, r && { left: r.left, top: r.top, width: r.width, height: r.height, el: btnRef.current ?? undefined });
        }}
        onMouseEnter={() => constellationBus.highlight(project.id)}
        onMouseLeave={() => constellationBus.highlight(null)}
        onFocus={(e) => {
          // keyboard focus only: a click must not jump the page
          if (onFocusColumn && liRef.current && e.currentTarget.matches(':focus-visible')) onFocusColumn(liRef.current);
        }}
        className="group block w-full text-left"
      >
        {project.image &&
          (progress !== undefined ? (
            <DitherReveal src={project.image} alt={alt} aspect={4 / 5} progress={progress} />
          ) : (
            <img
              src={project.image}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="block aspect-[4/5] w-full object-cover"
              style={{ border: '1px solid hsl(var(--sinaida-red) / 0.35)' }}
            />
          ))}
        <h3
          className="mt-4 font-display uppercase text-foreground transition-colors group-hover:text-accent"
          style={{ fontSize: 'clamp(20px, 1.6vw, 28px)' }}
        >
          {project.title.replace(/ /g, NBSP)}
        </h3>
        <p className="mt-1 font-mono text-[15px] text-foreground/60">
          {KIND_LABEL[project.kind]}
          {NBSP}· {project.short ?? project.tagline}
        </p>
      </button>
    </li>
  );
}

// Lite, phones, coarse pointers: a plain horizontal swipe, no pin.
function SwipeStrip() {
  return (
    <ul aria-label="Body of Work projects" className="flex snap-x snap-mandatory gap-[3vw] overflow-x-auto pb-4">
      {ITEMS.map((p) => (
        <Column key={p.id} project={p} />
      ))}
    </ul>
  );
}

// Full mode desktop: a track as tall as the strip's overflow plus one screen;
// while it passes, the strip is pinned and scroll maps 1:1 to translateX.
function PinnedStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState(0);
  const [progress, setProgress] = useState<number[]>(() => ITEMS.map(() => 0));
  const overflowRef = useRef(0);

  // distance the strip travels: until the last column's centre meets the
  // viewport centre, so every still gets its turn in colour
  const measure = useCallback(() => {
    const view = viewRef.current;
    const list = listRef.current;
    const last = list?.lastElementChild as HTMLLIElement | null;
    if (!view || !list || !last) return;
    const left = view.getBoundingClientRect().left;
    const o = Math.max(0, Math.round(left + last.offsetLeft + last.offsetWidth / 2 - window.innerWidth / 2));
    overflowRef.current = o;
    setOverflow(o);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewRef.current) ro.observe(viewRef.current);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = trackRef.current;
      const list = listRef.current;
      if (!track || !list) return;
      const t = Math.min(overflowRef.current, Math.max(0, -track.getBoundingClientRect().top));
      list.style.transform = `translate3d(${-t}px, 0, 0)`;
      const left = list.getBoundingClientRect().left;
      const vc = window.innerWidth / 2;
      const next = Array.from(list.children as HTMLCollectionOf<HTMLLIElement>).map((li) => {
        const cx = left + li.offsetLeft + li.offsetWidth / 2;
        const p = clamp01(1 - (cx - vc) / (li.offsetWidth * LIGHT_BAND));
        return Math.round(p * STEPS) / STEPS;
      });
      setProgress((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [overflow]);

  // keyboard focus on a column scrolls the page until that column is centred
  const centreColumn = useCallback((li: HTMLLIElement) => {
    const track = trackRef.current;
    const view = viewRef.current;
    if (!track || !view) return;
    const left = view.getBoundingClientRect().left;
    const t = Math.min(overflowRef.current, Math.max(0, left + li.offsetLeft + li.offsetWidth / 2 - window.innerWidth / 2));
    window.scrollTo({ top: track.getBoundingClientRect().top + window.scrollY + t });
  }, []);

  return (
    <div ref={trackRef} data-work-strip style={{ height: `calc(${overflow}px + 100svh)` }}>
      {/* clip, not hidden: focus can't scroll a clipped box sideways */}
      <div ref={viewRef} className="sticky top-0 flex h-[100svh] flex-col justify-center" style={{ overflow: 'clip' }}>
        <ul ref={listRef} aria-label="Body of Work projects" className="flex w-max gap-[3vw] will-change-transform">
          {ITEMS.map((p, i) => (
            <Column key={p.id} project={p} progress={progress[i]} onFocusColumn={centreColumn} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function WorkStrip() {
  const { mode } = useRenderMode();
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(PIN_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(PIN_QUERY);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Dither the cards' video posters (960x540, as DitheredThumb asks for them)
  // one per idle slot, so opening a card never dithers on the main thread.
  // Safari has no requestIdleCallback, hence the timeout fallback.
  useEffect(() => {
    if (mode === 'lite') return;
    const jobs = PROJECTS.filter((p) => p.video).map((p) => `/video-posters/${p.video}.jpg`);
    let i = 0;
    let t = 0;
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const idle = (cb: () => void) => (ric ? ric.call(window, cb, { timeout: 2000 }) : window.setTimeout(cb, 200));
    const next = () => {
      if (i >= jobs.length) return;
      getDitheredPreview(jobs[i++], 960, 540).finally(() => {
        t = idle(next) as number;
      });
    };
    t = window.setTimeout(next, 2500); // after first paint settles
    return () => {
      i = jobs.length;
      window.clearTimeout(t);
    };
  }, [mode]);

  return mode === 'full' && wide ? <PinnedStrip /> : <SwipeStrip />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
