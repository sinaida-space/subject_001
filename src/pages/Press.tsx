import { useEffect } from 'react';
import ObfuscatedMailto from '@/components/ObfuscatedMailto';
import { FEATURED_WORKS } from '@/data/projects';

const TECH_BASICS = ['TouchDesigner', 'GLSL / real-time shaders', 'Audio-reactive systems', 'Generative AI visuals'];

export default function Press() {
  useEffect(() => {
    document.title = 'Press — Sinaida Krivchenko';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      'Press page for Sinaida Krivchenko: bio, representative work, tech basics, and contact — one link, no further clicks required.';
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      m.setAttribute('content', content);
      document.head.appendChild(m);
    }
  }, []);

  const stills = FEATURED_WORKS.slice(0, 3);

  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <a href="/" className="clinical-label text-primary hover:text-accent transition-colors mb-8 inline-block">
          ← Back
        </a>

        <div className="font-mono uppercase text-primary mb-2" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
          Press
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-light mb-10">
          Sinaida <span className="text-primary font-bold">Krivchenko</span>
        </h1>

        {/* Bio */}
        <section className="mb-14">
          <div className="font-mono mb-6" style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.85 }}>
            <p>I believe that technology is only meaningful when it helps people feel seen, heard, and connected.</p>
          </div>
          <div className="font-mono mb-6" style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.85 }}>
            <p>
              I build living visual systems for stages, concerts, and performance spaces. They breathe
              with sound, respond to bodies, and turn light, image, and generative code into a shared
              atmosphere.
            </p>
          </div>
          <div className="font-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>
            {'LOCATION: Prague'}
            <span style={{ color: '#ff3333' }}> · </span>
            {'REACH: Global'}
            <span style={{ color: '#ff3333' }}> · </span>
            {'AVAILABLE: Projects between engineering and emotion'}
          </div>
        </section>

        {/* Representative work */}
        <section className="mb-14">
          <div className="clinical-label text-primary mb-6">Selected work</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stills.map((project) => (
              <div key={project.id}>
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="w-full aspect-square object-cover"
                    style={{ border: '1px solid rgba(255,51,51,0.3)' }}
                  />
                )}
                <div className="font-mono mt-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  {project.title.split('—')[0].trim()}
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {project.tagline}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech basics */}
        <section className="mb-14">
          <div className="clinical-label text-primary mb-6">Tech basics</div>
          <ul className="font-mono text-[13px] space-y-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {TECH_BASICS.map((item) => (
              <li key={item}>
                <span style={{ color: '#ff3333' }}>{'> '}</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Contact */}
        <section>
          <div className="clinical-label text-primary mb-6">Contact</div>
          <ObfuscatedMailto
            label="EMAIL ME ↗"
            className="inline-block font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
            style={{
              border: '1px solid #ff3333',
              color: '#ff3333',
              background: 'rgba(255,51,51,0.06)',
            }}
          />
        </section>
      </div>
    </div>
  );
}
