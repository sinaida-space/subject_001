import { useEffect, useRef, useState } from 'react';

export default function AboutSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setInView(true);},
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="about" className="relative z-10 py-32">
      <div className="container mx-auto px-6">
        <div className="section-divider mb-20" />

        <div className="grid grid-cols-12 gap-8">
          {/* Label */}
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">About</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">
              [ BIO.SYS // 001 ]
            </div>
          </div>

          {/* Content */}
          <div className={`col-span-12 md:col-span-9 space-y-8 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="font-display text-3xl md:text-5xl font-light leading-tight">
              From diagnostic algorithms to
              <span className="text-primary"> digital organisms</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-clinical text-sm text-secondary-foreground leading-relaxed">
              <div className="space-y-4">
                <p>I believe the digital world is a sanctuary for human memory. My process breathes a soul into the machine, grounding the logic of fantasy into immersive visual systems. 

                </p>
                <p>
                  From there, I spent 5+ years at General Electric, leading IT strategy, Oracle ERP implementations, and digital transformation across Russia, UAE, and the US through their elite IT Leadership Program.
                </p>
              </div>
              <div className="space-y-4">
                <p>
                  Now I channel that engineering precision into generative AI art and immersive installations. I work with TouchDesigner, Midjourney, and real-time procedural systems to create visual experiences that live in physical space — on stages, in water, across architecture.
                </p>
                <p>
                  I see Gen AI not as a shortcut, but as a creative instrument. In the hands of a trained, intentional mind, it expands scale, speed, and expressive range.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
              {[
              { value: '10+', label: 'Years in Tech & Strategy' },
              { value: 'GE', label: 'IT Leadership Program' },
              { value: 'MSc', label: 'Biomedical Engineering' }].
              map((stat) =>
              <div key={stat.label}>
                  <div className="font-display text-2xl md:text-3xl text-primary font-light">{stat.value}</div>
                  <div className="clinical-label mt-1">{stat.label}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);

}