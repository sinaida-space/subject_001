import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import VHSOverlay from '@/components/VHSOverlay';
import CustomCursor from '@/components/CustomCursor';

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

export default function NotFound() {
  const location = useLocation();
  const [glitchActive, setGlitchActive] = useState(false);
  const glitched404 = useGlitch('404', glitchActive);

  const line1 = useTyper('> ERROR_CODE: 404', 6, 300);
  const line2 = useTyper('> SIGNAL_LOST — navigating the void', 6, 300 + 18 * 6 + 120);
  const line3 = useTyper('> awaiting_redirect.exe', 8, 300 + 18 * 6 + 120 + 37 * 6 + 200);

  useEffect(() => {
    console.error('404:', location.pathname);
    // Trigger glitch every few seconds
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
      {/* Particle background */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 z-0">
          <ParticleField />
        </div>
      </Suspense>

      <VHSOverlay />
      <CustomCursor />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">

        {/* Clinical label */}
        <div
          className="font-mono uppercase mb-6 tracking-widest text-xs"
          style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3em' }}
        >
          SINAIDA_OS v2.4.1 — NAVIGATION ERROR
        </div>

        {/* 404 */}
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

        {/* Subtitle */}
        <div className="mt-2 mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span className="font-mono" style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}>
            — lost in the void.
          </span>
        </div>

        {/* Terminal lines */}
        <div
          className="font-mono text-left w-full mb-10 space-y-1"
          style={{ color: 'rgba(0,229,255,0.55)', fontSize: '0.75rem' }}
        >
          <div>{line1.displayed}{!line1.done && <span className="animate-terminal-cursor">█</span>}</div>
          {line1.done && <div>{line2.displayed}{!line2.done && <span className="animate-terminal-cursor">█</span>}</div>}
          {line2.done && <div>{line3.displayed}{!line3.done && <span className="animate-terminal-cursor">█</span>}</div>}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <a
            href="/"
            className="flex-1 font-mono text-sm uppercase tracking-widest py-3 px-6 text-center transition-all duration-200"
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
            href="https://www.instagram.com/sin.ai.da/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 font-mono text-sm uppercase tracking-widest py-3 px-6 text-center transition-all duration-200"
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
            → Instagram ↗
          </a>
        </div>

        {/* Bottom label */}
        <div
          className="font-mono mt-12 text-xs uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.25em' }}
        >
          sin.ai.da · prague · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
