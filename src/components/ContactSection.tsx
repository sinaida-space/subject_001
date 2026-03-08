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
      <div className="container mx-auto px-6">
        <div className="section-divider mb-20" />

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Contact</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">
              [ COMM.SYS // OPEN ]
            </div>
          </div>

          <div className={`col-span-12 md:col-span-9 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="font-display text-3xl md:text-5xl font-light mb-8">
              Let's create something<br />
              <span className="text-primary">extraordinary</span>
            </h2>

            <p className="font-clinical text-sm text-muted-foreground max-w-xl mb-12 leading-relaxed">Available for immersive installations, creative direction, stage visuals, exhibition design, and generative art commissions.

Based in Prague, working globally.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <a
                href="mailto:sinkrivchenko@gmail.com"
                className="border border-border p-6 hover:border-primary/40 transition-all group cursor-none">
                
                <div className="clinical-label text-accent mb-2">Email</div>
                <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                   gallant_mod5v@icloud.com
                </div>
              </a>

              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border p-6 hover:border-primary/40 transition-all group cursor-none">
                
                <div className="clinical-label text-accent mb-2">Instagram</div>
                <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                  @sin.ai.da
                </div>
              </a>

              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border p-6 hover:border-primary/40 transition-all group cursor-none">
                
                <div className="clinical-label text-accent mb-2">LinkedIn</div>
                <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                  /in/sinaida
                </div>
              </a>
            </div>

            <div className="border border-primary/20 bg-primary/5 p-8">
              <h3 className="font-display text-lg mb-3">Open for Collaboration</h3>
              <p className="font-clinical text-xs text-muted-foreground leading-relaxed">
                Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion — let's talk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>);

}