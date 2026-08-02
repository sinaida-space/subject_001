import { useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useScrambleReveal } from '@/hooks/useScrambleReveal';
import { heroTunnelBus } from '@/lib/heroTunnelBus';

const NAME = 'SINAIDA KRIVCHENKO';
const ROLE = 'NEW MEDIA ARTIST';
const EYEBROW = `${NAME} | ${ROLE}`;
const LINE_A = 'VISUAL WORLDS FOR ';
const LINE_B = 'PHYSICAL SPACES';

// Asked one at a time during a sustained hover/hold — see useHeroWhisper.
const WHISPER_QUESTIONS = [
  "DIDN’T YOU COME HERE TO SEE WHO I AM?",
  'WHAT BROUGHT YOU HERE?',
  'WHAT DO YOU SEE IN THE NOISE?',
  'WHAT DO YOU FEEL NOW?',
  'WHAT WOULD MAKE TODAY FEEL WELL SPENT?',
  'WHEN DID YOU LAST LOSE TRACK OF TIME?',
  'WHAT ARE YOU QUIETLY PROUD OF?',
  "WHAT WOULD YOU DO IF YOU KNEW YOU COULDN’T FAIL?",
  'WHAT DO YOU WISH SOMEONE ASKED YOU MORE OFTEN?',
  'WHAT ARE YOU AFRAID TO WISH FOR?',
  'WHEN DID YOU LAST FEEL COMPLETELY YOURSELF?',
  'WHAT WOULD YOU DO IF NO ONE WAS WATCHING?',
  'WHAT DO YOU KEEP RETURNING TO?',
  "WHAT WOULD YOU CREATE IF TIME DIDN’T MATTER?",
];

// Surfaces a random question 2s into a sustained hover/hold, holds it for
// 3s, evaporates it, then (while still active) waits 2s and asks another —
// never repeating the immediately-previous question. Fully idle (not
// active) the moment hover/hold ends; no timers survive a mouseleave/touchend.
function useHeroWhisper(active: boolean, pool: string[]) {
  const [text, setText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const lastIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || pool.length === 0) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timeouts: number[] = [];
    const wait = (ms: number, fn: () => void) => {
      timeouts.push(window.setTimeout(() => { if (!cancelled) fn(); }, ms));
    };
    const pickNext = () => {
      if (pool.length === 1) return pool[0];
      let idx = Math.floor(Math.random() * pool.length);
      while (idx === lastIndexRef.current) idx = Math.floor(Math.random() * pool.length);
      lastIndexRef.current = idx;
      return pool[idx];
    };
    const cycle = () => {
      wait(2000, () => {
        setText(pickNext());
        setVisible(true);
        wait(3000, () => {
          setVisible(false);
          cycle();
        });
      });
    };
    cycle();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [active, pool]);

  return { text, visible };
}

// Per-letter spans so the hover effect (drift + heartbeat glow + ghost
// flash, see .hero-ltr/.hero-glow-active in index.css) can animate each
// character independently. A plain ' ' (not nbsp) so word-wrap still works.
function Letters({ text, prefix }: { text: string; prefix: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={`${prefix}-${i}`} className="hero-ltr" style={{ animationDelay: `${(i * 0.05).toFixed(2)}s` }}>
          {ch}
        </span>
      ))}
    </>
  );
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { mode } = useRenderMode();
  const lite = mode !== 'full';

  // Lite mode also covers prefers-reduced-motion, so the scramble is skipped
  // there and both lines paint solid.
  const eyebrow = useScrambleReveal(EYEBROW, { duration: 520, disabled: lite });
  const headA = useScrambleReveal(LINE_A, { delay: 260, duration: 760, disabled: lite });
  const headB = useScrambleReveal(LINE_B, { delay: 420, duration: 860, disabled: lite });

  // Scramble preserves string length/positions throughout the reveal, so
  // slicing at the fixed prefix boundary is safe even mid-animation.
  const nameDisplay = eyebrow.slice(0, NAME.length);
  const roleDisplay = eyebrow.slice(NAME.length + 3);

  // Hover-capable desktop widths only. Below 1024px matches the site's own
  // lg breakpoint (no hover UI on touch/narrow layouts anyway).
  const canHover = () =>
    !lite &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover) and (min-width: 1024px)').matches;

  // Driven by React state from the same onMouseEnter/onMouseLeave that fire
  // the starfield tunnel, not CSS :hover — the sitewide `main p:hover` /
  // `main h1:hover` glitch+bloom (index.css) is a one-shot ~1s flash that
  // finishes and reverts to `filter: none` even while still hovered, which
  // read as "nothing happens" for a sustained hover. This glow instead stays
  // on for exactly as long as the pointer is over the text, matching the
  // tunnel's own hover-held duration.
  const [glowing, setGlowing] = useState(false);
  const enterTunnel = () => { if (canHover()) { heroTunnelBus.setActive(true); setGlowing(true); } };
  const leaveTunnel = () => { if (canHover()) { heroTunnelBus.setActive(false); setGlowing(false); } };
  // Touch has no hover state to key off, so the same effect runs for as long
  // as a tap is held anywhere on the hero — full mode only (lite skips it
  // entirely, same as everywhere else heavy motion is gated). Desktop
  // pointers no-op here since canHover() is true there and the enter/leave
  // handlers above already own it.
  const holdTunnel = () => {
    if (lite || canHover()) return;
    heroTunnelBus.setActive(true);
    setGlowing(true);
  };
  const releaseTunnel = () => {
    if (lite || canHover()) return;
    heroTunnelBus.setActive(false);
    setGlowing(false);
  };
  const glowClass = `hero-glow${glowing ? ' hero-glow-active' : ''}`;
  const whisper = useHeroWhisper(glowing, WHISPER_QUESTIONS);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-between z-10 pt-40 md:pt-32 lg:pt-36 pb-[18vh] md:pb-[20vh]"
      onTouchStart={holdTunnel}
      onTouchEnd={releaseTunnel}
      onTouchCancel={releaseTunnel}
    >
      {/* Whisper question — see useHeroWhisper. Centered over the void
          between the two headline anchors, not tied to cursor position. */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-8 text-center" aria-hidden="true">
        <p className={`hero-whisper hero-whisper-text font-display uppercase tracking-tight text-[clamp(1.375rem,4.25vw,2.375rem)] ${whisper.visible ? 'hero-whisper-visible' : ''}`}>
          {whisper.text}
        </p>
      </div>

      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl mt-6 md:mt-10">
        {/* Same face and same size as the headline. The two lines are one
            voice; only weight and the red span separate them. Both hero lines
            share the same hover behavior: a sustained glow/bloom (hero-text-
            glow, JS-state-driven — see comment above) plus the starfield
            tunnel dive (heroTunnelBus + ParticleField). */}
        <p
          className={`${glowClass} no-hover-fx relative font-display uppercase leading-[1.02] md:leading-[0.95] tracking-tight text-foreground break-words text-[clamp(1.4rem,7.6vw,5.1875rem)] md:text-[clamp(2rem,4.4vw,3.6rem)] cursor-none`}
          onMouseEnter={enterTunnel}
          onMouseLeave={leaveTunnel}
        >
          {/* The scramble writes noise into the DOM for the length of the reveal,
              so assistive tech reading early got garbage (audit 2026-08-02, F-006).
              Every visual layer is hidden from it and the true string is exposed
              once, unanimated. */}
          <span className="sr-only">{EYEBROW}</span>
          <span className="hero-layer hero-layer-base" aria-hidden="true">
            <Letters text={nameDisplay} prefix="eb-n" />
            <Letters text=" | " prefix="eb-s" />
            <Letters text={roleDisplay} prefix="eb-r" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-red" aria-hidden="true">
            <Letters text={nameDisplay} prefix="ebgr-n" />
            <Letters text=" | " prefix="ebgr-s" />
            <Letters text={roleDisplay} prefix="ebgr-r" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-white" aria-hidden="true">
            <Letters text={nameDisplay} prefix="ebgw-n" />
            <Letters text=" | " prefix="ebgw-s" />
            <Letters text={roleDisplay} prefix="ebgw-r" />
          </span>
        </p>
      </div>

      {/* The void between the two anchors is the composition. Nothing goes
          here: the starfield reads as depth only if it is given the room. */}
      <div className="flex-1" aria-hidden="true" />

      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl mb-6 md:mb-10">
        {/* Two sizing regimes: below md the headline breaks into two lines and
            can run wide; above md it must hold on a single line, so the vw
            factor is set by character count.

            The vw terms are fit constraints, not size choices — scaling them
            up pushes the headline off the single line it has to hold above
            md, or forces a mid-word break below it.

            These values are not a ratio-scaled guess: this text is wrapped
            letter-by-letter (see Letters, above) with each glyph in its own
            inline-block span, which defeats the browser's normal word-space
            break opportunity — the two lines below md only look word-wrapped
            because the line fills to exactly a space character; it's really
            wrapping by character count. That means "recalibrate the old
            multiplier" isn't enough - refitting after a face swap means
            re-measuring actual rendered glyph widths for this exact string
            against the actual container width, not eyeballing it. Measured
            via getBoundingClientRect() on the rendered spans (not
            canvas measureText, which applies kerning these isolated spans
            don't get): at 375px viewport (311px content width) "SINAIDA
            KRIVCHENKO " is the tightest line at ~30.7px max font before
            overflow; at 1280px viewport (1172px content width) the full
            single-line headline needs ~60.9px max. Both below-md and
            above-md vw terms are set to roughly 93% of that measured ceiling
            for antialiasing/hinting margin, and the floors/ceilings are
            capped to the same fit constraint (unlike the old face, Geist
            Pixel's width means the ceiling must also respect the max-w-7xl
            container on very wide screens, or the headline overflows there
            too). Re-derive with the same method if the copy or the face
            changes again. */}
        <h1
          className={`${glowClass} no-hover-fx relative font-display uppercase leading-[1.02] md:leading-[0.95] tracking-tight text-foreground font-bold text-[clamp(1.4rem,7.6vw,5.1875rem)] md:text-[clamp(2rem,4.4vw,3.6rem)] cursor-none`}
          onMouseEnter={enterTunnel}
          onMouseLeave={leaveTunnel}
        >
          {/* Same reason as the eyebrow above (audit 2026-08-02, F-006): this is
              the <h1>, so the scrambled frames were the page's accessible name
              for the first ~860 ms. */}
          <span className="sr-only">{`${LINE_A} ${LINE_B}`}</span>
          <span className="hero-layer hero-layer-base" aria-hidden="true">
            <Letters text={headA} prefix="ha" />
            <br className="md:hidden" />
            <span className="neon-glow neon-glow-hero text-primary font-bold">
              <Letters text={headB} prefix="hb" />
            </span>
          </span>
          <span className="hero-layer hero-ghost hero-ghost-red" aria-hidden="true">
            <Letters text={headA} prefix="hagr" />
            <br className="md:hidden" />
            <Letters text={headB} prefix="hbgr" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-white" aria-hidden="true">
            <Letters text={headA} prefix="hagw" />
            <br className="md:hidden" />
            <Letters text={headB} prefix="hbgw" />
          </span>
        </h1>
      </div>
    </section>
  );
}
