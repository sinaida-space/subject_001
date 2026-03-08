import { useEffect, useRef, useState } from 'react';

const SKILLS = [
{
  category: 'Creative Tools',
  items: ['TouchDesigner', 'Midjourney', 'DaVinci Resolve', 'Affinity Suite', 'Suno AI']
},
{
  category: 'Technical',
  items: ['Projection Mapping', 'Audio-Reactive Systems', 'WebGL / Three.js', 'Procedural Animation']
},
{
  category: 'Strategic',
  items: ['Creative Direction', 'Brand Strategy', 'Project Management']
},
{
  category: 'Engineering Foundation',
  items: ['Biomedical Engineering MSc', 'Data Analysis']
}];


const SERVICES = [
{
  code: 'SRV.001',
  title: 'Immersive Visuals',
  description: 'Visual systems for event spaces, stages, exhibitions, and projection mapping. Interactive and realtime environments.'
},
{
  code: 'SRV.002',
  title: 'Creative Direction',
  description: 'Developing consistent visual languages across video, static media, and interactive installations.'
},
{
  code: 'SRV.003',
  title: 'Digital Art',
  description: 'Custom audio-reactive and data-driven procedural animations for performances and curated environments.'
},
{
  code: 'SRV.004',
  title: 'Conceptual Storytelling',
  description: 'Translating complex philosophical and ethical themes into compelling visual narratives.'
}];


export default function SkillsSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setInView(true);},
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="process" className="relative z-10 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="section-divider mb-20" />

        {/* Services */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 mb-24">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Services</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ VALUE // ACTIVE ]

            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {SERVICES.map((service) =>
              <div key={service.code} className="border border-border p-6 hover:border-primary/30 transition-colors group cursor-none">
                  <div className="clinical-label text-accent mb-3">{service.code}</div>
                  <h3 className="font-display text-xl font-medium mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="font-clinical text-xs text-muted-foreground leading-relaxed">{service.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skills Matrix */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Capabilities</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ SKILLS ]

            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {SKILLS.map((group) =>
              <div key={group.category}>
                  <h4 className="font-display text-sm font-medium text-foreground mb-3 border-b border-border pb-2">
                    {group.category}
                  </h4>
                  <ul className="space-y-1.5">
                    {group.items.map((item) =>
                  <li key={item} className="font-clinical text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary/50 shrink-0" />
                        {item}
                      </li>
                  )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);

}