import { Link } from 'react-router-dom';
import { SERVICES, type Service } from '@/data/services';
import { projectById } from '@/data/projects';
import DitherReveal from './DitherReveal';

// Proof frame per service: the project the record line points at.
const FRAME_PROJECT: Record<string, string> = {
  festivals: 'redkie-ptitsy',
  web: 'aether-currents',
  theater: 'ethereal-path',
  venues: 'conspace-rooms',
};

const linkClass =
  'underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-foreground hover:decoration-[hsl(var(--sinaida-red))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff1a1a]';

function ServiceRow({ service, flip }: { service: Service; flip: boolean }) {
  const project = projectById(FRAME_PROJECT[service.code]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-7 items-center mt-[10vh] md:mt-[16vh] first:mt-[7vh]">
      <div className={flip ? 'md:col-span-7 md:col-start-6 md:row-start-1' : 'md:col-span-6'}>
        <h3
          className="font-mono uppercase font-normal text-foreground text-[25vw] md:text-[clamp(88px,15vw,216px)]"
          style={{ lineHeight: 0.82, letterSpacing: '-0.02em' }}
        >
          {service.word}
        </h3>
        <p className="font-mono mt-7 text-[17px] md:text-[clamp(18px,1.5vw,21px)] leading-[1.6] text-foreground">
          {service.title.replace(/ (\S+)$/, '\u00A0$1')}
        </p>
        <p
          className="font-mono mt-1.5 text-[17px] md:text-[clamp(18px,1.5vw,21px)] leading-[1.6] max-w-[40ch]"
          style={{ color: 'hsl(var(--foreground) / 0.7)' }}
        >
          {service.description}
        </p>
      </div>
      <div className={flip ? 'md:col-span-5 md:col-start-1 md:row-start-1' : 'md:col-span-5 md:col-start-8'}>
        {project?.image && (
          <DitherReveal src={project.image} alt={`${project.title}, project still`} />
        )}
        <p
          className="font-mono mt-3.5 text-sm leading-[1.6] max-w-[52ch]"
          style={{ color: 'hsl(var(--foreground) / 0.65)' }}
        >
          {service.record.map((part, i) =>
            part.href && /^https?:/.test(part.href) ? (
              // Works without a case page link straight to the live piece.
              <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {part.text}
              </a>
            ) : part.href ? (
              <Link key={i} to={part.href} className={linkClass}>
                {part.text}
              </Link>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
      </div>
    </div>
  );
}

export default function ServicesTerminal() {
  return (
    <section id="services" className="relative z-10 py-16 md:py-20">
      <div className="site-frame">
        {/* h2/p (not div) — matches About's, Contact's, and Body of Work's
            own eyebrow+caption markup, so all four sections' labels pick up
            the same sitewide hover glitch/bloom (index.css). */}
        <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 40 }}>
          Services
        </h2>
        <p className="font-mono uppercase mt-2" style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 20 }}>
          Digital tools for human connection.
        </p>

        {SERVICES.map((service, i) => (
          <ServiceRow key={service.code} service={service} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
