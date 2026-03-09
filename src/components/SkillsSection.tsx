import { useEffect, useRef, useState } from 'react';

const SKILLS = [
  {
    category: 'Creative Direction',
    items: [
      'Visual narrative development',
      'Concept design for immersive environments',
      'Aesthetic systems & visual language design',
      'Storytelling',
      'Cultural and performance-based visual concepts'
    ]
  },
  {
    category: 'Creative Technology',
    items: [
      'TouchDesigner',
      'Generative AI Systems (LLM, diffusion workflows)',
      'Real-time audio-reactive visuals',
      'Procedural animation',
      'AI-assisted visual pipelines',
      'Post-production (editing and color grading)'
    ]
  },
  {
    category: 'Strategic & Systems Thinking',
    items: [
      'Creative technology strategy',
      'Interdisciplinary project leadership',
      'Cultural program development',
      'Digital experience design',
      'Innovation & emerging media strategy'
    ]
  },
  {
    category: 'Technical & Analytical Foundations',
    items: [
      'Systems design thinking',
      'Data-driven creative workflows',
      'Algorithmic thinking for visual systems',
      'Process architecture & optimization',
      'Biomedical engineering (MSc)'
    ]
  },
  {
    category: 'Research Interests',
    items: [
      'AI and creativity research',
      'Human-AI creative collaboration',
      'Cognitive science of creativity'
    ]
  }
];

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
  }
];

export default function SkillsSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
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
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ VALUE // ACTIVE ]</div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {SERVICES.map((service) => (
                <div key={service.code} className="border border-border p-6 hover:border-primary/30 transition-colors group cursor-none">
                  <div className="clinical-label text-accent mb-3">{service.code}</div>
                  <h3 className="font-display text-lg font-medium mb-4 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="font-clinical text-sm text-muted-foreground leading-relaxed my-2">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Matrix */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Capabilities</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ SKILLS ]</div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-14 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {SKILLS.map((group) => (
                <div key={group.category}>
                  <h4 className="font-display text-base font-medium text-foreground mb-4 border-b border-border pb-2">
                    {group.category}
                  </h4>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="font-clinical text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary/50 shrink-0 mt-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
