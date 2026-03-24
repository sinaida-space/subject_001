import { useEffect, useRef, useState, useCallback } from 'react';

// ── Waveform Canvas ─────────────────────────────────────────
function WaveformCanvas({ mouseY, sectionHeight, isActive }: { mouseY: number; sectionHeight: number; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const amplitudeRef = useRef(0.3);
  const lastMoveRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = 120 * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = '120px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
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
        amplitudeRef.current = Math.max(0.3, amplitudeRef.current - 0.005);
      }

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

      tRef.current += 0.016;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [mouseY, sectionHeight, isActive]);

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

// ── Typing Engine ───────────────────────────────────────────
function useTyper(text: string, speed: number, startDelay: number, trigger: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!trigger || started.current) return;
    started.current = true;
    let i = 0;
    let tid: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); return; }
      // Jitter: 60–140 % of base speed → organic machine-typing feel
      const next = speed > 0 ? speed * (0.6 + Math.random() * 0.8) : 0;
      tid = setTimeout(typeNext, next);
    };

    tid = setTimeout(typeNext, startDelay);
    return () => clearTimeout(tid);
  }, [trigger, text, speed, startDelay]);

  return { displayed, done };
}

// ── Glitch Text ─────────────────────────────────────────────
function GlitchText({ text, active, className, style }: { text: string; active: boolean; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(text);
  const glitchChars = '░▒▓█';

  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      if (frame > 8) { setDisplay(text); clearInterval(iv); return; }
      const arr = text.split('');
      for (let j = 0; j < 3; j++) {
        const idx = Math.floor(Math.random() * arr.length);
        arr[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      setDisplay(arr.join(''));
    }, 60);
    return () => clearInterval(iv);
  }, [active, text]);

  return <span className={className} style={style}>{display}</span>;
}

// ── Main Component ──────────────────────────────────────────
export default function ContactChannel() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [mouseY, setMouseY] = useState(0);
  const [mouseActive, setMouseActive] = useState(false);
  const [sectionHeight, setSectionHeight] = useState(1);
  const mouseTimer = useRef<ReturnType<typeof setTimeout>>();

  // IntersectionObserver
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mouse tracking on section
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouseY(e.clientY - rect.top);
    setSectionHeight(rect.height);
    setMouseActive(true);
    clearTimeout(mouseTimer.current);
    mouseTimer.current = setTimeout(() => setMouseActive(false), 2000);
  }, []);

  // Typing sequences — snappy machine-typing feel
  const sysLine = useTyper('> COMM.SYS ONLINE — CHANNEL OPEN', 0, 0, inView);
  const openFor = useTyper('Open for', 12, 100, inView);
  const collab = useTyper('Collaboration', 12, 100 + 8 * 12 + 40, inView);

  // Continue after heading types
  const transmissionDelay = 100 + (8 + 13) * 12 + 40 + 120;
  const txHeader = useTyper('> incoming_transmission.decode() —', 8, transmissionDelay, inView);

  const para1 = 'Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion — let\'s talk.';
  const p1Delay = transmissionDelay + 34 * 8 + 160;
  const typed1 = useTyper(para1, 5, p1Delay, inView);

  const availDelay = p1Delay + para1.length * 5 + 200;
  const availHeader = useTyper('> available_for.list() —', 8, availDelay, inView);

  const para2 = 'Immersive installations  ·  Creative direction\nStage visuals  ·  Exhibition design\nGenerative art commissions\n──────────────────────────\nBased in Prague. Working globally.';
  const p2Delay = availDelay + 24 * 8 + 160;
  const typed2 = useTyper(para2, 4, p2Delay, inView);

  const ctaVisible = typed2.done;

  const finalDelay = p2Delay + para2.length * 4 + 300;
  const finalLine = useTyper('> channel remains open. awaiting response', 8, finalDelay, inView);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative z-10 py-24 overflow-hidden"
      onMouseMove={handleMouseMove}
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
            <a
              href="mailto:gallant_mod5v@icloud.com"
              className="block font-mono text-[12px] tracking-wider transition-opacity hover:opacity-100"
              style={{ color: '#00e5ff', opacity: 0.5 }}
            >
              → EMAIL
            </a>
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
            <WaveformCanvas mouseY={mouseY} sectionHeight={sectionHeight} isActive={mouseActive} />
          </div>

          {/* Terminal text */}
          <div className="max-w-2xl">
            {/* Sys line */}
            <div className="font-mono text-[12px] mb-6" style={{ color: '#00e5ff', opacity: 0.5 }}>
              {inView ? '> COMM.SYS ONLINE — CHANNEL OPEN' : ''}
            </div>

            {/* Heading */}
            <h2 className="mb-8">
              <span className="block text-foreground font-light" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
                {openFor.displayed}
              </span>
              <span className="block font-bold" style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#ff3333' }}>
                {collab.displayed}
              </span>
            </h2>

            {/* Transmission */}
            <div className="font-mono text-[12px] mb-3" style={{ color: '#00e5ff', opacity: 0.45 }}>
              {txHeader.displayed}
            </div>

            <p className="font-mono text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {(() => {
                const marker = "— let's talk.";
                const idx = typed1.displayed.indexOf('— let');
                if (idx === -1) return typed1.displayed;
                return (
                  <>
                    {typed1.displayed.slice(0, idx)}
                    <span style={{ color: '#ff3333', fontWeight: 700 }}>{typed1.displayed.slice(idx)}</span>
                  </>
                );
              })()}
            </p>

            {/* Available for */}
            <div className="font-mono text-[12px] mb-3" style={{ color: '#00e5ff', opacity: 0.45 }}>
              {availHeader.displayed}
            </div>

            <div className="font-mono text-[13px] leading-relaxed mb-8 whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {typed2.displayed.split('·').map((seg, i, arr) => (
                <span key={i}>
                  {seg}
                  {i < arr.length - 1 && <span style={{ color: '#ff3333' }}>·</span>}
                </span>
              ))}
            </div>

            {/* CTA Buttons */}
            <div
              className="flex flex-wrap gap-4 mt-10 mb-12 transition-opacity duration-600"
              style={{ opacity: ctaVisible ? 1 : 0 }}
            >
              <a
                href="mailto:gallant_mod5v@icloud.com"
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
              >
                EMAIL ME ↗
              </a>
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

            {/* Final line */}
            <div className="font-mono text-[12px]" style={{ color: '#00e5ff', opacity: 0.3 }}>
              {finalLine.displayed}
              {finalLine.done && (
                <span style={{ animation: 'blink-cursor 1s step-end infinite' }}>_</span>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
