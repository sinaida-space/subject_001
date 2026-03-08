import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center z-10">
      <div className="container mx-auto px-6 grid grid-cols-12 gap-4 items-end pb-24">
        {/* Main title area */}
        <div className="col-span-12 lg:col-span-8">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="clinical-label mb-6 text-primary">SINAIDA KRIVCHENKOAI VISUAL ARTIST AND DIGITAL STRATEGIST — PRAGUE, CZ
              <span className="inline-block w-2 h-2 bg-primary mr-2 animate-pulse" />
              AI Visual Artist — Prague, CZ
            </p>
            <h1
              className="font-display text-5xl md:text-7xl lg:text-8xl font-light leading-[0.9] tracking-tight text-foreground glitch-text"
              data-text="Where Engineering Meets Imagination">
              
              Where<br />
              <span className="text-primary font-medium">Engineering</span><br />
              Meets<br />
              <span className="neon-glow-accent text-accent">Imagination</span>
            </h1>
          </div>
        </div>

        {/* Side info */}
        <div className={`col-span-12 lg:col-span-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="border-l border-primary/30 pl-6 space-y-6">
            <p className="font-clinical text-sm text-muted-foreground leading-relaxed">
              Merging biomedical engineering with generative AI to create immersive visual systems for stages, exhibitions, and curated environments.
            </p>
            <div className="flex gap-4 text-xs font-clinical text-muted-foreground">
              <span className="border border-border px-2 py-1">Creative Strategy </span>
              <span className="border border-border px-2 py-1">Gen AI</span>
              <span className="border border-border px-2 py-1">​Experience Design    </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`col-span-12 mt-12 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-px h-12 bg-gradient-to-b from-primary/60 to-transparent" />
            <span className="clinical-label">Scroll to explore</span>
          </div>
        </div>
      </div>
    </section>);

}