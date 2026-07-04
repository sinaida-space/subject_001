import { useRef } from 'react';
import { projectById } from '@/data/projects';

// Pull the flagship proof line from the single source of truth in projects.ts,
// so this copy can't drift from the real project data.
const redkiePtitsy = projectById('redkie-ptitsy');
const redkiePtitsyName = redkiePtitsy?.title.split('—')[0].trim();
const redkiePtitsyProof = redkiePtitsy
  ? `${redkiePtitsyName} — 19 unique projections, one per song.`
  : undefined;

const SERVICES = [
  {
    code: 'SRV.001',
    title: 'For music festivals & concerts',
    description:
      'Audio-reactive stage visuals built per song or per set — real-time TouchDesigner systems that listen to the live mix. Delivered as a turnkey show or operated live.',
    leadTime: 'Typical lead time: 4–8 weeks depending on set length.',
    brief: 'Brief to show: send the setlist and stage dimensions.',
    proof: redkiePtitsyProof,
  },
  {
    code: 'SRV.002',
    title: 'For theater & dance',
    description:
      'Responsive scenography: projections that react to performers, sound, and story — from concept with the director through to opening night.',
    leadTime: 'Typical lead time: 8–12 weeks, from first concept meeting.',
    brief: 'Brief to show: send the script or choreography notes and venue specs.',
  },
  {
    code: 'SRV.003',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities — projection-mapped spaces and systems built to run unattended.',
    leadTime: 'Typical lead time: 6–10 weeks depending on scope.',
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];

const SEPARATOR = '────────────────────────────────────────────';

function ServiceBlock({ service }: { service: typeof SERVICES[0] }) {
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
