import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center z-10 pt-40 md:pt-32 lg:pt-36 pb-16 md:pb-20"
    >
      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl grid grid-cols-12 gap-10 md:gap-8 lg:gap-12 items-end">
        {/* Main title area */}
        <div className="col-span-12 lg:col-span-8 py-10 md:py-12 lg:py-16">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <p className="clinical-label mb-6 text-primary">
              SINAIDA KRIVCHENKO | VISUAL ARTIST AND DIGITAL STRATEGIST
            </p>
            <h1
              className="font-display text-4xl md:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground glitch-text mt-6 mb-8"
              data-text="Where Engineering Meets Imagination"
            >
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
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="border-l border-primary/30 pl-8 space-y-8">
            <p className="font-clinical text-base md:text-lg text-muted-foreground leading-relaxed">
              ​Transforming complex ideas into visual systems designed for physical spaces, such as
              events, exhibitions, performances, and curated environments.
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-clinical text-muted-foreground">
              <span className="border border-border px-3 py-1.5">Digital Strategy</span>
              <span className="border border-border px-3 py-1.5">Gen AI</span>
              <span className="border border-border px-3 py-1.5">​Experience Design</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`col-span-12 mt-16 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-px h-16 bg-gradient-to-b from-primary/60 to-transparent" />
            <span className="clinical-label">Scroll to explore</span>
          </div>
        </div>
      </div>
    </section>
  );

}