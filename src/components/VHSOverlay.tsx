import { useEffect, useState } from 'react';

export default function VHSOverlay() {
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let lastScroll = window.scrollY;

    const handleScroll = () => {
      const delta = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;

      if (delta > 30) {
        setGlitching(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => setGlitching(false), 200);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* CRT Scanlines - always visible */}
      <div className="crt-scanlines" />

      {/* VHS tracking distortion on scroll */}
      {glitching && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          {/* Horizontal noise bands */}
          <div
            className="absolute w-full h-1 bg-primary/20"
            style={{ top: `${Math.random() * 100}%` }}
          />
          <div
            className="absolute w-full h-0.5 bg-accent/15"
            style={{ top: `${Math.random() * 100}%` }}
          />
          {/* Color shift overlay */}
          <div
            className="absolute inset-0 mix-blend-screen opacity-5"
            style={{
              background: `linear-gradient(${Math.random() * 360}deg, hsl(0 100% 55% / 0.1), transparent, hsl(0 0% 100% / 0.08))`,
            }}
          />
        </div>
      )}
    </>
  );
}
