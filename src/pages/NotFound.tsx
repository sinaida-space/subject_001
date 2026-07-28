import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import VHSOverlay from '@/components/VHSOverlay';
import SnakeEasterEgg from '@/components/SnakeEasterEgg';
import { useNoIndex } from '@/hooks/usePageMeta';

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

function useTyper(text: string, speed: number, delay: number) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const tick = () => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { setDone(true); return; }
        setTimeout(tick, speed * (0.6 + Math.random() * 0.8));
      };
      setTimeout(tick, 0);
    }, delay);
    return () => clearTimeout(start);
  }, [text, speed, delay]);

  return { displayed, done };
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
    ctx.strokeStyle = `hsl(0 100% 52%)`; // primary-legible — canvas needs a literal, not var()
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `hsl(0 100% 52%)`;
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
    ctx.strokeStyle = `hsla(0, 100%, 52%, ${bright ? 0.25 : 0.12})`; // primary-legible
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
      title="[ ??? ]"
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
  useNoIndex();

  const line1 = useTyper('> ERROR_CODE: 404', 6, 300);
  const line2 = useTyper('> SIGNAL_LOST: navigating the void', 6, 300 + 18 * 6 + 120);
  const line3 = useTyper('> awaiting_redirect.exe', 8, 300 + 18 * 6 + 120 + 37 * 6 + 200);

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
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
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
          SINAIDA_OS v3.1.1: NAVIGATION ERROR
        </div>

        <h1
          className="font-mono select-none"
          style={{
            fontSize: 'clamp(10rem, 22vw, 22.5rem)',
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: '1.5px hsl(var(--sinaida-red))',
            letterSpacing: '-0.04em',
            textShadow: glitchActive
              ? '3px 0 hsl(var(--sinaida-red)), -3px 0 #ffffff'
              : '0 0 60px hsl(var(--sinaida-red) / 0.15)',
            transition: glitchActive ? 'none' : 'text-shadow 0.3s ease',
          }}
        >
          {glitched404}
        </h1>

        <div className="mt-2 mb-8" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
          <span className="font-mono" style={{ fontSize: '1.375rem', letterSpacing: '0.12em' }}>
            Lost in the void.
          </span>
        </div>

        <div
          className="font-mono text-left w-full mb-10 space-y-1"
          style={{ color: 'hsl(var(--foreground) / 0.45)', fontSize: '1.25rem' }}
        >
          <div>{line1.displayed}{!line1.done && <span className="animate-terminal-cursor">█</span>}</div>
          {line1.done && <div>{line2.displayed}{!line2.done && <span className="animate-terminal-cursor">█</span>}</div>}
          {line2.done && <div>{line3.displayed}{!line3.done && <span className="animate-terminal-cursor">█</span>}</div>}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <a
            href="/"
            className="flex-1 font-mono text-sm uppercase tracking-widest py-3 px-6 flex items-center justify-center transition-all duration-200"
            style={{
              border: '1px solid hsl(var(--sinaida-red))',
              color: 'hsl(var(--primary-legible))',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'hsl(var(--primary-legible))';
              (e.currentTarget as HTMLAnchorElement).style.color = '#000';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(var(--primary-legible))';
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
              border: '1px solid hsl(var(--foreground) / 0.25)',
              color: 'hsl(var(--foreground) / 0.6)',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(var(--sinaida-red))';
              (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(var(--primary-legible))';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px hsl(var(--sinaida-red) / 0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(var(--foreground) / 0.25)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(var(--foreground) / 0.6)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
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
