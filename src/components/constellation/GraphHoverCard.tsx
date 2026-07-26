import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';
import { type GraphNode } from '@/data/graph';

// ── Hover readout for the graph ──
// While a project star is hovered, this shows everything you'd want to know
// without leaving the graph: the dithered preview, the project's name, its
// one-line context, and the skills it is wired to.
//
// It's bottom-left anchored, but clamped to the graph's own bounding box
// (the "oscillation zone" the stars float in) rather than the raw viewport —
// otherwise a short viewport, or scrolling mid-section, pushes a
// fixed-to-viewport card up into the heading above the graph or down into the
// plain-text list below it. Trailing the cursor is right for the plain list
// below (see DitherPreview), where there is nothing underneath worth
// protecting; on the graph itself every pixel is content.
//
// The graph's own container top is not by itself a safe upper bound: the
// heading sits in a sticky left column that starts at the exact same row as
// the graph, so a tall card clamped to "the graph's top" still lands flush
// against the heading text. `avoidRef` (the heading block) supplies the real
// upper bound — the card stays below its bottom edge, not the graph's.
//
// The left edge is measured from the section's own container rather than
// hardcoded to the viewport edge, so the card sits on the page grid instead of
// floating loose in the corner.

const CARD_W = 300;
const GUTTER = 24;

interface Props {
  project: GraphNode['project'] | null;
  boundsRef: RefObject<HTMLElement>;
  avoidRef: RefObject<HTMLElement>;
}

export default function GraphHoverCard({ project, boundsRef, avoidRef }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(GUTTER);
  const [top, setTop] = useState<number | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      // The section's container, not the probe's immediate parent — the card
      // is rendered inside the graph column but must line up with the page
      // grid's left edge, which is where the heading above it starts.
      const box = probeRef.current?.closest('.container');
      if (box) setLeft(Math.max(GUTTER, box.getBoundingClientRect().left + GUTTER));

      // Clamp the card's vertical position between the heading's bottom edge
      // (never cover the heading) and the graph container's bottom
      // (never cover the plain list that follows), intersected with what's
      // actually on screen.
      const bounds = boundsRef.current?.getBoundingClientRect();
      const avoid = avoidRef.current?.getBoundingClientRect();
      const cardH = cardRef.current?.offsetHeight ?? 0;
      if (bounds) {
        const avoidBottom = avoid ? avoid.bottom : bounds.top;
        const visibleTop = Math.max(bounds.top, avoidBottom, 0);
        const visibleBottom = Math.min(bounds.bottom, window.innerHeight);
        const available = Math.max(0, visibleBottom - visibleTop - GUTTER * 2);
        // A hard cap on the card's own height so, even under an unusually
        // short viewport, it shrinks (image first, via CSS) rather than
        // breaching either bound.
        setMaxHeight(available);
        const preferredTop = visibleBottom - GUTTER - Math.min(cardH, available);
        setTop(Math.max(visibleTop + GUTTER, preferredTop));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });

    // The card's own height changes after mount — the dithered preview image
    // loads asynchronously and adds ~300px once it lands — so a resize
    // observer on the card itself is needed too, not just on the window/data
    // that triggered this effect, or the clamp is computed against a
    // pre-image height and the image then pushes the card past the bound.
    let ro: ResizeObserver | undefined;
    if (cardRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(cardRef.current);
    }

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [project, boundsRef, avoidRef]);

  useEffect(() => {
    if (!project?.image) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    getDitheredPreview(project.image).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.image]);

  // The probe always renders so the layout effect above has an element in the
  // section to measure the grid from; only the card itself is conditional.
  const probe = <span ref={probeRef} className="hidden" aria-hidden="true" />;
  if (!project) return probe;

  return (
    <>
    {probe}
    <div
      ref={cardRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-40 hidden overflow-hidden md:block"
      style={{
        left,
        // Until the first clamped measurement lands, fall back to the old
        // viewport-bottom anchor so the card isn't stuck at top:0 for a frame.
        ...(top === null ? { bottom: GUTTER } : { top }),
        width: CARD_W,
        ...(maxHeight !== null ? { maxHeight } : undefined),
        // Once the card is fixed it floats over the star field rather than
        // over the page background, so the text needs its own ground to stay
        // readable. A flat scrim, no frame: the border belongs to the image.
        background: 'hsl(var(--background) / 0.88)',
        padding: 12,
      }}
    >
      {dataUrl && (
        <img
          src={dataUrl}
          alt=""
          className="mb-4 block aspect-square w-full border object-cover"
          style={{ borderColor: 'hsl(var(--sinaida-red) / 0.45)' }}
          draggable={false}
        />
      )}

      <div
        className="font-mono uppercase leading-tight"
        style={{ fontSize: 20, letterSpacing: '0.08em', color: 'hsl(var(--primary-legible))' }}
      >
        {project.title}
      </div>

      {project.tagline && (
        <p
          className="mt-2 font-mono leading-snug"
          style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.7)' }}
        >
          {project.tagline}
        </p>
      )}

      {/* No skill list here on purpose: the graph is already drawing every
          edge leaving this star and lighting its labels. Repeating them as
          text is the same information twice. */}
    </div>
    </>
  );
}
