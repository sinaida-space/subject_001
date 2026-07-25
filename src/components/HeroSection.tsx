import { useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useScrambleReveal } from '@/hooks/useScrambleReveal';
import { heroTunnelBus } from '@/lib/heroTunnelBus';

const NAME = 'SINAIDA KRIVCHENKO';
const ROLE = 'NEW MEDIA ARTIST';
const EYEBROW = `${NAME} | ${ROLE}`;
const LINE_A = 'VISUAL WORLDS FOR ';
const LINE_B = 'PHYSICAL SPACES';

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
  // Touch has no hover state to key off, so the same effect toggles on tap
  // instead — full mode only (lite skips it entirely, same as everywhere
  // else heavy motion is gated). Desktop pointers no-op here since canHover()
  // is true there and the enter/leave handlers above already own it.
  const tapTunnel = () => {
    if (lite || canHover()) return;
    setGlowing((g) => {
      const next = !g;
      heroTunnelBus.setActive(next);
      return next;
    });
  };
  const glowClass = `hero-glow${glowing ? ' hero-glow-active' : ''}`;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-between z-10 pt-40 md:pt-32 lg:pt-36 pb-[18vh] md:pb-[20vh]">

      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl mt-6 md:mt-10">
        {/* Same face and same size as the headline. The two lines are one
            voice; only weight and the red span separate them. Both hero lines
            share the same hover behavior: a sustained glow/bloom (hero-text-
            glow, JS-state-driven — see comment above) plus the starfield
            tunnel dive (heroTunnelBus + ParticleField). */}
        <p
          className={`${glowClass} no-hover-fx relative font-display uppercase leading-[1.02] md:leading-[0.95] tracking-tight text-foreground break-words text-[clamp(2.3rem,11.5vw,4.15rem)] md:text-[clamp(2.75rem,5.3vw,6.3rem)] cursor-none`}
          onMouseEnter={enterTunnel}
          onMouseLeave={leaveTunnel}
          onClick={tapTunnel}
        >
          <span className="hero-layer hero-layer-base">
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
            factor is set by character count. */}
        <h1
          className={`${glowClass} no-hover-fx relative font-display uppercase leading-[1.02] md:leading-[0.95] tracking-tight text-foreground font-bold text-[clamp(2.3rem,11.5vw,4.15rem)] md:text-[clamp(2.75rem,5.3vw,6.3rem)] cursor-none`}
          onMouseEnter={enterTunnel}
          onMouseLeave={leaveTunnel}
          onClick={tapTunnel}
        >
          <span className="hero-layer hero-layer-base">
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
