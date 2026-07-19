import { useEffect, useRef, useState } from 'react';
import { nbsp } from '@/lib/typo';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
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
            
            <p className="clinical-label mb-6 text-primary-legible break-words">
              SINAIDA KRIVCHENKO | NEW MEDIA ARTIST
            </p>
            <h1 className="uppercase font-extrabold tracking-[-0.02em] text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-foreground mt-6 mb-8">
              Visual worlds
              <br />
              <span className="text-foreground/60 font-light">for</span>
              <br />
              <span className="text-primary">physical spaces</span>
            </h1>
          </div>
        </div>

        {/* Side info */}
        <div
          className={`lg:col-span-4 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
          }>

          <div className="border-l border-primary/30 pl-8 space-y-5">
            <p className="font-mono text-sm leading-relaxed my-4" style={{ color: 'hsl(var(--foreground) / 0.82)' }}>
              {nbsp('Building interactive digital frameworks for complex human narratives.')}
            </p>
            <button
              type="button"
              onClick={scrollToContact}
              className="font-mono text-xs uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary-legible bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none"
            >
              Contact me
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
