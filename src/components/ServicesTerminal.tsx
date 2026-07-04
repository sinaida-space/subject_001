import { useRef } from 'react';
import { SERVICES, type Service } from '@/data/services';

const SEPARATOR = '────────────────────────────────────────────';

function ServiceBlock({ service }: { service: Service }) {
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
    </div>
  );
}

export default function ServicesTerminal() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="services" className="relative z-10 py-24"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <div
              className="font-mono uppercase text-primary-legible"
              style={{ letterSpacing: '0.2em', fontSize: 12 }}
            >
              Services
            </div>
            <div
              className="font-mono mt-2"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            >
              [ VALUE // ACTIVE ]
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 font-mono">
          {/* Terminal frame: static chrome, no reveal delay on content below */}
          <div style={{ opacity: 0.35 }} className="text-sm mb-8 leading-relaxed">
            <div>{`SINAIDA_OS v2.4.1 // CREATIVE SYSTEMS TERMINAL`}</div>
            <div>{`Service modules loaded [████████████] 100%`}</div>
          </div>

          {/* Service blocks — full content renders immediately, no typing/reveal */}
          <div className="space-y-2">
            {SERVICES.map((service, i) => (
              <div key={service.code}>
                <ServiceBlock service={service} />
                {i < SERVICES.length - 1 && (
                  <div className="my-4 font-mono text-sm" style={{ opacity: 0.12 }}>
                    {SEPARATOR}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
