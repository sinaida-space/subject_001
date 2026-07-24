import { useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { squashScrollTo } from '@/lib/squashScroll';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [launchingTag, setLaunchingTag] = useState<string | null>(null);
  const { mode } = useRenderMode();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Hero tags jump straight to the projects section. Full mode gets the
  // squash-and-stretch "launch" treatment (tag + page content); lite mode
  // (and reduced-motion, which forces lite) just gets a plain smooth scroll.
  const scrollToWork = (tag: string) => {
    const target = document.querySelector('#work');
    if (!target) return;

    if (mode !== 'full') {
      target.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setLaunchingTag(tag);
    window.setTimeout(() => setLaunchingTag(null), 500);
    squashScrollTo(target, document.querySelector('main'));
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center z-10 pt-40 md:pt-32 lg:pt-36 pb-16 md:pb-20">
      
      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl flex flex-col gap-10 md:gap-8 lg:grid lg:grid-cols-12 lg:gap-12 lg:items-end">
        {/* Main title area */}
        <div className="lg:col-span-8 py-10 md:py-12 lg:py-16 min-w-0">
          <div
            className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
            }>
            
            <p className="clinical-label mb-6 text-primary-legible break-words" style={{ fontSize: 20 }}>
              SINAIDA{' '}KRIVCHENKO | NEW{' '}MEDIA ARTIST
            </p>
            <h1
              className="font-display text-4xl md:text-6xl uppercase leading-[0.95] tracking-tight text-foreground glitch-text mt-6 mb-8 my-[100px] lg:text-8xl font-bold"
              data-text="Visual Worlds For Physical Spaces">

              Visual
              <br />
              Worlds
              <br />
              For
              <br />
              <span className="neon-glow text-primary font-bold">Physical Spaces</span>
            </h1>
          </div>
        </div>

        {/* Side info */}
        <div
          className={`lg:col-span-4 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
          }>
          
          <div className="border-l border-primary/30 pl-8 space-y-5">
            <p className="font-mono text-[15px] leading-relaxed my-4" style={{ color: 'hsl(var(--foreground) / 0.82)' }}>
              Transforming complex ideas into visual systems for stages, concerts, performances,
              and spaces where sound becomes light.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Experience Design', 'Stage Visuals', 'New Media Art'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => scrollToWork(t)}
                  className={`font-mono uppercase transition-colors hover:border-primary/60 hover:text-primary cursor-none ${
                    launchingTag === t ? 'animate-tag-launch' : ''
                  }`}
                  style={{
                    border: '1px solid hsl(var(--foreground) / 0.2)',
                    padding: '6px 12px',
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    color: 'hsl(var(--foreground) / 0.7)',
                    background: 'transparent',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollToContact}
              className="font-mono text-[12px] uppercase tracking-[0.15em] px-5 py-3 transition-all duration-300 cursor-none"
              style={{ border: '1px solid #ff3333', color: '#ff3333', background: 'rgba(255,51,51,0.06)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ff3333';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,51,51,0.06)';
                e.currentTarget.style.color = '#ff3333';
              }}
            >
              Contact me
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
