// Full-mode dreamcore hero: a 200vh scroll runway with a sticky viewport
// inner containing the scroll-driven Tesseract. Standby state at rest
// (p=0): tesseract at 0.65 alpha, ramping to full by p=0.12; a static CSS
// vignette. No power-on glitch, no idle motion — per the
// motion law (docs/spec-dreamcore-tesseract.md §0), nothing animates
// without scroll.
import { useEffect, useRef } from 'react';
import Tesseract from '@/components/dreamcore/Tesseract';
import { registerHeroSection, subscribeScrub } from '@/hooks/useScrubBus';

export default function HeroFull() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerHeroSection(sectionRef.current);
    return () => registerHeroSection(null);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeScrub((state) => {
      const wrap = canvasWrapRef.current;
      if (!wrap) return;
      // Standby ramp: 0.65 alpha at p=0, full by p=0.12.
      const alpha = 0.65 + 0.35 * Math.min(1, state.p / 0.12);
      wrap.style.opacity = String(alpha);
    });
    return unsubscribe;
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div ref={canvasWrapRef} className="absolute inset-0" style={{ opacity: 0.65 }}>
          <Tesseract className="w-full h-full" />
        </div>
      </div>
    </section>
  );
}
