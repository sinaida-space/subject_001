import { useEffect, useRef, useSyncExternalStore } from 'react';
import ContactLinks from './ContactLinks';
import StarTitle, { LiteTitle } from './StarTitle';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CITY, cityBus, smoother, span } from '@/lib/city';

const NB = ' ';

// ── The dolly out of Contact (#179) ──
// When the footer holds the last screen, the Contact block (the question,
// LET'S TALK, the two ways in) stops under the header as it comes up, then
// sinks back into the top left while the camera backs away: the words recede
// to about half their size, the buttons only to RECEDE_LINKS so they stay
// readable and easy to hit. Real DOM throughout, clickable all the way. A pure
// function of scroll; scrolling back brings it forward again.
const RECEDE = 0.5; // the words' last scale
const RECEDE_LINKS = 0.85; // the buttons' last scale
const MIN_QUESTION_PX = 15; // the question never recedes below this size
const PIN_SOFT = 40; // px over which the block eases into its pin

function useDolly(enabled: boolean) {
  const blockRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const block = blockRef.current, question = questionRef.current, links = linksRef.current;
    if (!enabled || !block || !question || !links) return;
    for (const el of [block, question, links]) el.style.transformOrigin = 'left top';
    block.style.willChange = 'transform';
    let ty = 0;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      // where the block would be without the pin; the scale keeps its top
      const natural = block.getBoundingClientRect().top - ty;
      const pin = Math.max(96, 0.12 * vh);
      const x = (natural - pin) / PIN_SOFT;
      const y = pin + PIN_SOFT * (x > 20 ? x : Math.log1p(Math.exp(x)));
      ty = Math.max(0, y - natural);
      const r = smoother(span(cityBus.progress(), CITY.recede));
      const s = 1 - (1 - RECEDE) * r;
      const fs = parseFloat(getComputedStyle(question.firstElementChild ?? question).fontSize) || 20;
      const qEnd = Math.min(1, Math.max(RECEDE, MIN_QUESTION_PX / fs));
      // the horizon comes to rest a little under the block once it has receded
      const qH = question.offsetHeight, lH = links.offsetHeight;
      const end = pin + RECEDE * block.offsetHeight + qH * (qEnd - RECEDE) + lH * (RECEDE_LINKS - RECEDE);
      cityBus.setHorizon(Math.min(0.5, (end + 0.04 * vh) / vh));
      block.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      question.style.transform = `scale(${((1 - (1 - qEnd) * r) / s).toFixed(4)})`;
      links.style.transform = `scale(${((1 - (1 - RECEDE_LINKS) * r) / s).toFixed(4)})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      for (const el of [block, question, links]) el.style.transform = '';
      cityBus.setHorizon(null);
      block.style.willChange = '';
    };
  }, [enabled]);

  return { blockRef, questionRef, linksRef };
}

export default function ContactChannel() {
  const full = useRenderMode().mode === 'full';
  const held = useSyncExternalStore(cityBus.onHeld, cityBus.held, () => false);
  const { blockRef, questionRef, linksRef } = useDolly(full && held);
  // the caption is the question, in both modes
  const question = (
    <p className="font-mono text-foreground mt-2 max-w-[28ch] text-[20px] md:text-[clamp(22px,2.2vw,34px)]" style={{ lineHeight: 1.25 }}>
      {`Got an idea that should be seen, heard, and${NB}felt?`}
    </p>
  );
  const headline = (
    <p
      className="font-mono uppercase font-normal text-foreground mt-[7vh] mb-0 text-[16vw] md:text-[clamp(64px,11vw,176px)]"
      style={{ lineHeight: 0.9, letterSpacing: '-0.02em' }}
    >
      Let’s talk.
    </p>
  );
  // clip sideways only: the lite title runs ahead upward while it comes in
  return (
    <section id="contact" className="relative z-10 py-16 md:py-20 overflow-x-clip">
      <div className="site-frame">
        {/* h2/p (not div) — matches Services' and Body of Work's own
            eyebrow+caption markup, so all four sections' labels pick up
            the same sitewide hover glitch/bloom (index.css). */}
        {full ? (
          <>
            <StarTitle text="Contact" clear />
            {/* the block the dolly carries (#179); the question is the title's caption */}
            <div ref={blockRef}>
              <div ref={questionRef} data-ground-mask className="w-fit">{question}</div>
              <div data-ground-mask className="w-fit">{headline}</div>
              <div ref={linksRef} data-ground-mask className="mt-[6vh] w-fit">
                <ContactLinks />
              </div>
            </div>
          </>
        ) : (
          <>
            <LiteTitle text="Contact" caption={question} />
            {headline}
            {/* CTA: one bold action, plain links */}
            <div className="mt-[6vh]">
              <ContactLinks />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
