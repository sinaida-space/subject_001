// ── The belief, on its own screen between the hero and About ──
// Full mode (pinned): a tall track with a sticky screen; QuoteGate drives it
// with scroll (the lines blow in one by one, "feel" flashes red, then a gust
// carries the belief off).
// Lite mode: a short track with a sticky screen; as you scroll, the whole
// quote slides off to the left with a slight rise and fades while About
// rises under it. One passive scroll listener, transform and opacity only,
// nothing runs at rest. Reduced motion: one plain screen.
//
// Five lines, each its own block so the gate can hand them over one at a
// time; "feel", "seen" and "connected" are spans ("feel" lights up).

import { useEffect, useRef, useState } from 'react';

const NB = ' ';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Lite story, as shares of a screen of scroll from the track's top: the quote
// holds still for a moment, then slides off; it has gone once About is about
// half way up the screen (the track is 170svh, so the pin ends at 0.7).
const SLIDE_FROM = 0.15;
const SLIDE_TO = 1.15;

function useReducedMotion() {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return reduced;
}

export default function QuoteStage({ pinned }: { pinned: boolean }) {
  const reduced = useReducedMotion();
  const story = !pinned && !reduced;
  const trackRef = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!story) return;
    const track = trackRef.current;
    const quote = quoteRef.current;
    if (!track || !quote) return;
    // measured on mount and resize only; the scroll handler reads scrollY
    let top = 0, vh = 1, vw = 1;
    const measure = () => {
      top = track.getBoundingClientRect().top + window.scrollY;
      vh = window.innerHeight || 1;
      vw = window.innerWidth || 1;
    };
    let last = -1;
    const onScroll = () => {
      const p = clamp01(((window.scrollY - top) / vh - SLIDE_FROM) / (SLIDE_TO - SLIDE_FROM));
      const q = Math.round(p * 400) / 400;
      if (q === last) return;
      last = q;
      const e = q * q; // ease-in: it leaves slowly, then goes
      quote.style.transform = q > 0 ? `translate3d(${(-0.6 * vw * e).toFixed(1)}px, ${(-0.06 * vh * e).toFixed(1)}px, 0)` : '';
      quote.style.opacity = q > 0 ? (1 - Math.pow(q, 1.4)).toFixed(3) : '';
    };
    const onResize = () => { measure(); last = -1; onScroll(); };
    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      quote.style.transform = '';
      quote.style.opacity = '';
    };
  }, [story]);

  const trackClass = pinned ? 'relative z-10 h-[260svh]' : story ? 'relative z-10 h-[170svh]' : 'relative z-10';
  const stageClass = pinned || story ? 'sticky top-0 flex h-[100svh] items-center overflow-x-clip' : 'flex min-h-[80svh] items-center py-24';

  return (
    <section ref={trackRef} data-quote-track aria-label="Belief" className={trackClass}>
      <div data-quote-stage className={pinned ? 'sticky top-0 flex h-[100svh] items-center' : stageClass}>
        <div className="site-frame">
          <p
            ref={quoteRef}
            data-quote
            className="mx-auto m-0 w-fit max-w-full font-display uppercase font-normal text-foreground leading-[1.05] tracking-[-0.01em] text-[7.4vw] md:text-[clamp(2rem,min(3.9vw,7svh),4.5rem)]"
            style={story ? { willChange: 'transform, opacity' } : undefined}
          >
            <span data-line="0" className="block">{`I${NB}believe`}</span>
            <span data-line="1" className="block">{`that technology is${NB}only meaningful${NB}when`}</span>
            <span data-line="2" className="block">{`it${NB}helps people `}<span data-feel>feel</span>{NB}<span data-seen>seen</span>,</span>
            <span data-line="3" className="block">heard,</span>
            <span data-line="4" className="block">{`and${NB}`}<span data-connected>connected</span>.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
