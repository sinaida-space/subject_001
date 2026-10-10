import { Link } from 'react-router-dom';
import { SERVICES, type Service } from '@/data/services';
import { projectById } from '@/data/projects';
import { useRenderMode } from '@/hooks/useRenderMode';
import DitherReveal from './DitherReveal';
import ServicesTesseract from './ServicesTesseract';

const NBSP = ' ';

const linkClass =
  'underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-foreground hover:decoration-[hsl(var(--sinaida-red))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff1a1a]';

// One service: word, title, short line, the project still and its caption.
// `fit` sizes it to rest inside one 100svh screen (full mode, tesseract).
function ServiceScreen({ service, flip, fit }: { service: Service; flip: boolean; fit: boolean }) {
  const project = projectById(service.caption.project);
  const name = (project?.title ?? service.caption.project).replace(/ /g, NBSP);
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 md:gap-y-7 items-center">
      <div className={flip ? 'md:col-span-6 md:col-start-7 md:row-start-1' : 'md:col-span-6'}>
        <h3
          className="font-mono uppercase font-normal text-foreground text-[18vw] md:text-[clamp(56px,7.5vw,132px)]"
          style={{ lineHeight: 0.82, letterSpacing: '-0.02em' }}
        >
          {service.word}
        </h3>
        <p className="font-mono mt-4 md:mt-6 text-[16px] md:text-[clamp(16px,1.25vw,19px)] leading-[1.55] text-foreground">
          {service.title.replace(/ (\S+)$/, `${NBSP}$1`)}
        </p>
        <p
          className="font-mono mt-1 text-[16px] md:text-[clamp(16px,1.25vw,19px)] leading-[1.55] max-w-[44ch]"
          style={{ color: 'hsl(var(--foreground) / 0.7)' }}
        >
          {service.short}
        </p>
      </div>
      <div className={flip ? 'md:col-span-5 md:col-start-1 md:row-start-1' : 'md:col-span-5 md:col-start-8'}>
        {project?.image && (
          <DitherReveal
            src={project.image}
            alt={`${project.title}, project still`}
            className={
              fit
                ? `w-full max-h-[34svh] max-w-[calc(34svh*4/3)] md:max-h-[58svh] md:max-w-[calc(58svh*4/3)] ${flip ? '' : 'md:ml-auto'}`
                : ''
            }
          />
        )}
        <p
          className={`font-mono mt-2.5 text-sm leading-[1.55] ${fit && !flip ? 'md:text-right' : ''}`}
          style={{ color: 'hsl(var(--foreground) / 0.55)' }}
        >
          <Link to={`/work/${service.caption.project}`} className={linkClass}>
            {name}
          </Link>
          {`${NBSP}· ${service.caption.text}`}
        </p>
      </div>
    </div>
  );
}

export default function ServicesTerminal() {
  const full = useRenderMode().mode === 'full';
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

        {!full &&
          SERVICES.map((service, i) => (
            <div key={service.code} className="mt-[10vh] md:mt-[16vh] first:mt-[7vh]">
              <ServiceScreen service={service} flip={i % 2 === 1} fit={false} />
            </div>
          ))}
      </div>

      {full && (
        <ServicesTesseract>
          {SERVICES.map((service, i) => (
            <ServiceScreen key={service.code} service={service} flip={i % 2 === 1} fit />
          ))}
        </ServicesTesseract>
      )}
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
