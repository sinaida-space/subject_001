import { useEffect, useRef, useState } from 'react';

export default function ContactSection() {
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
    <section ref={ref} id="contact" className="relative z-10 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="section-divider mb-20" />

        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Contact</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">
              [ COMM.SYS // OPEN ]
            </div>
          </div>

          <div className={`col-span-12 md:col-span-9 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {/* Collaboration callout — moved up */}
            <div className="mb-12">
              <h2 className="font-display text-3xl md:text-5xl font-light mb-4">
                Open for<br />
                <span className="text-primary">Collaboration</span>
              </h2>
              <p className="font-clinical text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion — let's talk.
              </p>
            </div>

            <div className="font-clinical text-base md:text-lg text-muted-foreground max-w-xl mb-12 leading-relaxed space-y-4">
              <p>Available for immersive installations, creative direction, stage visuals, exhibition design, and generative art commissions.</p>
              <p>Based in Prague, working globally.</p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:gallant_mod5v@icloud.com"
                className="clinical-label border border-primary/30 px-6 py-3 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 cursor-none">
                EMAIL ME ↗
              </a>

              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="clinical-label border border-primary/30 px-6 py-3 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 cursor-none">
                FOLLOW ON INSTAGRAM ↗
              </a>

              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="clinical-label border border-primary/30 px-6 py-3 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 cursor-none">
                CONNECT ON LINKEDIN ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>);

}