import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import ContactChannel from '@/components/ContactChannel';
import { SERVICES } from '@/data/services';
import { FEATURED_WORKS } from '@/data/projects';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useMounted } from '@/lib/hydration';
import { usePageMeta } from '@/hooks/usePageMeta';
import { withProjectNames } from '@/lib/projectNames';
import { BackLink, BODY_CLASS, H1_CLASS, KICKER_CLASS, LEAD_CLASS, PAGE_MAIN_CLASS, PageSection, RuledRows, StillsRow } from '@/components/PageParts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const PROCESS_STEPS = [
  { label: 'Brief', detail: 'You send the occasion and the space: a setlist with tempos and stems, or plans and photos, and what the room’s light does.' },
  { label: 'Concept', detail: 'A visual direction comes back for your feedback.' },
  { label: 'Build', detail: 'Whatever the piece needs: pencil and paper, procedural graphics in TouchDesigner, or agentic coding.' },
  { label: 'Rehearsal', detail: 'Colours and timing are tested against the venue’s light and rig, on site or from photos and video of the room.' },
  { label: 'Handoff', detail: 'Before the live run: final tests and a contingency plan built on a risk check. Support on the day is agreed for each project.' },
  { label: 'Show', detail: 'Delivered ready to run, with a fallback for every file.' },
];

// Third-person boilerplate, written to be copy-pasted verbatim into program
// booklets and press. Facts only: no availability, timeline, or client claims
// beyond the two real credits.
const BOILERPLATE = `Sinaida Krivchenko (she/her) is a new media artist based in Prague, available internationally. She designs visual worlds for stages, concerts and performance spaces that respond to sound and to the bodies in the room. Recent work: Redkie Ptitsy, audio-reactive visuals in TouchDesigner for a live concert in Moscow (2026), and CONSPACE ROOMS, a walk-through labyrinth installation and web experience with UVALISS. She chooses the tools each piece needs, from pencil and paper to procedural graphics in TouchDesigner and agentic coding. Before her art practice: six years of independent cultural projects in Amsterdam, the General Electric IT Leadership Program, and a bachelor’s and a master’s in biomedical engineering from Bauman Moscow State Technical University.`;

// Copies the boilerplate as plain text, so it pastes clean into a programme.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false))}
      className="clinical-label text-primary-legible transition-opacity hover:opacity-70"
    >
      {copied ? 'Copied' : 'Copy boilerplate'}
    </button>
  );
}

const serviceRows = SERVICES.map((service) => ({
  label: service.title,
  value: service.description,
  note: (
    <>
      {service.record.map((part, i) =>
        part.href ? (
          <Link key={i} to={part.href} className="underline transition-colors hover:text-accent">
            {withProjectNames(part.text)}
          </Link>
        ) : (
          <span key={i}>{withProjectNames(part.text)}</span>
        ),
      )}{' '}
      {service.brief}
    </>
  ),
}));

export default function Collaborate() {
  usePageMeta({
    title: 'Work with me | Sinaida Krivchenko',
    description:
      'Have a stage, a space or a site that should answer people? Let’s talk. Audio-reactive concert visuals, interactive web and installations, from Prague.',
    canonical: 'https://sinaida.eu/collaborate/',
  });

  const stills = FEATURED_WORKS.slice(0, 3);
  const { mode } = useRenderMode();
  // the starfield is browser-only, after the first commit
  const mounted = useMounted();

  return (
    <div className="relative min-h-screen bg-background">
      {mode === 'full' && mounted && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className={PAGE_MAIN_CLASS}>
        <BackLink />
        <div className={KICKER_CLASS}>Collaborate</div>
        <h1 className={H1_CLASS}>Work with me</h1>
        {/* The principle in the site's own physics: the human line is light
            (solid, a soft bloom), the digital line is matter (dither dots), set
            a step to the right so it reads as second. No red: red is for action. */}
        <p className="mt-14 font-display uppercase font-light leading-[1.05] tracking-[-0.01em] text-[clamp(28px,3.4vw,48px)]">
          <span className="block text-foreground [text-shadow:0_0_18px_hsl(var(--foreground)/0.35)]">Human first.</span>
          <span className="dither-head block md:ml-[calc(100%*2/12)]" style={{ '--p': 0.3 } as React.CSSProperties}>
            Digital second.
          </span>
        </p>
        <div className="relative isolate">
          <p className={LEAD_CLASS}>
            I build living visual systems for stages, concerts, and performance spaces.
          </p>
          <p className={`${LEAD_CLASS} mt-4! text-foreground/70`}>
            This page is what actually happens when we work together on&nbsp;one.
          </p>
          <p className={`${BODY_CLASS} mt-8 md:ml-[calc(100%*5/12)]`}>
            Around my work I have built my own instruments for agents, from a typography checker to a multi-agent orchestrator that decides, task by task, whether agents work in a chain, side by side or around a shared knowledge graph. I keep up with the research papers the labs publish. Even this website has a door for machines: an MCP server that lets AI assistants read my work first hand.
          </p>
          <p className={`${BODY_CLASS} mt-8 md:ml-[calc(100%*5/12)]`}>
            Live visuals and immersive systems for festivals, theaters, dance, venues, and institutions.
          </p>
        </div>

        <PageSection title="Services">
          <RuledRows rows={serviceRows} className="mt-0" wide={false} />
        </PageSection>

        <PageSection title="Process">
          <p className={BODY_CLASS}>
            I come up with the idea, the concept, and the way to make it into a system. The process
            may include whatever the piece needs, from drawing by hand to AI-native production.
            I care about integrity and a smooth experience, so every work adjusts to its environment.
            Each project ships with a rider and a contingency plan. On-site support is agreed for each project.
          </p>
          <RuledRows rows={PROCESS_STEPS.map((step) => ({ label: step.label, value: step.detail }))} wide={false} />
        </PageSection>

        <PageSection title="Practicalities">
          <RuledRows
            className="mt-0"
            wide={false}
            rows={[
              {
                label: 'Travel',
                value: 'Based in Prague, available internationally.',
                note: 'Touring and international bookings are welcome; travel and accommodation are arranged case by case.',
              },
              {
                label: 'Tech rider',
                value: 'A projector or LED surface, a dedicated playback/render machine, and a feed from the live audio mix where the work is audio-reactive.',
                note: 'Exact specs are confirmed once the venue and format are known.',
              },
              {
                label: 'Lead time',
                value: 'Depends on set length and scope, confirmed once the brief is in.',
                note: 'Earlier is always better.',
              },
            ]}
          />
        </PageSection>

        <PageSection title="Press kit">
          <p className={BODY_CLASS}>
            For programmers, promoters, and journalists: boilerplate and stills ready to
            paste, plus the artist CV as a PDF.
          </p>
          {/* the boilerplate reads as a quotation to copy: set apart, smaller, the name in bold */}
          <blockquote className="mt-8 max-w-[62ch] border-l border-foreground/30 pl-5 font-mono text-[16px] leading-[1.6] text-foreground/90">
            <strong className="font-bold text-foreground">Sinaida Krivchenko</strong>
            {withProjectNames(BOILERPLATE.slice('Sinaida Krivchenko'.length))}
          </blockquote>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <CopyButton text={BOILERPLATE} />
            <a
              href="/files/sinaida-krivchenko-cv.pdf"
              download
              className="clinical-label text-primary-legible transition-opacity hover:opacity-70"
            >
              Artist CV (PDF) ↓
            </a>
          </div>
        </PageSection>

        <div className="mt-16">
          <StillsRow projects={stills} />
        </div>

      </main>
      <ContactChannel question="Read this far? Then you probably have something in mind." />
      <Footer />
    </div>
  );
}
