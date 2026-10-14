import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';

// ── Floating dithered project preview ──
// A specimen-tag-style square that trails the cursor while hovering a row
// in the plain signal index. The dither itself runs once per image (see
// ditherPreview.ts) and is cached, so steady-state cost here is just a
// rAF-driven transform lerp — no per-frame canvas work.

const SIZE = 440;
const OFFSET = 24;

interface DitherPreviewProps {
  src: string | null;
  x: number;
  y: number;
  visible: boolean;
  /** true for keyboard focus — skip the lerp trail, position instantly */
  instant?: boolean;
  /** square side in px; the hero's project words use a larger square */
  size?: number;
  /** optional caption under the image (the hero names the project) */
  caption?: ReactNode;
}

export default function DitherPreview({ src, x, y, visible, instant = false, size = SIZE, caption }: DitherPreviewProps) {
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
    const w = el.offsetWidth || size;
    const h = el.offsetHeight || size;
    const flipX = cx + OFFSET + w > window.innerWidth;
    const flipY = cy + OFFSET + h > window.innerHeight;
    const left = flipX ? cx - OFFSET - w : cx + OFFSET;
    const top = flipY ? cy - OFFSET - h : cy + OFFSET;

    el.style.transform = `translate(${left}px, ${top}px)`;
  };

  if (!visible || !dataUrl) return null;

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 border border-primary/40"
      style={{
        width: size,
        willChange: 'transform',
        boxShadow: '0 0 0 1px hsl(var(--background) / 0.6), 0 12px 32px hsl(0 0% 0% / 0.6)',
      }}
    >
      <img src={dataUrl} alt="" width={size} height={size} className="block w-full" style={{ height: size }} draggable={false} />
      {caption && <div className="bg-background px-3 py-2">{caption}</div>}
    </div>
  );
}
