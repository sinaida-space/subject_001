import { useEffect, useRef, useState } from 'react';

export default function AboutSection() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;

    const children = content.querySelectorAll('.dust-child');
    
    // Initialize as hidden
    children.forEach((child) => {
      child.classList.add('dust-hidden');
      child.classList.remove('dust-visible');
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0.1) {
          // Stagger reveal
          children.forEach((child, i) => {
            setTimeout(() => {
              child.classList.remove('dust-hidden');
              child.classList.add('dust-visible');
            }, i * 120);
          });
          setHasAnimated(true);
        } else if (entry.intersectionRatio === 0 && hasAnimated) {
          // Reset when fully out of view
          children.forEach((child) => {
            child.classList.add('dust-hidden');
            child.classList.remove('dust-visible');
          });
          setHasAnimated(false);
        }
      },
      { threshold: [0, 0.1, 0.2, 0.5, 0.8, 1.0] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section ref={sectionRef} id="about" className="relative z-10 py-32">
      <style>{`
        .dust-hidden {
          opacity: 0;
          filter: blur(12px);
          transform: translateY(20px) scale(0.96);
          transition: none;
        }
        .dust-visible {
          opacity: 1;
          filter: blur(0px);
          transform: translateY(0px) scale(1);
          transition: opacity 1.1s ease, filter 1.4s ease, transform 1.0s ease;
        }
      `}</style>
      
      <div ref={contentRef} className="container mx-auto px-6 max-w-7xl">
        {/* Click to explore - first child */}
        <div 
          className="dust-child text-center mb-8"
          style={{
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: '#00e5ff',
            fontFamily: 'monospace',
          }}
        >
          CLICK TO EXPLORE
        </div>
        
        <div className="dust-child section-divider mb-20" />

        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-start">
          {/* Label */}
          <div className="dust-child col-span-12 md:col-span-3 md:pt-2">
            <span className="clinical-label text-primary">About</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ BIO ]</div>
          </div>

          {/* Content */}
          <div className="col-span-12 md:col-span-9 space-y-8">
            <h2 className="dust-child font-display text-2xl md:text-4xl font-light leading-tight mb-8">
              From diagnostic algorithms to
              <span className="text-primary"> digital organisms</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-clinical text-sm md:text-base text-secondary-foreground leading-relaxed pt-[42px]">
              <div className="space-y-6">
                <p className="dust-child my-3">I believe the digital world is a sanctuary for human memory. My process breathes a soul into the machine, grounding the logic of fantasy into immersive visual systems.</p>
                <p className="dust-child my-3">
                  From there, I spent 5+ years at General Electric, leading IT strategy, Oracle ERP implementations, and digital transformation across Russia, UAE, and the US through their elite IT Leadership Program.
                </p>
              </div>
              <div className="space-y-6">
                <p className="dust-child my-3">
                  I channel precision and intentionality into generative art and immersive installations. I work with TouchDesigner, Midjourney, to create real-time visual experiences that inhabit physical space — on stages, in water, across real world objects.
                </p>
                <p className="dust-child my-3">
                  I see generative AI as a creative instrument that collapses the distance between speed and soul, expanding the boundaries of what is possible to bring people together in the real world.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
