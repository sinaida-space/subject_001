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
                <p>I believe the digital world is a sanctuary for human memory. My work merges the artistic precision of a dancer and the algorithmic logic of a machine.</p>
                <p>
                  I design immersive digital environments and responsive visual narratives for cultural institutions. My practice spans AI-generated visuals, projection mapping, and audio-reactive systems.
                </p>
              </div>
              <div className="space-y-4">
                <p>
                  I channel precision and intentionality into generative art and immersive installations. I work with TouchDesigner, Midjourney, and real-time procedural systems to create visual experiences that inhabit physical space — on stages, in water, across architecture.
                </p>
                <p>
                  I see generative AI not as a shortcut, but as a creative instrument. In trained, intentional hands, it expands scale, speed, and expressive range.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}
