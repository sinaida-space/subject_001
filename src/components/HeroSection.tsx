import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToWork = () => {
    document.querySelector('#work')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center z-10 pt-40 md:pt-32 lg:pt-36 pb-16 md:pb-20">
      
      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl grid grid-cols-12 gap-10 md:gap-8 lg:gap-12 items-end">
        {/* Main title area */}
        <div className="col-span-12 lg:col-span-8 py-10 md:py-12 lg:py-16">
          <div
            className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
            }>
            
            <p className="clinical-label mb-6 text-primary">
              SINAIDA KRIVCHENKO | VISUAL ARTIST AND DIGITAL STRATEGIST
            </p>
            <h1
              className="font-display text-4xl md:text-6xl leading-[0.95] tracking-tight text-foreground glitch-text mt-6 mb-8 my-[100px] lg:text-8xl font-bold"
              data-text="Where Engineering Meets Imagination">
              
              Where
              <br />
              <span className="text-primary font-medium">Engineering</span>
              <br />
              Meets
              <br />
              <span className="neon-glow-accent text-accent">Imagination</span>
            </h1>
          </div>
        </div>

        {/* Side info */}
        <div
          className={`col-span-12 lg:col-span-4 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
          }>
          
          <div className="border-l border-primary/30 pl-8 space-y-5">
            <p className="font-mono text-[15px] leading-relaxed my-4" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Transforming complex ideas into visual systems for stages, concerts, performances,
              and spaces where sound becomes light.
            </p>
            <div className="flex flex-col gap-2 font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {['experience_design', 'stage_visuals', 'new_media_art'].map((t, i, arr) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="text-primary/70">$</span>
                  {t}
                  {i === arr.length - 1 && (
                    <span className="inline-block h-[1em] w-[7px] bg-accent/80 animate-terminal-cursor" />
                  )}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollToContact}
              className="font-mono text-[12px] uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none"
            >
              Contact me
            </button>
          </div>
        </div>
      </div>

      {/* Clarity strip: static on load, fully readable immediately (no reveal gating) */}
      <div className="relative z-10 w-full mt-10 md:mt-14">
        <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl">
          <div className="border-t border-primary/20 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p
              className="font-mono uppercase text-[11px] md:text-[12px] leading-relaxed"
              style={{ letterSpacing: '0.08em', color: 'rgba(255,255,255,0.60)' }}
            >
              Live visuals for concerts &amp; festivals · Stage design for theater &amp; dance · Immersive installations
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 shrink-0">
              <p
                className="font-mono text-[12px]"
                style={{ color: 'rgba(255,255,255,0.60)' }}
              >
                Currently booking 2026–27 · Prague, works worldwide
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={scrollToWork}
                  className="font-mono text-[12px] uppercase tracking-[0.1em] px-4 py-2 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none whitespace-nowrap"
                >
                  See work ↓
                </button>
                <button
                  type="button"
                  onClick={scrollToContact}
                  className="font-mono text-[12px] uppercase tracking-[0.1em] px-4 py-2 border border-primary text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none whitespace-nowrap"
                >
                  Contact →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);


}
