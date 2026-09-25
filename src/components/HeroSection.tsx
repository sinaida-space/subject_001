import { useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useScrambleReveal } from '@/hooks/useScrambleReveal';
import { heroTunnelBus } from '@/lib/heroTunnelBus';
import { MoleculeNote } from '@/components/MoleculeBreak';
import { heroShellWasVisible } from '@/lib/staticShell';

const NAME = 'SINAIDA KRIVCHENKO';
const ROLE = 'NEW MEDIA ARTIST';
const EYEBROW = `${NAME} | ${ROLE}`;
const LINE_A = 'VISUAL WORLDS FOR ';
const LINE_B = 'STAGE & SCREEN';

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
// character independently.
//
// Those spans are inline-blocks, and an inline-block is a break opportunity,
// so emitting them as one flat run let the browser break the line between any
// two characters — the eyebrow read "SINAIDA KRIVCHENKO | NE" / "W MEDIA
// ARTIST" at ~676px wide. Words are therefore grouped in a nowrap wrapper
// (.hero-word) and the spaces between them left as the only break points,
// which is the wrapping the layout was always written against.
//
// Do not "simplify" this back to a flat [...text].map(): the mid-word break
// returns immediately, and only at the handful of widths where a line happens
// to fill mid-word, so it survives a casual look at one viewport.
const DRIFT_VARIANTS = ['a', 'b', 'c', 'd'];

// `indexOffset` keeps the drift variant and the stagger continuous when one
// visual line is emitted as several Letters calls (the eyebrow is three: name,
// separator, role). Without it each call would restart the 4-path cycle at
// 'a', which is not what the original :nth-child counting did.
//
// `settled` is the string the reveal ends on. The scramble swaps in noise glyphs
// of different widths (the face is proportional), which used to re-wrap the
// line dozens of times a second (CLS 0.29). While a glyph is still noise, its
// settled character stays in the layout invisibly and the noise is drawn on top.
function Letters({ text, settled = text, prefix, indexOffset = 0 }: { text: string; settled?: string; prefix: string; indexOffset?: number }) {
  // Split on whitespace but keep it: the separators are rendered, just not as
  // part of any word.
  const chars = [...text];
  const parts = settled.split(/(\s+)/).filter((part) => part !== '');
  let charIndex = indexOffset;
  let local = 0; // position inside `text`, without indexOffset

  return (
    <>
      {parts.map((part, p) => {
        const start = charIndex;
        const localStart = local;
        charIndex += part.length;
        local += part.length;

        if (/^\s+$/.test(part)) {
          return (
            <span key={`${prefix}-s-${p}`} className="hero-space">
              {part}
            </span>
          );
        }

        return (
          <span key={`${prefix}-w-${p}`} className="hero-word">
            {[...part].map((ch, i) => (
              <span
                key={`${prefix}-${start + i}`}
                // Variant comes from the position in the whole run, not from
                // :nth-child, which .hero-word would otherwise restart per word.
                className={`hero-ltr hero-ltr-${DRIFT_VARIANTS[(start + i) % DRIFT_VARIANTS.length]}`}
                style={{ animationDelay: `${((start + i) * 0.05).toFixed(2)}s` }}
              >
                {chars[localStart + i] === ch ? ch : (
                  <>
                    <span className="hero-sizer">{ch}</span>
                    <span className="hero-noise">{chars[localStart + i]}</span>
                  </>
                )}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}

// One eyebrow layer. Below md the line splits in two, so the " | " separator
// is dropped and an explicit break stands in its place: a pipe left hanging at
// the end of the first line reads as a typo, not as punctuation. Above md the
// line holds as one and the separator returns. Same md:hidden technique the
// headline below already uses for its own two-line regime.
//
// The offsets keep the drift cycle running continuously across the three
// Letters calls, as if the whole eyebrow were one run — which, above md, it is.
const SEPARATOR = ' | ';

function EyebrowLayer({ name, role, prefix }: { name: string; role: string; prefix: string }) {
  const settledName = EYEBROW.slice(0, NAME.length);
  const settledRole = EYEBROW.slice(NAME.length + SEPARATOR.length);
  return (
    <>
      <Letters text={name} settled={settledName} prefix={`${prefix}-n`} />
      <span className="hidden md:inline">
        <Letters text={SEPARATOR} prefix={`${prefix}-s`} indexOffset={name.length} />
      </span>
      <br className="md:hidden" />
      <Letters text={role} settled={settledRole} prefix={`${prefix}-r`} indexOffset={name.length + SEPARATOR.length} />
    </>
  );
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { mode } = useRenderMode();
  const lite = mode !== 'full';

  // Lite mode also covers prefers-reduced-motion, so the scramble is skipped
  // there and both lines paint solid. It is also skipped when the static
  // shell already showed the settled text (slow load, see staticShell.ts).
  const settled = lite || heroShellWasVisible;
  const eyebrow = useScrambleReveal(EYEBROW, { duration: 520, disabled: settled });
  const headA = useScrambleReveal(LINE_A, { delay: 260, duration: 760, disabled: settled });
  const headB = useScrambleReveal(LINE_B, { delay: 420, duration: 860, disabled: settled });

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
  // Releasing never checks canHover(): a resize or media change between
  // enter and leave must not leave the stream stuck on.
  const stopTunnel = () => { heroTunnelBus.setActive(false); setGlowing(false); };
  // Touch has no hover state, so the easter egg keys off a genuine long
  // press on the hero. A plain touch that scrolls the page past the hero
  // must not start the stream: the press only arms after LONG_PRESS_MS
  // without the finger travelling, and any movement cancels it. Full mode
  // only (lite skips it, same as all heavy motion). Desktop pointers no-op
  // here since the enter/leave handlers above own them.
  const LONG_PRESS_MS = 450;
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const clearPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };
  const holdTunnel = (e: React.TouchEvent) => {
    if (lite || canHover() || e.touches.length !== 1) return;
    clearPress();
    const t = e.touches[0];
    pressRef.current = {
      x: t.clientX,
      y: t.clientY,
      timer: window.setTimeout(() => {
        heroTunnelBus.setActive(true);
        setGlowing(true);
      }, LONG_PRESS_MS),
    };
  };
  const moveTunnel = (e: React.TouchEvent) => {
    const p = pressRef.current;
    if (!p || glowing) return;
    const t = e.touches[0];
    if (!t || Math.hypot(t.clientX - p.x, t.clientY - p.y) > 10) clearPress();
  };
  const releaseTunnel = () => {
    clearPress();
    if (glowing) stopTunnel();
  };
  // Safety net: leaving the tab or the window always ends the easter egg,
  // so the stream can never keep flying with nobody interacting.
  useEffect(() => {
    const off = () => { clearPress(); heroTunnelBus.setActive(false); setGlowing(false); };
    const onVis = () => { if (document.hidden) off(); };
    window.addEventListener('blur', off);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      off();
      window.removeEventListener('blur', off);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  const glowClass = `hero-glow${glowing ? ' hero-glow-active' : ''}`;
  const whisper = useHeroWhisper(glowing, WHISPER_QUESTIONS);

  // Noradrenaline, the skipped beat, hangs in the void as a faint star
  // cluster. It flares, an impulse running along its bonds, just before each
  // whisper question surfaces: on the hover/hold that starts the whisper, and
  // again each time a question evaporates while the hover continues (the next
  // one arrives 2s later, about as long as the flare).
  const [flare, setFlare] = useState(0);
  const prevWhisper = useRef({ glowing: false, visible: false });
  useEffect(() => {
    const prev = prevWhisper.current;
    if ((glowing && !prev.glowing) || (glowing && prev.visible && !whisper.visible)) setFlare((k) => k + 1);
    prevWhisper.current = { glowing, visible: whisper.visible };
  }, [glowing, whisper.visible]);
  const [smallHero] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-between z-10 pt-40 md:pt-32 lg:pt-36 pb-10"
      onTouchStart={holdTunnel}
      onTouchMove={moveTunnel}
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
          onMouseLeave={stopTunnel}
        >
          {/* The scramble writes noise into the DOM for the length of the reveal,
              so assistive tech reading early got garbage (audit 2026-08-02, F-006).
              Every visual layer is hidden from it and the true string is exposed
              once, unanimated. */}
          <span className="sr-only">{EYEBROW}</span>
          <span className="hero-layer hero-layer-base" aria-hidden="true">
            <EyebrowLayer name={nameDisplay} role={roleDisplay} prefix="eb" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-red" aria-hidden="true">
            <EyebrowLayer name={nameDisplay} role={roleDisplay} prefix="ebgr" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-white" aria-hidden="true">
            <EyebrowLayer name={nameDisplay} role={roleDisplay} prefix="ebgw" />
          </span>
        </p>
      </div>

      {/* The void between the two anchors is the composition. The only thing
          in it is noradrenaline, drawn out of the same stars, off to the side
          of where the whisper surfaces. Short viewports have almost no void,
          so it steps aside there rather than sit on the headline. */}
      <div className="relative flex-1">
        <div className="absolute right-[34%] md:right-[26%] top-1/2 -translate-y-1/2 [@media(max-height:620px)]:hidden">
          <MoleculeNote id="noradrenaline" width={smallHero ? 150 : 220} height={smallHero ? 60 : 90} pulse={flare} />
        </div>
      </div>

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
          onMouseLeave={stopTunnel}
        >
          {/* Same reason as the eyebrow above (audit 2026-08-02, F-006): this is
              the <h1>, so the scrambled frames were the page's accessible name
              for the first ~860 ms. */}
          <span className="sr-only">{`${LINE_A}${LINE_B}`}</span>
          <span className="hero-layer hero-layer-base" aria-hidden="true">
            <Letters text={headA} settled={LINE_A} prefix="ha" />
            <br className="md:hidden" />
            <span className="neon-glow neon-glow-hero text-primary font-bold">
              <Letters text={headB} settled={LINE_B} prefix="hb" />
            </span>
          </span>
          <span className="hero-layer hero-ghost hero-ghost-red" aria-hidden="true">
            <Letters text={headA} settled={LINE_A} prefix="hagr" />
            <br className="md:hidden" />
            <Letters text={headB} settled={LINE_B} prefix="hbgr" />
          </span>
          <span className="hero-layer hero-ghost hero-ghost-white" aria-hidden="true">
            <Letters text={headA} settled={LINE_A} prefix="hagw" />
            <br className="md:hidden" />
            <Letters text={headB} settled={LINE_B} prefix="hbgw" />
          </span>
        </h1>
      </div>
    </section>
  );
}
