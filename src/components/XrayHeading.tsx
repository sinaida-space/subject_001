import { useEffect, useMemo, useRef, type ElementType, type ReactNode } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';

// ── X-ray texture ────────────────────────────────────────────
// A 240x240 tile: capillary curves that resolve into circuit traces.
// Each of the five branches is split into an "organic" bezier segment
// (thicker stroke, rounded caps) and a "circuit" right-angle segment
// (thinner stroke), joined at a shared point so the two vocabularies
// blend along one continuous line rather than sitting in separate
// zones. A faint 1px-offset white duplicate of the line set gives an
// X-ray double-exposure read. One line (the "tiling seam" branch)
// touches the left and right tile edges at the same y so the pattern
// doesn't seam obviously when repeated.
const TEXTURE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <g id="xr-lines" fill="none" color="hsl(352 87% 60%)" stroke-linecap="round">
    <path stroke="currentColor" stroke-width="1.4" d="M26 18 C 40 10, 46 34, 62 36 C 74 38, 70 54, 86 58" />
    <path stroke="currentColor" stroke-width="1" d="M86 58 L 86 84 L 122 84 L 122 60 L 150 60" />
    <path stroke="currentColor" stroke-width="1.4" d="M4 130 C 20 122, 28 146, 46 148 C 60 150, 58 168, 76 168" />
    <path stroke="currentColor" stroke-width="1" d="M76 168 L 76 196 L 112 196" />
    <path stroke="currentColor" stroke-width="1.4" d="M188 8 C 176 18, 200 30, 192 46 C 186 58, 202 60, 198 76" />
    <path stroke="currentColor" stroke-width="1" d="M198 76 L 198 100 L 168 100 L 168 124" />
    <path stroke="currentColor" stroke-width="1" d="M0 150 L 30 150" />
    <path stroke="currentColor" stroke-width="1.4" d="M30 150 C 40 150, 44 158, 54 158" />
    <path stroke="currentColor" stroke-width="1" d="M54 158 L 54 176 L 92 176 L 92 150 L 150 150" />
    <path stroke="currentColor" stroke-width="1.4" d="M150 150 C 160 150, 164 142, 174 142" />
    <path stroke="currentColor" stroke-width="1" d="M174 142 L 210 142 L 210 150 L 240 150" />
    <path stroke="currentColor" stroke-width="1.4" d="M60 210 C 74 200, 80 222, 96 220 C 108 218, 108 232, 122 232" />
    <path stroke="currentColor" stroke-width="1" d="M122 232 L 122 210 L 158 210" />
  </g>
  <use href="#xr-lines" transform="translate(1 1)" color="#ffffff" opacity="0.08" />
  <g fill="hsl(352 90% 72%)">
    <circle cx="86" cy="84" r="2.2" /><circle cx="122" cy="84" r="2.2" /><circle cx="150" cy="60" r="2" />
    <circle cx="76" cy="196" r="2.2" /><circle cx="112" cy="196" r="2" />
    <circle cx="198" cy="100" r="2.2" /><circle cx="168" cy="100" r="2" />
    <circle cx="54" cy="158" r="2" /><circle cx="92" cy="176" r="2.2" /><circle cx="174" cy="142" r="2" />
    <circle cx="122" cy="232" r="2.2" /><circle cx="158" cy="210" r="2" />
  </g>
  <g fill="none" stroke="hsl(352 90% 72%)" stroke-width="1">
    <circle cx="122" cy="60" r="4" /><circle cx="168" cy="124" r="4" />
  </g>
</svg>
`.trim();

const TEXTURE_URL = `url("data:image/svg+xml,${encodeURIComponent(TEXTURE_SVG)}")`;

const LENS_RADIUS_PX = 90;

interface XrayHeadingProps {
  /** Tag for the visible base text. Overlay is always a plain div (aria-hidden, decorative only). */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a section heading with a hover lens: a texture (vessel-like lines
 * resolving into circuit traces) is revealed inside the letterforms in a
 * soft circular radius that follows the pointer. At rest it is fully
 * invisible and the base text renders exactly as before.
 */
export default function XrayHeading({ as: Tag = 'div', className, children }: XrayHeadingProps) {
  const { mode } = useRenderMode();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<{ left: number; top: number } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Static per-mount capability check, matching the project's existing
  // one-time detectMode() convention (see useRenderMode.tsx) rather than a
  // live-updating media query listener.
  const pointerFine = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: fine)').matches ?? false),
    []
  );
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    []
  );

  const enabled = mode !== 'lite' && pointerFine && !reducedMotion;

  const refreshRect = () => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rectRef.current = { left: rect.left, top: rect.top };
  };

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('resize', refreshRect);
    return () => {
      window.removeEventListener('resize', refreshRect);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);

  const applyPoint = () => {
    rafRef.current = null;
    const overlay = overlayRef.current;
    const point = lastPointRef.current;
    if (!overlay || !point) return;
    overlay.style.setProperty('--xr-x', `${point.x}px`);
    overlay.style.setProperty('--xr-y', `${point.y}px`);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    const rect = rectRef.current;
    if (!rect) return;
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(applyPoint);
    }
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    refreshRect();
    overlayRef.current?.style.setProperty('--xr-r', `${LENS_RADIUS_PX}px`);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    overlayRef.current?.style.setProperty('--xr-r', '0px');
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <Tag className={className}>{children}</Tag>
      {enabled && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={`${className ?? ''} absolute inset-0`}
          style={
            {
              margin: 0,
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              backgroundImage: TEXTURE_URL,
              backgroundSize: '240px 240px',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitMaskImage:
                'radial-gradient(circle var(--xr-r) at var(--xr-x) var(--xr-y), black 55%, transparent 100%)',
              maskImage:
                'radial-gradient(circle var(--xr-r) at var(--xr-x) var(--xr-y), black 55%, transparent 100%)',
              transform: 'scale(1.06)',
              transformOrigin: 'var(--xr-x) var(--xr-y)',
              transition: '--xr-r 350ms ease-out',
              willChange: 'mask-image, transform',
              pointerEvents: 'none',
              '--xr-x': '50%',
              '--xr-y': '50%',
              '--xr-r': '0px',
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
