import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SERVICES, type Service } from '@/data/services';

const SEPARATOR = '────────────────────────────────────────────';

function ServiceBlock({ service }: { service: Service }) {
  return (
    <div className="font-mono text-sm leading-relaxed" style={{ paddingBottom: '1rem' }}>
      <h3 className="font-mono uppercase text-base font-medium mt-2 mb-2 text-primary-legible">
        {service.title}
      </h3>
      <p className="font-mono text-[13px] leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
        {service.description}
      </p>
      <p className="font-mono text-[13px] leading-relaxed mt-2" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
        {service.record.map((part, i) =>
          part.href ? (
            <Link key={i} to={part.href} className="underline hover:text-accent transition-colors">
              {part.text}
            </Link>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
      <p className="font-mono text-[13px] leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
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
          <div className="md:w-[280px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <div
              className="font-mono uppercase text-primary-legible"
              style={{ letterSpacing: '0.2em', fontSize: 24 }}
            >
              Services
            </div>
            <div
              className="font-mono mt-2"
              style={{ color: 'hsl(var(--foreground) / 0.6)', fontSize: 16 }}
            >
              Digital tools for human connection.
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 font-mono">
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
