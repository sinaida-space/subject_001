import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import XrayHeading from '@/components/XrayHeading';
import ObfuscatedMailto from './ObfuscatedMailto';
import { useRenderMode } from '@/hooks/useRenderMode';

type WaveformInteraction = {
  mouseY: number;
  sectionHeight: number;
  isActive: boolean;
  // Current animated amplitude (0..1), written every drawn frame by
  // WaveformCanvas so other components can read real waveform state.
  amplitude: number;
  // True while the rAF loop is scheduled; false once it has self-terminated
  // at rest. Mirrors the "settled" check inside WaveformCanvas.
  running: boolean;
  // Set by WaveformCanvas so the parent's pointer handler can restart the loop
  // after it self-terminates at rest (see motion-law rAF fix).
  ensureRunning?: () => void;
};

const AMP_FLOOR = 0.3;

// ── Waveform Canvas ─────────────────────────────────────────
function WaveformCanvas({ interactionRef }: { interactionRef: MutableRefObject<WaveformInteraction> }) {
  const { mode } = useRenderMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const amplitudeRef = useRef(AMP_FLOOR);
  const lastMoveRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = 120 * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = '120px';
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const { mouseY, sectionHeight, isActive } = interactionRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Scan lines
      ctx.strokeStyle = 'hsl(var(--foreground) / 0.04)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Amplitude lerp
      const now = performance.now();
      if (isActive) {
        amplitudeRef.current = Math.min(1.0, amplitudeRef.current + 0.02);
        lastMoveRef.current = now;
      } else if (now - lastMoveRef.current > 200) {
        amplitudeRef.current = Math.max(AMP_FLOOR, amplitudeRef.current - 0.005);
      }

      // Publish real amplitude state for anything reading the shared ref
      // (e.g. the signal readout) — never invented, always what's on screen.
      interactionRef.current.amplitude = amplitudeRef.current;

      // Settled = no active pointer input and amplitude has decayed to its floor.
      // In that state the wave has nothing left to animate, so freeze the phase
      // and let the loop self-terminate below (resumes on the next pointer move).
      const settled = !isActive && amplitudeRef.current <= AMP_FLOOR + 1e-3;

      const t = tRef.current;
      const amp = amplitudeRef.current;
      const baseline = h / 2;
      const freqShift = sectionHeight > 0 ? ((mouseY / sectionHeight) - 0.5) * 1.6 : 0;

      const drawWave = (tOffset: number, opacity: number) => {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `rgba(255,34,0,${opacity})`);
        grad.addColorStop(1, `rgba(255,255,255,${opacity})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = opacity > 0.5 ? 1.5 : 1;
        ctx.beginPath();
        const tt = t + tOffset;
        for (let x = 0; x < w; x += 2) {
          const noise = Math.sin(x * 0.12 + tt * 4.3) * Math.sin(x * 0.07 - tt * 3.1);
          const y = baseline
            + Math.sin(x * (0.018 + freqShift * 0.005) + tt * 1.4) * amp * 28
            + Math.sin(x * 0.031 - tt * 0.9) * amp * 14
            + Math.sin(x * 0.052 + tt * 2.1) * amp * 8
            + noise * amp * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      // Ghost
      drawWave(0.15, 0.2);
      // Main
      drawWave(0, 1);

      if (settled) {
        // Rest frame drawn; stop scheduling and hold this static image.
        interactionRef.current.running = false;
        rafRef.current = null;
        return;
      }

      interactionRef.current.running = true;
      tRef.current += 0.016;
      rafRef.current = requestAnimationFrame(draw);
    };

    if (mode === 'lite') {
      draw();
      return () => window.removeEventListener('resize', resize);
    }

    const ensureRunning = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(draw);
    };
    // Let the parent's pointer handler restart the loop after it settles.
    interactionRef.current.ensureRunning = ensureRunning;

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (interactionRef.current.ensureRunning === ensureRunning) {
        interactionRef.current.ensureRunning = undefined;
      }
    };
  }, [interactionRef, mode]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 120 }} />;
}

// ── Signal Readout ──────────────────────────────────────────
// A live readout of the waveform's actual amplitude state — no invented
// values. Samples the shared interaction ref on a slow interval (not every
// rAF frame) so it never drives an extra render at 60fps, and only calls
// setState when the displayed string actually changes.
function SignalReadout({ interactionRef }: { interactionRef: MutableRefObject<WaveformInteraction> }) {
  const { mode } = useRenderMode();
  const format = () => {
    const { amplitude, running } = interactionRef.current;
    const pct = Math.round(amplitude * 100).toString().padStart(3, '0');
    const state = running ? 'live' : 'rest';
    return `signal ${pct}% ${state}`;
  };

  const [text, setText] = useState(mode === 'lite' ? 'signal rest' : format);
  const lastRef = useRef(text);

  useEffect(() => {
    if (mode === 'lite') return;

    const sample = () => {
      const next = format();
      if (next !== lastRef.current) {
        lastRef.current = next;
        setText(next);
      }
    };

    sample();
    const iv = setInterval(sample, 120);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionRef, mode]);

  return (
    <div
      className="absolute top-[6%] right-[4%] font-mono text-[12px] z-10 select-none"
      style={{ color: 'hsl(var(--foreground))', opacity: 0.35 }}
      aria-hidden="true"
    >
      {mode === 'lite' ? 'signal rest' : text}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
// Static copy — renders instantly, no typing/reveal gating (same rule applied
// to ServicesTerminal/HeroSection in Task 4): this section's content must not
// be gated behind a character-by-character reveal.
const PARA_1 =
  'Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion, let\'s talk.';
const SERVICES = [
  'Immersive installations',
  'Creative direction',
  'Stage visuals',
  'Exhibition design',
  'Generative art commissions',
];

export default function ContactChannel() {
  const sectionRef = useRef<HTMLElement>(null);
  const mouseTimer = useRef<ReturnType<typeof setTimeout>>();
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const interactionRef = useRef<WaveformInteraction>({
    mouseY: 0,
    sectionHeight: 1,
    isActive: false,
    amplitude: AMP_FLOOR,
    running: false,
  });

  // Mouse tracking on section
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;

    interactionRef.current.mouseY = e.clientY - rect.top;
    interactionRef.current.sectionHeight = rect.height;
    interactionRef.current.isActive = true;
    // Pointer motion is the natural resume trigger for the settled waveform loop.
    interactionRef.current.ensureRunning?.();

    clearTimeout(mouseTimer.current);
    mouseTimer.current = setTimeout(() => {
      interactionRef.current.isActive = false;
    }, 2000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    interactionRef.current.isActive = false;
    clearTimeout(mouseTimer.current);
  }, []);

  useEffect(() => () => clearTimeout(mouseTimer.current), []);

  // Touch devices have no cursor, so the waveform would sit at its floor
  // forever. While the section is in the viewport, scroll movement (and
  // touchmove over the section) drives the same interaction ref that mouse
  // movement does, so touch visitors still get a responsive readout.
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const inViewport = () => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return false;
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const trigger = () => {
      interactionRef.current.isActive = true;
      interactionRef.current.ensureRunning?.();
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        interactionRef.current.isActive = false;
      }, 2000);
    };

    const handleScroll = () => {
      const y = window.scrollY;
      const delta = Math.abs(y - lastScrollY);
      lastScrollY = y;
      if (delta > 0 && inViewport()) trigger();
    };

    const handleTouchMove = () => {
      if (inViewport()) trigger();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const section = sectionRef.current;
    section?.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      section?.removeEventListener('touchmove', handleTouchMove);
      clearTimeout(scrollTimer.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative z-10 py-24 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scanline + particle keyframes */}
      <style>{`
        @keyframes scanline-sweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes particle-burst {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
      `}</style>

      <SignalReadout interactionRef={interactionRef} />

      <div className="container mx-auto px-6 max-w-7xl">
        {/* Waveform — full row above both columns so their first lines align */}
        <div className="mb-12">
          <WaveformCanvas interactionRef={interactionRef} />
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight text-primary-legible">
              Contact
            </XrayHeading>
            <p className="font-mono mt-3 text-[15px] text-foreground/60">
              Get in touch.
            </p>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">
          <div className="max-w-2xl">
            {/* Heading */}
            <h2 className="mb-8">
              <span className="block text-foreground font-light" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
                Open for
              </span>
              <span className="block font-bold" style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#ff3333' }}>
                Collaboration
              </span>
            </h2>

            <p className="font-mono text-[13px] leading-relaxed mb-6" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
              {(() => {
                const idx = PARA_1.indexOf("let's talk.");
                if (idx === -1) return PARA_1;
                return (
                  <>
                    {PARA_1.slice(0, idx)}
                    <span style={{ color: '#ff3333', fontWeight: 700 }}>{PARA_1.slice(idx)}</span>
                  </>
                );
              })()}
            </p>

            <div className="font-mono text-[12px] uppercase mb-3" style={{ color: 'hsl(var(--foreground) / 0.65)', letterSpacing: '0.1em' }}>
              Available for
            </div>

            <div className="font-mono text-[13px] leading-relaxed mb-8">
              <ul>
                {SERVICES.map(service => (
                  <li key={service} style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
                    {service}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.15)' }}>
                <p style={{ color: 'hsl(var(--foreground) / 0.87)' }}>Based in Prague. Working globally.</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-6 mt-10 mb-3">
              <ObfuscatedMailto
                label="EMAIL ME ↗"
                className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                style={{
                  border: '1px solid #ff3333',
                  color: '#000',
                  background: '#ff3333',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#ff3333';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ff3333';
                  e.currentTarget.style.color = '#000';
                }}
              />
              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible"
              >
                Instagram ↗
              </a>
              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
