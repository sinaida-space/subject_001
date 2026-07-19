import { useRef } from 'react';
import { Link } from 'react-router-dom';
import XrayHeading from '@/components/XrayHeading';
import { SERVICES, type Service } from '@/data/services';
import { nbsp } from '@/lib/typo';

const SEPARATOR = '────────────────────────────────────────────';

function ServiceBlock({ service }: { service: Service }) {
  return (
    <div className="font-mono text-sm leading-relaxed" style={{ paddingBottom: '1rem' }}>
      <h3 className="font-mono text-base font-medium mt-2 mb-2" style={{ color: 'hsl(var(--accent))' }}>
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
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight text-primary-legible">
              Services
            </XrayHeading>
            <p className="font-mono mt-3 text-[15px] text-foreground/60">
              {nbsp('Digital tools for human connection.')}
            </p>
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
