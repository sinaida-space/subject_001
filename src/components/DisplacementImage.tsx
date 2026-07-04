import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/**
 * DisplacementImage — wraps a static <img> and adds a *pointer-driven* local
 * ripple around the cursor on desktop.
 *
 * Governing site rule: NO animation without user action. This component never
 * animates on its own. The distortion is a pure function of the current pointer
 * position; it is repositioned only inside pointermove handlers. When the
 * pointer stops moving or leaves, the filtered layer fades back to flat via a
 * single CSS-eased opacity transition (a direct consequence of the stop/leave
 * event, not an independent timer or decay loop).
 *
 * Cost note: uses an SVG feDisplacementMap filter, NOT a second WebGL context —
 * the homepage constellation already owns a canvas, so a WebGL context here
 * would be wasteful. The SVG filter achieves a comparable local-ripple look for
 * free.
 *
 * Guards:
 *  - `pointer: fine` only. On coarse/touch pointers the effect code never
 *    initializes — a plain <img> is rendered.
 *  - `prefers-reduced-motion: reduce` → plain <img>, consistent with the site's
 *    accessibility stance.
 *  - IntersectionObserver detaches pointer listeners when off-screen (matching
 *    the pattern in ConstellationFull.tsx).
 */

const CAN_DISPLACE =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: fine)').matches === true &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true;

interface DisplacementImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  onLoad?: () => void;
  /** Peak displacement in px near the cursor. Default 24. */
  strength?: number;
  /** Radius (px) of the ripple bump around the cursor. Default 90. */
  radius?: number;
}

export default function DisplacementImage({
  src,
  alt,
  className,
  style,
  imgClassName,
  imgStyle,
  onLoad,
  strength = 24,
  radius = 90,
}: DisplacementImageProps) {
  const filterId = useId().replace(/:/g, '_');
  const wrapRef = useRef<HTMLDivElement>(null);
  const bumpRef = useRef<SVGImageElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  const idleRafRef = useRef<number | null>(null);
  // Enable the filtered overlay only when the effect is actually usable AND
  // on-screen. On touch/reduced-motion this stays false forever (no init).
  const [active, setActive] = useState(false);

  // A tiny radial "bump" used as the displacement map (in2). Red/green encode
  // the displacement vector; a soft radial falloff makes the ripple fade out
  // away from the cursor. Rendered once as a data URI.
  const bumpHref = useBumpDataUri(radius);

  useEffect(() => {
    if (!CAN_DISPLACE) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let onScreen = false;

    const flat = () => {
      const overlay = overlayRef.current;
      if (overlay) overlay.style.opacity = '0';
    };

    const move = (e: PointerEvent) => {
      if (!onScreen) return;
      if (rafRef.current != null) return; // coalesce to one update per frame
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const bump = bumpRef.current;
        const overlay = overlayRef.current;
        if (bump) {
          bump.setAttribute('x', String(x - radius));
          bump.setAttribute('y', String(y - radius));
        }
        if (overlay) overlay.style.opacity = '1';

        // Return-to-flat on *stop*: if no further pointermove arrives by the
        // next frame, flatten. This is not an idle animation — it is a direct,
        // event-scoped reaction that the pointer has stopped. Between moves the
        // filter is completely static.
        if (idleRafRef.current != null) cancelAnimationFrame(idleRafRef.current);
        idleRafRef.current = requestAnimationFrame(() => {
          idleRafRef.current = requestAnimationFrame(flat);
        });
      });
    };

    const leave = () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (idleRafRef.current != null) { cancelAnimationFrame(idleRafRef.current); idleRafRef.current = null; }
      flat();
    };

    const attach = () => {
      wrap.addEventListener('pointermove', move);
      wrap.addEventListener('pointerleave', leave);
    };
    const detach = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerleave', leave);
      leave();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        if (visible === onScreen) return;
        onScreen = visible;
        if (visible) { setActive(true); attach(); }
        else detach();
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    return () => {
      io.disconnect();
      detach();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (idleRafRef.current != null) cancelAnimationFrame(idleRafRef.current);
    };
  }, [radius]);

  const objectStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...imgStyle };

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', overflow: 'hidden', ...style }} data-displacement-wrap>
      {/* Base image — always present, always visible, plain and static. */}
      <img src={src} alt={alt} onLoad={onLoad} className={imgClassName} style={objectStyle} />

      {active && (
        <>
          {/* Filtered copy stacked on top; fades in on move, out on stop/leave. */}
          <img
            ref={overlayRef}
            src={src}
            alt=""
            aria-hidden="true"
            className={imgClassName}
            style={{
              ...objectStyle,
              position: 'absolute',
              inset: 0,
              opacity: 0,
              transition: 'opacity 280ms ease-out',
              filter: `url(#${filterId})`,
              // Let hover/pointer events pass to the wrapper below.
              pointerEvents: 'none',
              willChange: 'filter, opacity',
            }}
          />
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feImage ref={bumpRef} href={bumpHref} x="-9999" y="-9999" width={radius * 2} height={radius * 2} result="bump" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="bump"
                scale={strength}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
        </>
      )}
    </div>
  );
}

/**
 * Builds a data-URI radial bump whose R/G channels encode a displacement vector
 * that peaks at the center and eases to the neutral 0.5 gray at the edge, so the
 * ripple is strongest under the cursor and fades to nothing outward.
 */
function useBumpDataUri(radius: number): string {
  const [href] = useState(() => {
    if (typeof document === 'undefined') return '';
    const size = radius * 2;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(size, size);
    const cx = radius;
    const cy = radius;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / radius; // 0..1+
        // Cosine falloff: 1 at center → 0 at edge, clamped.
        const falloff = dist >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * dist));
        // Point the displacement radially outward, scaled by falloff.
        const ux = dist > 0 ? dx / (dist * radius) : 0;
        const uy = dist > 0 ? dy / (dist * radius) : 0;
        const r = 0.5 + 0.5 * ux * falloff;
        const g = 0.5 + 0.5 * uy * falloff;
        const i = (y * size + x) * 4;
        img.data[i] = Math.round(r * 255);
        img.data[i + 1] = Math.round(g * 255);
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  });
  return href;
}
