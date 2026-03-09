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
              Art, technology, and
              <span className="text-primary"> human expression</span>
            </h2>

            <div className="space-y-6 font-clinical text-sm md:text-base text-secondary-foreground leading-relaxed">
              <p className="dust-child">
                I work at the intersection of art, technology, and human expression. My focus is the emerging creative territory often described as the digital latent space – a new medium where generative systems expand how ideas, movement, and identity can be expressed.
              </p>
              <p className="dust-child">
                Trained as a biomedical engineer and shaped by experience in corporate IT leadership, I approach creative technology with both analytical rigor and artistic intent. Alongside my professional career, I have developed projects within the ballet and performing arts world to transition visions into a sustainable commercial reality.
              </p>
              <p className="dust-child">
                My current practice combines generative AI, real-time visual systems, and cinematic post-production to create immersive digital experiences. Using tools such as DaVinci Resolve and TouchDesigner, I build workflows that integrate AI synthesis with real-time environments and high-fidelity visual environments that connect people through a new creative language.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
