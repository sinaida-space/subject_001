import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ObfuscatedMailto from '@/components/ObfuscatedMailto';
import { SERVICES } from '@/data/services';
import { FEATURED_WORKS } from '@/data/projects';

const PROCESS_STEPS = [
  { code: '01', label: 'Brief', detail: 'You send the occasion, space, and constraints.' },
  { code: '02', label: 'Concept', detail: 'A visual direction comes back for your feedback.' },
  { code: '03', label: 'Build', detail: 'Systems get built and tested in TouchDesigner.' },
  { code: '04', label: 'Rehearsal', detail: 'On-site or remote tech check against the real rig.' },
  { code: '05', label: 'Show', detail: 'Delivered turnkey, or operated live.' },
];

const TECH_BASICS = ['TouchDesigner', 'GLSL / real-time shaders', 'Audio-reactive systems', 'Generative AI visuals'];

// Third-person boilerplate — written to be copy-pasted verbatim into program
// booklets and press. Facts only: no availability, timeline, or client claims
// beyond the two real credits.
const BOILERPLATE = `Sinaida Krivchenko is a new media artist based in Prague, working globally. Trained as a biomedical engineer and shaped by years of creative direction in the cultural sector, she builds living visual systems for stages, concerts, and performance spaces — real-time TouchDesigner and GLSL work that listens to sound and responds to bodies. Recent work includes Redkie Ptitsy (commissioned live concert visuals, Moscow, 2026) and The Eyes Chico (interactive installation and web experience, with Alisa Feer).`;

function ServiceRow({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  return (
    <div className="pb-8 pt-6 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-baseline gap-4 mb-3">
        <span className="font-mono text-primary-legible shrink-0" style={{ fontSize: 12, letterSpacing: '0.1em' }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="text-lg font-medium text-foreground">
          {service.title}
        </h3>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/[0.87]">
        {service.description}
      </p>
      <p className="text-sm leading-relaxed mt-3 text-foreground/60">
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
      <p className="text-sm leading-relaxed mt-1 text-foreground/60">
        {service.brief}
      </p>
    </div>
  );
}

export default function Collaborate() {
  useEffect(() => {
    document.title = 'Work with me — Sinaida Krivchenko';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      'Work with Sinaida Krivchenko: live audio-reactive visuals for festivals and concerts, responsive scenography capability for theater and dance, immersive installations. Services, process, press kit, and contact.';
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
      <div className="container mx-auto px-6 max-w-4xl">
        <a href="/" className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block">
          ← Back
        </a>

        <div className="font-mono uppercase text-primary-legible mb-2" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
          Collaborate
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-light mb-4">
          Work with <span className="text-primary font-bold">me</span>
        </h1>
        <p className="text-[15px] leading-relaxed mb-4 text-foreground/[0.82]">
          Human first. Digital second. I build living visual systems for stages, concerts, and
          performance spaces — this page is what actually happens if we work together on one.
        </p>
        <p className="text-[14px] leading-relaxed mb-16 text-foreground/60">
          Live visuals and immersive systems for festivals, theaters, dance, venues, and institutions.
        </p>

        {/* Services */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-6">Services</div>
          <div>
            {SERVICES.map((service, i) => (
              <ServiceRow key={service.code} service={service} index={i} />
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-3">Process</div>
          <p className="font-mono text-[13px] leading-relaxed mb-6 text-foreground/55">
            Structured the way I ran technical projects for years before this — brief, concept,
            build, rehearsal, show. Nothing invented for the website.
          </p>
          <div className="flex flex-col md:flex-row gap-6 md:gap-4">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.code} className="flex-1 font-mono">
                <div className="text-primary-legible" style={{ fontSize: 12 }}>{step.code}</div>
                <div className="text-base font-medium mt-1 mb-1 text-foreground">
                  {step.label}
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/60">
                  {step.detail}
                </p>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block mt-4 text-foreground/20">
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
          <div className="font-mono text-[13px] leading-relaxed space-y-4 text-foreground/75">
            <p>
              <span className="text-foreground">Travel — </span>
              Based in Prague, working globally. Touring and international bookings are welcome;
              travel and accommodation are arranged case by case.
            </p>
            <p>
              <span className="text-foreground">Tech rider — </span>
              Typical requirements are a projector or LED surface, a dedicated playback/render machine,
              and a feed from the live audio mix where the work is audio-reactive. Exact specs are
              confirmed once the venue and format are known.
            </p>
            <p>
              <span className="text-foreground">Lead time — </span>
              Depends on set length and scope — confirmed once the brief is in. Earlier is always better.
            </p>
          </div>
        </section>

        {/* Press kit */}
        <section className="mb-20">
          <div className="clinical-label text-primary-legible mb-3">Press kit</div>
          <p className="font-mono text-[13px] leading-relaxed mb-6 text-foreground/55">
            For programmers, promoters, and journalists — boilerplate and stills, ready to paste.
          </p>

          <div className="font-mono text-[14px] leading-[1.85] mb-8 text-foreground/[0.82] border-l-2 border-primary/40 pl-4">
            {BOILERPLATE}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {stills.map((project) => (
              <div key={project.id}>
                {project.image && (
                  <Link to={`/work/${project.id}`} aria-label={`View case study: ${project.title}`}>
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="w-full aspect-square object-cover border border-primary/30"
                    />
                  </Link>
                )}
                <Link
                  to={`/work/${project.id}`}
                  className="block font-mono mt-2 text-foreground/60 hover:text-accent transition-colors"
                  style={{ fontSize: 12 }}
                >
                  {project.title.split('—')[0].trim()}
                </Link>
                <div className="font-mono mt-1 text-foreground/40" style={{ fontSize: 11 }}>
                  {project.tagline}
                </div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[12px] mb-8 text-foreground/40">
            Click a still for the case study.
          </p>

          <ul className="font-mono text-[13px] space-y-2 text-foreground/75">
            {TECH_BASICS.map((item) => (
              <li key={item}>
                <span className="text-primary-legible">{'> '}</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Contact */}
        <section>
          <div className="clinical-label text-primary-legible mb-6">Contact</div>
          <p className="font-mono text-[13px] leading-relaxed mb-4 text-foreground/75">
            Send the occasion, space, and timeline — a reply follows with next steps.
          </p>
          <ObfuscatedMailto
            label="EMAIL ME ↗"
            className="inline-block font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none border border-primary text-primary-legible bg-primary/[0.06]"
          />
        </section>
      </div>
    </div>
  );
}
