// Hero: a rotating 4D tesseract carrying the hero copy on its vertices,
// scroll-morphing into a static Swiss-grid layout (see Tesseract.tsx, which
// owns the canvas, the DOM labels, the center CTA, and the morph itself).
// Lite mode and prefers-reduced-motion skip the canvas entirely and render
// HeroStatic directly, the same content laid out as ordinary markup, so
// the morph end-state and this fallback read as the same page.
import { useEffect, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import Tesseract, { HERO_NAME, HERO_SUBLINE, HERO_TAGLINE, HERO_SERVICES, HERO_CTA } from './Tesseract';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function scrollToContact() {
  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
}

// The p=1 Swiss layout as ordinary markup: name block, oversized tagline,
// services list, CTA, on a 12-col rhythm starting at column 2 (desktop) or a
// single left-margined column (mobile). This is what the tesseract's own
// morph settles into as well, just built from static flow instead of
// per-frame transforms.
export function HeroStatic() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center z-10 pt-40 md:pt-32 lg:pt-36 pb-16 md:pb-20">
      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-10 md:col-start-2 flex flex-col gap-10 md:gap-14">
          <div>
            <h1 className="font-display text-3xl md:text-4xl leading-[0.95] tracking-tight text-foreground">
              {HERO_NAME}
            </h1>
            <p className="clinical-label text-primary-legible mt-3">{HERO_SUBLINE}</p>
          </div>

          <p className="font-display text-3xl md:text-5xl lg:text-6xl leading-tight text-foreground max-w-3xl">
            {HERO_TAGLINE}
          </p>

          <ul className="flex flex-col gap-8 font-mono text-[13px] text-foreground/80">
            {HERO_SERVICES.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={scrollToContact}
            className="self-start font-mono text-xs uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary-legible bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors cursor-none"
          >
            {HERO_CTA}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HeroSection() {
  const { mode } = useRenderMode();
  const reducedMotion = useReducedMotion();

  if (mode === 'lite' || reducedMotion) {
    return <HeroStatic />;
  }

  return (
    <section className="relative z-10" style={{ height: '200vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Tesseract />
      </div>
    </section>
  );
}
