import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import VHSOverlay from '@/components/VHSOverlay';
import CustomCursor from '@/components/CustomCursor';
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
  const rafRef = useRef<number>(0);
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

    const animate = () => {
      phaseRef.current += 0.028;
      drawECG(ctx, canvas.width, canvas.height, phaseRef.current, hovered);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
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

  const line1 = useTyper('> ERROR_CODE: 404', 6, 300);
  const line2 = useTyper('> SIGNAL_LOST — navigating the void', 6, 300 + 18 * 6 + 120);
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
      <CustomCursor />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">

        <div
          className="font-mono uppercase mb-6 tracking-widest text-xs"
          style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3em' }}
        >
          SINAIDA_OS v2.4.1 — NAVIGATION ERROR
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

        <div className="mt-2 mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span className="font-mono" style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}>
            — lost in the void.
          </span>
        </div>

        <div
          className="font-mono text-left w-full mb-10 space-y-1"
          style={{ color: 'rgba(0,229,255,0.55)', fontSize: '0.75rem' }}
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
              border: '1px solid rgba(0,229,255,0.4)',
              color: 'rgba(0,229,255,0.7)',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = '#00e5ff';
              (e.currentTarget as HTMLAnchorElement).style.color = '#00e5ff';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(0,229,255,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,229,255,0.4)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(0,229,255,0.7)';
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
            style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.25em' }}
          >
            sin.ai.da · prague · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
