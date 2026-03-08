import { useEffect, useRef, useState } from 'react';

export default function ContactSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
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

            <p className="font-clinical text-sm text-muted-foreground max-w-xl mb-12 leading-relaxed">
              Available for immersive installations, creative direction, stage visuals, exhibition design, and generative art commissions. Based in Prague, working globally.
            </p>

            {/* Mailto button */}
            <a
              href="mailto:gallant_mod5v@icloud.com"
              className="inline-block border border-primary/40 px-8 py-3 font-clinical text-xs uppercase tracking-widest text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 cursor-none mb-12"
            >
              [ Send Signal ]
            </a>

            {/* Social links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
              {[
                { label: 'Instagram', handle: '@sin.ai.da', url: 'https://www.instagram.com/sin.ai.da/' },
                { label: 'LinkedIn', handle: '/in/sinaida', url: 'https://www.linkedin.com/in/sinaida' },
                { label: 'Medium', handle: '@idacooper', url: 'https://medium.com/@idacooper' },
                { label: 'Spotify', handle: 'Sinaida', url: 'https://open.spotify.com/user/1u4ol8qogt04u4476e4xba8g8?si=291adc6fad08414f' },
                { label: 'Behance', handle: '/sinaida', url: 'https://www.behance.net/sinaida' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border p-5 hover:border-primary/40 transition-all group cursor-none"
                >
                  <div className="clinical-label text-accent mb-2">{link.label}</div>
                  <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                    {link.handle}
                  </div>
                </a>
              ))}
            </div>

            <div className="border border-primary/20 bg-primary/5 p-8">
              <h3 className="font-display text-lg mb-3">Open for Collaboration</h3>
              <p className="font-clinical text-xs text-muted-foreground leading-relaxed">
                Seeking synthesis with touring productions, theater, musicians, and cultural institutions. I am looking for collaborations that require the transmutation of data into live experiences. Let's build the future together.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
