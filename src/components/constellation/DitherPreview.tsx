import { useEffect, useRef, useState } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';

// ── Floating dithered project preview ──
// A specimen-tag-style square that trails the cursor while hovering a row
// in the plain signal index. The dither itself runs once per image (see
// ditherPreview.ts) and is cached, so steady-state cost here is just a
// rAF-driven transform lerp — no per-frame canvas work.

const SIZE = 220;
const OFFSET = 24;

interface DitherPreviewProps {
  src: string | null;
  x: number;
  y: number;
  visible: boolean;
  /** true for keyboard focus — skip the lerp trail, position instantly */
  instant?: boolean;
}

export default function DitherPreview({ src, x, y, visible, instant = false }: DitherPreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef({ x, y });
  const targetRef = useRef({ x, y });
  const rafRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!src) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    getDitheredPreview(src).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Track the latest target position; snap instantly on first appearance
  // (or for keyboard focus) so the square doesn't fly in from a stale spot.
  useEffect(() => {
    targetRef.current = { x, y };
    if (!initializedRef.current || instant) {
      currentRef.current = { x, y };
      initializedRef.current = true;
      applyTransform();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y, instant]);

  useEffect(() => {
    if (!visible) {
      initializedRef.current = false;
      return;
    }

    const factor = instant ? 1 : 0.2;

    const step = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.x += (tgt.x - cur.x) * factor;
      cur.y += (tgt.y - cur.y) * factor;
      applyTransform();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [visible, instant]);

  const applyTransform = () => {
    const el = elRef.current;
    if (!el) return;
    const { x: cx, y: cy } = currentRef.current;

    // Flip offset to keep the square inside the viewport.
    const flipX = cx + OFFSET + SIZE > window.innerWidth;
    const flipY = cy + OFFSET + SIZE > window.innerHeight;
    const left = flipX ? cx - OFFSET - SIZE : cx + OFFSET;
    const top = flipY ? cy - OFFSET - SIZE : cy + OFFSET;

    el.style.transform = `translate(${left}px, ${top}px)`;
  };

  if (!visible || !dataUrl) return null;

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 border border-primary/40"
      style={{
        width: SIZE,
        height: SIZE,
        willChange: 'transform',
        boxShadow: '0 0 0 1px hsl(var(--background) / 0.6), 0 12px 32px hsl(0 0% 0% / 0.6)',
      }}
    >
      <img src={dataUrl} alt="" width={SIZE} height={SIZE} className="block h-full w-full" draggable={false} />
    </div>
  );
}
