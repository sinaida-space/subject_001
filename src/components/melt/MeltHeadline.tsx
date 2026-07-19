import { useEffect, useId, useRef } from 'react';
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMeltEnabled } from '@/components/melt/useMeltEnabled';

interface MeltHeadlineProps {
  lines: string[];
  className?: string;
  /** Optional per-line className overrides, matched by index against `lines`. */
  lineClassNames?: string[];
}

const ECHOES = [1, 2, 3];

/**
 * Hero headline that melts downward as the page scrolls past it: a threshold
 * SVG filter (blur + hard alpha clamp) fused with a fat same-color text
 * stroke so glyphs bleed into each other, plus a fading/squashing echo trail
 * underneath. Fully scroll-scrubbed — no timers, no mount animation. At rest
 * (scroll 0) it renders as plain static text.
 */
export default function MeltHeadline({ lines, className, lineClassNames }: MeltHeadlineProps) {
  const meltEnabled = useMeltEnabled();
  const filterId = useId();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const feBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const echoRefs = useRef<Array<HTMLDivElement | null>>([]);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end start'],
  });

  const blur = useTransform(scrollYProgress, [0, 0.6], [0.5, 8], { clamp: true });

  useMotionValueEvent(blur, 'change', (d) => {
    feBlurRef.current?.setAttribute('stdDeviation', String(d));
  });

  useMotionValueEvent(scrollYProgress, 'change', (raw) => {
    const p = Math.min(1, Math.max(0, raw));
    const el = wrapperRef.current;
    const h1 = headlineRef.current;
    if (el) el.style.setProperty('--melt', String(p));

    if (h1) {
      if (p > 0) {
        h1.style.filter = `url(#${filterId})`;
        h1.style.webkitTextStroke = '0.08em currentColor';
        h1.style.willChange = 'filter';
      } else {
        h1.style.removeProperty('filter');
        h1.style.removeProperty('-webkit-text-stroke');
        h1.style.removeProperty('will-change');
      }
    }

    echoRefs.current.forEach((echo) => {
      if (!echo) return;
      echo.style.visibility = p > 0 ? 'visible' : 'hidden';
    });
  });

  // Ensure DOM matches the (inert) initial motion value on mount.
  useEffect(() => {
    if (!meltEnabled) return;
    const h1 = headlineRef.current;
    if (h1) {
      h1.style.removeProperty('filter');
      h1.style.removeProperty('-webkit-text-stroke');
      h1.style.removeProperty('will-change');
    }
    echoRefs.current.forEach((echo) => {
      if (echo) echo.style.visibility = 'hidden';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meltEnabled]);

  if (!meltEnabled) {
    return (
      <h1 className={className}>
        {lines.map((line, i) => (
          <span key={line} className={cn('block', lineClassNames?.[i])}>
            {line}
          </span>
        ))}
      </h1>
    );
  }

  return (
    <div ref={wrapperRef} className="relative" style={{ ['--melt' as string]: 0 }}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur ref={feBlurRef} in="SourceGraphic" stdDeviation="0.5" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <h1 ref={headlineRef} className={cn('relative', className)}>
        {lines.map((line, i) => (
          <span key={line} className={cn('block', lineClassNames?.[i])}>
            {line}
          </span>
        ))}
      </h1>

      {ECHOES.map((i) => (
        <div
          key={i}
          ref={(el) => (echoRefs.current[i - 1] = el)}
          aria-hidden="true"
          className={cn('absolute inset-x-0 top-0 pointer-events-none select-none', className)}
          style={{
            top: `${i * 0.55}em`,
            transform: `scaleY(${1 - i * 0.18})`,
            transformOrigin: 'top',
            filter: `blur(${i * 2}px)`,
            opacity: `calc(var(--melt) * ${1 - i * 0.25})`,
            visibility: 'hidden',
          }}
        >
          {lines.map((line, li) => (
            <span key={line} className={cn('block', lineClassNames?.[li])}>
              {line}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
