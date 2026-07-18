import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SERVICES, type Service } from '@/data/services';

// Ruled Swiss-table row: service name in bold Archivo on the left, the
// description/record/brief copy on the right, separated by a hairline.
function ServiceRow({ service, isFirst }: { service: Service; isFirst: boolean }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 py-8"
      style={{ borderTop: isFirst ? undefined : '1px solid hsl(var(--border))' }}
    >
      <h3 className="md:col-span-4 font-display font-bold text-lg md:text-xl leading-snug" style={{ color: 'hsl(var(--accent))' }}>
        {service.title}
      </h3>
      <div className="md:col-span-8">
        <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
          {service.description}
        </p>
        <p className="text-[14px] leading-relaxed mt-3" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
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
        <p className="text-[14px] leading-relaxed mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
          {service.brief}
        </p>
      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:col-span-2 md:sticky md:top-[15vh] md:self-start">
            <div className="font-display font-medium text-primary-legible" style={{ letterSpacing: 0, fontSize: 13 }}>
              Services
            </div>
            <div className="font-display mt-2" style={{ color: 'hsl(var(--foreground) / 0.4)', fontSize: 13 }}>
              [ VALUE // ACTIVE ]
            </div>
          </div>

          {/* RIGHT COLUMN — ruled table, one hairline-separated row per service */}
          <div className="md:col-span-10">
            {SERVICES.map((service, i) => (
              <ServiceRow key={service.code} service={service} isFirst={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
