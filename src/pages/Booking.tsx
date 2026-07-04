import { useEffect } from 'react';
import ObfuscatedMailto from '@/components/ObfuscatedMailto';
import { SERVICES } from '@/data/services';

const PROCESS_STEPS = [
  { code: '01', label: 'Brief', detail: 'You send the occasion, space, and constraints.' },
  { code: '02', label: 'Concept', detail: 'A visual direction comes back for your feedback.' },
  { code: '03', label: 'Build', detail: 'Systems get built and tested in TouchDesigner.' },
  { code: '04', label: 'Rehearsal', detail: 'On-site or remote tech check against the real rig.' },
  { code: '05', label: 'Show', detail: 'Delivered turnkey, or operated live.' },
];

function ServiceRow({ service }: { service: (typeof SERVICES)[number] }) {
  return (
    <div className="font-mono text-sm leading-relaxed" style={{ paddingBottom: '1rem' }}>
      <div style={{ color: '#00e5ff' }}>{`$ load_module --id=${service.code}`}</div>
      <h3 className="font-mono text-base font-medium mt-2 mb-2" style={{ color: '#00e5ff' }}>
        {service.title}
      </h3>
      <p className="font-mono text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.87)' }}>
        {service.description}
      </p>
      <p className="font-mono text-[13px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
        {service.leadTime}
      </p>
      <p className="font-mono text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
        {service.brief}
      </p>
      {service.proof && (
        <p className="font-mono text-[13px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
          <span style={{ color: '#ff3333' }}>{'> '}</span>
          {service.proof}
        </p>
      )}
    </div>
  );
}

const SEPARATOR = '────────────────────────────────────────────';

export default function Booking() {
  useEffect(() => {
    document.title = 'Booking — Sinaida Krivchenko';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      'Book Sinaida Krivchenko for live audio-reactive visuals, theater scenography, and immersive installations. Services, process, and practicalities for festivals, theaters, and venues.';
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      m.setAttribute('content', content);
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <a href="/" className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block">
          ← Back
        </a>

        <div className="font-mono uppercase text-primary-legible mb-2" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
          Booking
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-light mb-4">
          Work with <span className="text-primary font-bold">me</span>
        </h1>
        <p className="font-mono text-[14px] leading-relaxed mb-16" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Live visuals and immersive systems for festivals, theaters, dance, venues, and institutions.
        </p>

        {/* Services */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-6">Services</div>
          <div className="space-y-2">
            {SERVICES.map((service, i) => (
              <div key={service.code}>
                <ServiceRow service={service} />
                {i < SERVICES.length - 1 && (
                  <div className="my-4 font-mono text-sm" style={{ opacity: 0.12 }}>
                    {SEPARATOR}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-6">Process</div>
          <div className="flex flex-col md:flex-row gap-6 md:gap-4">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.code} className="flex-1 font-mono">
                <div style={{ color: '#ff3333', fontSize: 12 }}>{step.code}</div>
                <div className="text-base font-medium mt-1 mb-1" style={{ color: '#00e5ff' }}>
                  {step.label}
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {step.detail}
                </p>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Practicalities */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-6">Practicalities</div>
          <div className="font-mono text-[13px] leading-relaxed space-y-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <p>
              <span style={{ color: '#00e5ff' }}>Travel — </span>
              Based in Prague, working globally. Touring and international bookings are welcome;
              travel and accommodation are arranged case by case.
            </p>
            <p>
              <span style={{ color: '#00e5ff' }}>Tech rider — </span>
              Typical requirements are a projector or LED surface, a dedicated playback/render machine,
              and a feed from the live audio mix where the work is audio-reactive. Exact specs are
              confirmed once the venue and format are known.
            </p>
            <p>
              <span style={{ color: '#00e5ff' }}>Lead time — </span>
              Typical lead time: 4–8 weeks depending on scope, longer for full theater productions.
              Earlier is always better — see per-service lead times above.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="clinical-label text-primary-legible mb-6">Contact</div>
          <p className="font-mono text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Send the occasion, space, and timeline — a reply follows with next steps.
          </p>
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
