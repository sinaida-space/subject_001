import { useEffect, useId, useRef, type ElementType, type ReactNode } from 'react';
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useMeltEnabled } from '@/components/melt/useMeltEnabled';

interface MeltRevealProps {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'div';
  className?: string;
}

/**
 * Inverse of MeltHeadline: a section heading scrolls in melted and condenses
 * to sharp as it approaches viewport center. Same threshold SVG filter recipe
 * (blur + hard alpha clamp) and fat currentColor stroke, scroll-scrubbed via
 * a single element's own start-of-viewport-entry-to-center progress. Fully
 * reversible — scrolling back up re-melts it. At full condense (p=1) the
 * filter/stroke are removed from the DOM entirely for perf; at rest with the
 * effect disabled it renders as plain static text.
 */
export default function MeltReveal({ children, as = 'div', className }: MeltRevealProps) {
  const meltEnabled = useMeltEnabled();
  const filterId = useId();
  const Tag = as as ElementType;

  const headingRef = useRef<HTMLElement>(null);
  const feBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const { scrollYProgress } = useScroll({
    target: headingRef,
    offset: ['start end', 'start center'],
  });

  const blur = useTransform(scrollYProgress, [0, 1], [8, 0.5], { clamp: true });

  const applyMelt = (raw: number) => {
    const p = Math.min(1, Math.max(0, raw));
    const el = headingRef.current;
    if (!el) return;
    if (p < 1) {
      el.style.filter = `url(#${filterId})`;
      el.style.webkitTextStroke = '0.08em currentColor';
      el.style.willChange = 'filter';
    } else {
      el.style.removeProperty('filter');
      el.style.removeProperty('-webkit-text-stroke');
      el.style.removeProperty('will-change');
    }
  };

  useMotionValueEvent(scrollYProgress, 'change', applyMelt);
  useMotionValueEvent(blur, 'change', (d) => {
    feBlurRef.current?.setAttribute('stdDeviation', String(d));
  });

  // Sync DOM to whatever the initial (mount-time) scroll position already
  // computes to — the 'change' event above only fires on subsequent scroll,
  // so a heading that's already mid-viewport on load needs this once.
  useEffect(() => {
    if (!meltEnabled) return;
    applyMelt(scrollYProgress.get());
    feBlurRef.current?.setAttribute('stdDeviation', String(blur.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meltEnabled]);

  if (!meltEnabled) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur ref={feBlurRef} in="SourceGraphic" stdDeviation="8" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
      <Tag ref={headingRef} className={className}>
        {children}
      </Tag>
    </>
  );
}
