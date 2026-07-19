import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import VHSOverlay from '@/components/VHSOverlay';
import SnakeEasterEgg from '@/components/SnakeEasterEgg';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const GLITCH_CHARS = '█▓▒░⣿⠿╗╔║═╬▄▀';

function useGlitch(text: string, active: boolean) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!active) return;
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 4) {
        setDisplay(text);
        clearInterval(interval);
        return;
      }
      const chars = text.split('');
      const numReplace = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numReplace; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setDisplay(chars.join(''));
      count++;
    }, 80);
    return () => clearInterval(interval);
  }, [active, text]);

  return display;
}

function PulsingECG({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const drawECG = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, bright: boolean) => {
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;
    const segments = 120;
    const intensity = bright ? 1 : 0.7;

    ctx.beginPath();
    ctx.strokeStyle = `hsl(0 100% 55%)`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `hsl(0 100% 55%)`;
    ctx.shadowBlur = bright ? 14 : 6;

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * w;
      const t = (i / segments) * Math.PI * 4 + phase;
      let y = mid;
      const pos = ((t % (Math.PI * 2)) / (Math.PI * 2));

      if (pos > 0.35 && pos < 0.40) {
        y = mid - 3 * intensity * Math.sin((pos - 0.35) / 0.05 * Math.PI);
      } else if (pos > 0.42 && pos < 0.44) {
        y = mid + 4 * intensity;
      } else if (pos > 0.44 && pos < 0.48) {
        const rPos = (pos - 0.44) / 0.04;
        y = mid - (18 + intensity * 8) * Math.sin(rPos * Math.PI);
      } else if (pos > 0.48 && pos < 0.50) {
        y = mid + 5 * intensity;
      } else if (pos > 0.55 && pos < 0.65) {
        y = mid - 5 * intensity * Math.sin((pos - 0.55) / 0.10 * Math.PI);
      }

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `hsla(0, 100%, 55%, ${bright ? 0.25 : 0.12})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Motion only on interaction: the pulse scrolls its phase while the mystery
    // button is hovered. When not hovered, draw a single static rest frame and
    // stop scheduling — no perpetual idle loop. Hovering re-runs this effect
    // (hovered is a dep) and restarts the pulse.
    if (hovered) {
      const animate = () => {
        phaseRef.current += 0.028;
        drawECG(ctx, canvas.width, canvas.height, phaseRef.current, true);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    }

    // Rest frame at the current (frozen) phase, un-hovered intensity.
    drawECG(ctx, canvas.width, canvas.height, phaseRef.current, false);
  }, [drawECG, hovered]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="???"
      style={{
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        opacity: hovered ? 1 : 0.45,
        transition: 'opacity 0.3s',
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={32}
        className="h-8"
        style={{ imageRendering: 'auto' }}
      />
    </button>
  );
}

export default function NotFound() {
  const location = useLocation();
  const [glitchActive, setGlitchActive] = useState(false);
  const [snakeOpen, setSnakeOpen] = useState(false);
  const glitched404 = useGlitch('404', glitchActive);

  useEffect(() => {
    console.error('404:', location.pathname);
    const loop = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 400);
    }, 3500);
    return () => clearInterval(loop);
  }, [location.pathname]);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'hsl(280 33% 3%)' }}
    >
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}

      <Suspense fallback={null}>
        <div className="absolute inset-0 z-0">
          <ParticleField />
        </div>
      </Suspense>

      <VHSOverlay />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">

        <div
          className="font-mono uppercase mb-6 tracking-widest text-xs"
          style={{ color: 'hsl(var(--foreground) / 0.35)', letterSpacing: '0.3em' }}
        >
          Page not found
        </div>

        <h1
          className="font-mono select-none"
          style={{
            fontSize: 'clamp(8rem, 22vw, 18rem)',
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: '1.5px #ff3333',
            letterSpacing: '-0.04em',
            textShadow: glitchActive
              ? '3px 0 #ff3333, -3px 0 #00e5ff'
              : '0 0 60px rgba(255,51,51,0.15)',
            transition: glitchActive ? 'none' : 'text-shadow 0.3s ease',
          }}
        >
          {glitched404}
        </h1>

        <div className="mt-2 mb-8" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
          <span className="font-mono" style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}>
            — lost in the void.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <a
            href="/"
            className="flex-1 font-mono text-sm uppercase tracking-widest py-3 px-6 flex items-center justify-center transition-all duration-200"
            style={{
              border: '1px solid #ff3333',
              color: '#ff3333',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = '#ff3333';
              (e.currentTarget as HTMLAnchorElement).style.color = '#000';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = '#ff3333';
            }}
          >
            → Return to Home
          </a>
          <a
            href="https://open.spotify.com/playlist/2Hs1OUJppCUNZRxZh5bppa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 font-mono text-sm uppercase tracking-widest py-3 px-6 flex items-center justify-center transition-all duration-200"
            style={{
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ff3333';
              (e.currentTarget as HTMLAnchorElement).style.color = '#ff3333';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            ♪ drift into space ↗
          </a>
        </div>

        <div className="mt-16 mb-4 flex flex-col items-center gap-6">
          <PulsingECG onClick={() => setSnakeOpen(true)} />
          <div
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: 'hsl(var(--foreground) / 0.2)', letterSpacing: '0.25em' }}
          >
            sin.ai.da · prague · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
