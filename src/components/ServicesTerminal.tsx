import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SERVICES, type Service } from '@/data/services';

function ServiceBlock({ service, index }: { service: Service; index: number }) {
  return (
    <div
      className="pb-8 pt-6 border-t"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-baseline gap-4 mb-3">
        <span
          className="font-mono text-primary-legible shrink-0"
          style={{ fontSize: 12, letterSpacing: '0.1em' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="text-lg md:text-xl font-medium" style={{ color: 'hsl(var(--accent))' }}>
          {service.title}
        </h3>
      </div>
      <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
        {service.description}
      </p>
      <p className="text-sm leading-relaxed mt-3" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
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
      <p className="text-sm leading-relaxed mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">
            {SERVICES.map((service, i) => (
              <ServiceBlock key={service.code} service={service} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
