import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PROJECTS, type Project, type ProjectKind } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import { useRenderMode } from '@/hooks/useRenderMode';
import { getDitheredPreview } from '@/lib/ditherPreview';
import DitherReveal from '@/components/DitherReveal';

// Body of Work as a horizontal strip of square cards, one per project.
// Every still is red dither; its colour shows under a hovering mouse and
// while its card holds keyboard focus. In every mode the strip pins and the
// vertical wheel or swipe carries it sideways, never a scrollbar (#175):
// the first project starts on the frame's left gutter, the next ones come in
// from the right, and the strip lets go once the last one reaches the centre.
// The row bleeds to the viewport edges.
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
// the frame's content edge: its centring margin plus its gutter (.site-frame)
const FRAME_PAD = 'calc(max(0px, 50vw - 960px) + clamp(16px, 4vw, 72px))';
// out of the frame to the viewport edges
const BLEED = { marginInline: 'calc(50% - 50vw)' } as const;
const ROW_PAD = { paddingInline: FRAME_PAD, scrollPaddingInline: FRAME_PAD } as const;

const ITEMS: Project[] = KIND_ORDER.flatMap((kind) =>
  PROJECTS.filter((p) => p.kind === kind && !p.unlisted && (!p.background || p.listed)),
);

interface ColumnProps {
  project: Project;
  onFocusColumn?: (li: HTMLLIElement) => void;
}

function Column({ project, onFocusColumn }: ColumnProps) {
  const liRef = useRef<HTMLLIElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [focused, setFocused] = useState(false);
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
          // keyboard focus only: a click must not jump the page or flood the still
          if (!e.currentTarget.matches(':focus-visible')) return;
          setFocused(true);
          if (onFocusColumn && liRef.current) onFocusColumn(liRef.current);
        }}
        onBlur={() => setFocused(false)}
        className="group block w-full text-left"
      >
        {project.image && <DitherReveal src={project.image} alt={alt} aspect={1} revealed={focused} touch={false} />}
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

// A track as tall as the strip's travel plus the strip's own height. The
// strip pins centred on screen while the track passes and scroll maps 1:1 to
// translateX; it lets go the moment the last column reaches the centre, so
// the page goes on right under it.
function PinnedStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState({ travel: 0, height: 0, top: 0 });
  const travelRef = useRef(0);

  // measured on mount and resize only: the travel until the last column's
  // centre meets the viewport centre, and the pin offset that centres the row
  const measure = useCallback(() => {
    const view = viewRef.current;
    const list = listRef.current;
    const last = list?.lastElementChild as HTMLLIElement | null;
    if (!view || !list || !last) return;
    const travel = Math.max(0, Math.round(last.offsetLeft + last.offsetWidth / 2 - window.innerWidth / 2));
    const height = view.offsetHeight;
    const top = Math.max(0, Math.round((window.innerHeight - height) / 2));
    travelRef.current = travel;
    setBox((b) => (b.travel === travel && b.height === height && b.top === top ? b : { travel, height, top }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewRef.current) ro.observe(viewRef.current);
    if (listRef.current) ro.observe(listRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  useEffect(() => {
    let raf = 0;
    let lastT = -1;
    const update = () => {
      raf = 0;
      const track = trackRef.current;
      const list = listRef.current;
      if (!track || !list) return;
      // one read, then one write: no forced layout inside the frame
      const t = Math.min(travelRef.current, Math.max(0, box.top - track.getBoundingClientRect().top));
      if (t === lastT) return;
      lastT = t;
      list.style.transform = `translate3d(${-t}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [box]);

  // keyboard focus on a column scrolls the page until that column is centred
  const centreColumn = useCallback(
    (li: HTMLLIElement) => {
      const track = trackRef.current;
      if (!track) return;
      const t = Math.min(travelRef.current, Math.max(0, li.offsetLeft + li.offsetWidth / 2 - window.innerWidth / 2));
      window.scrollTo({ top: track.getBoundingClientRect().top + window.scrollY - box.top + t });
    },
    [box.top],
  );

  return (
    <div ref={trackRef} data-work-strip style={{ ...BLEED, height: box.height ? box.travel + box.height : undefined }}>
      {/* clip, not hidden: focus can't scroll a clipped box sideways */}
      <div ref={viewRef} className="sticky" style={{ top: box.top, overflow: 'clip' }}>
        <ul ref={listRef} aria-label="Body of Work projects" className="flex w-max gap-[3vw] will-change-transform" style={ROW_PAD}>
          {ITEMS.map((p) => (
            <Column key={p.id} project={p} onFocusColumn={centreColumn} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function WorkStrip() {
  const { mode } = useRenderMode();

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

  return <PinnedStrip />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
