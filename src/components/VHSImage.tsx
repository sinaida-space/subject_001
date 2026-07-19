import { useEffect, useMemo, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';

interface VHSImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export default function VHSImage({ src, alt, className = '', aspectRatio = '16/10' }: VHSImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const { mode } = useRenderMode();

  // Issue #19 — interaction glitch (slice displacement + chroma split).
  // Static per-mount check, matching the project's existing one-time
  // detectMode()/XrayHeading convention rather than a live media listener.
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    []
  );
  const darkGlitchEnabled = mode !== 'lite' && !reducedMotion;

  const [touchActive, setTouchActive] = useState(false);
  const touchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current != null) window.clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  const handleTouchStart = () => {
    if (!darkGlitchEnabled) return;
    setTouchActive(true);
    if (touchTimeoutRef.current != null) window.clearTimeout(touchTimeoutRef.current);
    touchTimeoutRef.current = window.setTimeout(() => setTouchActive(false), 420);
  };

  const handleMouseEnter = () => {
    const img = imgRef.current;
    if (!img) return;
    img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85) hue-rotate(15deg) contrast(1.2)';
    setTimeout(() => {
      if (img) img.style.transform = 'translateX(-2px)';
    }, 120);
    setTimeout(() => {
      if (img) {
        img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85)';
        img.style.transform = 'translateX(0)';
      }
    }, 200);
  };

  return (
    <div
      className={`vhs-project-frame relative overflow-hidden ${className} ${darkGlitchEnabled ? 'vhs-image-fx' : ''} ${touchActive ? 'vhs-image-touch-active' : ''}`}
      style={{
        border: '1px solid rgba(250,0,0,0.4)',
        boxShadow: '0 0 0 1px hsl(var(--accent) / 0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        aspectRatio,
      }}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
    >
      {/* Corner brackets — top-right cyan, bottom-left red */}
      <div
        className="absolute top-[-1px] right-[-1px] w-[18px] h-[18px] pointer-events-none z-[2]"
        style={{ borderTop: '2px solid hsl(var(--accent))', borderRight: '2px solid hsl(var(--accent))' }}
      />
      <div
        className="absolute bottom-[-1px] left-[-1px] w-[18px] h-[18px] pointer-events-none z-[2]"
        style={{ borderBottom: '2px solid #fa0000', borderLeft: '2px solid #fa0000' }}
      />

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-200"
        style={{ filter: 'contrast(1.08) brightness(0.92) saturate(0.85)' }}
      />

      {/* Interaction glitch (issue #19) — dark mode + motion-allowed only.
          Four clipped slice duplicates of the image, displaced a few px in
          stepped frames, plus two chroma layers faking an RGB channel
          split. Rendered only when the effect can ever fire, so light mode
          carries zero trace. */}
      {darkGlitchEnabled && (
        <>
          <div className="vhs-glitch-slice" style={{ backgroundImage: `url(${src})` }} />
          <div className="vhs-glitch-slice" style={{ backgroundImage: `url(${src})` }} />
          <div className="vhs-glitch-slice" style={{ backgroundImage: `url(${src})` }} />
          <div className="vhs-glitch-slice" style={{ backgroundImage: `url(${src})` }} />
          <div className="vhs-chroma-red" style={{ backgroundImage: `url(${src})` }} />
          <div className="vhs-chroma-cyan" style={{ backgroundImage: `url(${src})` }} />
        </>
      )}

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        }}
      />

      {/* VHS noise bars */}
      <div className="absolute inset-0 pointer-events-none vhs-noise-bars opacity-40" />
    </div>
  );
}
