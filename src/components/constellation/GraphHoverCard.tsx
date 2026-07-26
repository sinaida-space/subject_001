import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';
import { type GraphNode } from '@/data/graph';

// ── Hover readout for the graph ──
// While a project star is hovered, this shows everything you'd want to know
// without leaving the graph: the dithered preview, the project's name, its
// one-line context, and the skills it is wired to.
//
// It pins to the bottom-left of the viewport, in the empty half of the
// section, so it never covers a star, a label or an edge and it stays in the
// same place while you read the graph. Trailing the cursor is right for the
// plain list below (see DitherPreview), where there is nothing underneath
// worth protecting; on the graph itself every pixel is content.
//
// The left edge is measured from the section's own container rather than
// hardcoded to the viewport edge, so the card sits on the page grid instead of
// floating loose in the corner.

const CARD_W = 300;
const GUTTER = 24;

interface Props {
  project: GraphNode['project'] | null;
}

export default function GraphHoverCard({ project }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [left, setLeft] = useState(GUTTER);

  useLayoutEffect(() => {
    const measure = () => {
      // The section's container, not the probe's immediate parent — the card
      // is rendered inside the graph column but must line up with the page
      // grid's left edge, which is where the heading above it starts.
      const box = probeRef.current?.closest('.container');
      if (box) setLeft(Math.max(GUTTER, box.getBoundingClientRect().left + GUTTER));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [project]);

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
      aria-hidden="true"
      className="pointer-events-none fixed z-40 hidden md:block"
      style={{
        left,
        bottom: GUTTER,
        width: CARD_W,
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
