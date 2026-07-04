import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import ObfuscatedMailto from './ObfuscatedMailto';

type WaveformInteraction = {
  mouseY: number;
  sectionHeight: number;
  isActive: boolean;
  // Set by WaveformCanvas so the parent's pointer handler can restart the loop
  // after it self-terminates at rest (see motion-law rAF fix).
  ensureRunning?: () => void;
};

const AMP_FLOOR = 0.3;

// ── Waveform Canvas ─────────────────────────────────────────
function WaveformCanvas({ interactionRef }: { interactionRef: MutableRefObject<WaveformInteraction> }) {
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
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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
        grad.addColorStop(1, `rgba(0,229,255,${opacity})`);
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
        rafRef.current = null;
        return;
      }

      tRef.current += 0.016;
      rafRef.current = requestAnimationFrame(draw);
    };

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
  }, [interactionRef]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 120 }} />;
}

// ── Signal Bars ─────────────────────────────────────────────
function SignalBars() {
  const [active, setActive] = useState(5);
  useEffect(() => {
    const iv = setInterval(() => {
      setActive(Math.floor(Math.random() * 3) + 3); // 3-5
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const bars = [1, 2, 3, 4, 5];
  const heights = [6, 10, 14, 18, 22];
  return (
    <div className="flex items-end gap-[3px] mt-6">
      {bars.map((b, i) => (
        <div
          key={b}
          className="transition-opacity duration-200"
          style={{
            width: 4,
            height: heights[i],
            borderRadius: 1,
            background: b <= active ? '#00e5ff' : '#00e5ff',
            opacity: b <= active ? 1 : 0.15,
          }}
        />
      ))}
    </div>
  );
}

// ── Frequency HUD ───────────────────────────────────────────
function FreqDisplay() {
  const [freq, setFreq] = useState(440.0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true);
      setTimeout(() => {
        setFreq(+(380 + Math.random() * 140).toFixed(1));
        setGlitch(false);
      }, 60);
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className="absolute top-[6%] right-[4%] font-mono text-[12px] z-10 select-none"
      style={{ color: glitch ? '#ff3333' : '#00e5ff', opacity: 0.4, transition: 'color 0.05s' }}
    >
      FREQ: {freq} Hz
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
// Static copy — renders instantly, no typing/reveal gating (same rule applied
// to ServicesTerminal/HeroSection in Task 4): this section's content must not
// be gated behind a character-by-character reveal.
const PARA_1 =
  'Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion, let\'s talk.';
const PARA_2 =
  'Immersive installations  ·  Creative direction\nStage visuals  ·  Exhibition design\nGenerative art commissions\n──────────────────────────\nBased in Prague. Working globally.';

export default function ContactChannel() {
  const sectionRef = useRef<HTMLElement>(null);
  const mouseTimer = useRef<ReturnType<typeof setTimeout>>();
  const interactionRef = useRef<WaveformInteraction>({
    mouseY: 0,
    sectionHeight: 1,
    isActive: false,
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
        @keyframes blink-cursor {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      <FreqDisplay />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <div
              className="font-mono uppercase text-primary"
              style={{ letterSpacing: '0.2em', fontSize: 12 }}
            >
              Contact
            </div>
            <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              [ COMM.SYS // OPEN ]
            </div>

            <SignalBars />
            <div className="font-mono mt-2 select-none" style={{ color: '#00e5ff', opacity: 0.4, fontSize: 12 }}>
              SIGNAL: STRONG
            </div>

          {/* Social links */}
          <div className="mt-10 space-y-3">
            <ObfuscatedMailto
              label="→ EMAIL"
              className="block font-mono text-[12px] tracking-wider transition-opacity hover:opacity-100"
              style={{ color: '#00e5ff', opacity: 0.5 }}
            />
            <a
              href="https://www.instagram.com/sin.ai.da/"
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-[12px] tracking-wider transition-opacity hover:opacity-100"
              style={{ color: '#00e5ff', opacity: 0.5 }}
            >
              → INSTAGRAM
            </a>
            <a
              href="https://www.linkedin.com/in/sinaida"
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-[12px] tracking-wider transition-opacity hover:opacity-100"
              style={{ color: '#00e5ff', opacity: 0.5 }}
            >
              → LINKEDIN
            </a>
          </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">
          {/* Waveform */}
          <div className="mb-10">
            <WaveformCanvas interactionRef={interactionRef} />
          </div>

          {/* Terminal text */}
          <div className="max-w-2xl">
            {/* Sys line */}
            <div className="font-mono text-[12px] mb-6" style={{ color: '#00e5ff', opacity: 0.5 }}>
              {'> COMM.SYS ONLINE // CHANNEL OPEN'}
            </div>

            {/* Heading */}
            <h2 className="mb-8">
              <span className="block text-foreground font-light" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
                Open for
              </span>
              <span className="block font-bold" style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#ff3333' }}>
                Collaboration
              </span>
            </h2>

            {/* Transmission */}
            <div className="font-mono text-[12px] mb-3" style={{ color: '#00e5ff', opacity: 0.45 }}>
              {'> incoming_transmission.decode() //'}
            </div>

            <p className="font-mono text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.87)' }}>
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

            {/* Available for */}
            <div className="font-mono text-[12px] mb-3" style={{ color: '#00e5ff', opacity: 0.45 }}>
              {'> available_for.list() //'}
            </div>

            <div className="font-mono text-[13px] leading-relaxed mb-8 whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.87)' }}>
              {PARA_2.split('·').map((seg, i, arr) => (
                <span key={i}>
                  {seg}
                  {i < arr.length - 1 && <span style={{ color: '#ff3333' }}>·</span>}
                </span>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mt-10 mb-12">
              <ObfuscatedMailto
                label="EMAIL ME ↗"
                className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                style={{
                  border: '1px solid #ff3333',
                  color: '#ff3333',
                  background: 'rgba(255,51,51,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ff3333';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,51,51,0.06)';
                  e.currentTarget.style.color = '#ff3333';
                }}
              />
              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                style={{
                  border: '1px solid rgba(0,229,255,0.4)',
                  color: '#00e5ff',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                  e.currentTarget.style.borderColor = '#00e5ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
                }}
              >
                FOLLOW ON INSTAGRAM ↗
              </a>
              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                style={{
                  border: '1px solid rgba(0,229,255,0.4)',
                  color: '#00e5ff',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                  e.currentTarget.style.borderColor = '#00e5ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
                }}
              >
                CONNECT ON LINKEDIN ↗
              </a>
            </div>

            {/* Final line — decorative-only, so the low opacity here is fine
                (informational text above uses .75/.87, never this low). */}
            <div className="font-mono text-[12px]" style={{ color: '#00e5ff', opacity: 0.3 }}>
              {'> channel open for new signals'}
              <span style={{ animation: 'blink-cursor 1s step-end infinite' }}>_</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
