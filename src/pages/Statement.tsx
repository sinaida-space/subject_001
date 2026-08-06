import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DitheredThumb from '@/components/DitheredThumb';
import ScrambleText from '@/components/ScrambleText';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FEATURED_WORKS } from '@/data/projects';
import { useRenderMode } from '@/hooks/useRenderMode';
import { usePageMeta } from '@/hooks/usePageMeta';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const LEDE =
  'I create responsive visual systems where light, sound, movement and human presence become a shared experience.';

// Split into blocks so the scramble can cascade down the page instead of
// flipping everything at once. Order here is the order it sweeps.
const PARAGRAPHS = [
  'Every language I learned well enough to be fluent in still had a territorial border around it. A body moving in a room has never needed that permission, and neither has light or sound. And no room makes sense if there is nobody in it. What I want out of a piece is a shared memory, something a group of strangers can carry out of a space together, having arrived at it without a common vocabulary.',
  'My background in engineering gave me a fascination with systems; ballet taught me to listen to bodies, spaces and other people. I build the rules, and the audience completes the work. A force I write makes particles fall and the whole causal chain stays in my hands, until somebody walks in and it stops resolving the way I planned. The small glitches are where that shows, and they are the reason the whole thing reads as living.',
];

const CLOSING = [
  'The machine can do almost all of this alone. The person standing in front of it is the reason any of it ever happens. We are still a biological species and we still need each other, and we are losing the thread to other people and to ourselves at the same speed. My work is here to put humans back in a room with other humans, and to give them something that only opens if they move.',
  'If a machine can generate a thousand images while you sleep, what were we valuing in a picture all along? If a system returns something nobody specified, whose work is it? When a projection answers your movement, are you the audience or the instrument?',
];

const BODY_CLASS = 'font-mono text-[15px] leading-[1.8] text-foreground/[0.87]';

const Statement = () => {
  usePageMeta({
    title: 'Statement | Sinaida Krivchenko',
    description:
      'Why she builds responsive visual systems: a language that needs no translation, engineering structure and ballet listening, and the audience that completes the work.',
    canonical: 'https://sinaida.eu/statement/',
  });

  const { mode } = useRenderMode();
  const works = FEATURED_WORKS.slice(0, 3);

  // 0 means "no run has happened". Every trigger bumps it, and the blocks
  // below each start a fresh sweep off the new value.
  const [runId, setRunId] = useState(0);
  const runningUntil = useRef(0);

  const trigger = useCallback(() => {
    // Lite mode covers prefers-reduced-motion, low memory, no WebGL. There the
    // heading is just a heading.
    if (mode !== 'full') return;
    const now = performance.now();
    if (now < runningUntil.current) return;
    runningUntil.current = now + 1800;
    setRunId((n) => n + 1);
  }, [mode]);

  const interactive = mode === 'full';

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {mode === 'full' && (
        <Suspense fallback={null}>
          <ParticleField subtle />
        </Suspense>
      )}
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="container relative z-10 mx-auto px-6 max-w-4xl pt-40 pb-24 md:pt-32 lg:pt-36"
      >
        <a
          href="/"
          className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block"
        >
          ← Back
        </a>

        {/* The heading is the only control on the page. Hover fires it on
            desktop, tap and keyboard fire it everywhere, and a <button> gets
            the keyboard and screen-reader semantics for free. */}
        <button
          type="button"
          onMouseEnter={interactive ? trigger : undefined}
          onClick={trigger}
          onFocus={interactive ? trigger : undefined}
          aria-label="Replay the statement reveal"
          className="block w-full text-left bg-transparent border-0 p-0 mb-6 cursor-none"
        >
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl uppercase font-light leading-[1.05]">
            Sinaida <span className="text-primary font-bold">Krivchenko</span>
          </h1>
        </button>

        <p className={`font-mono text-[28px] leading-relaxed mb-16 text-foreground/60`}>
          <ScrambleText text={LEDE} runId={runId} delayMs={0} />
        </p>

        <div className="space-y-8 mb-12">
          {PARAGRAPHS.map((paragraph, i) => (
            <p key={paragraph.slice(0, 24)} className={BODY_CLASS}>
              <ScrambleText text={paragraph} runId={runId} delayMs={120 + i * 110} />
            </p>
          ))}

          {/* Kept out of the array: this one carries the two case-study links,
              so it is composed from segments that share the same sweep. */}
          <p className={BODY_CLASS}>
            <ScrambleText
              text="My work is structured by code and amplified by the people who interact with it. I build motion-reactive and audio-responsive experiences. For the band "
              runId={runId}
              delayMs={340}
            />
            <Link
              to="/work/redkie-ptitsy"
              className="text-primary-legible hover:text-accent transition-colors"
            >
              Redkie Ptitsy
            </Link>
            <ScrambleText
              text=" I created a full set of live visuals in TouchDesigner, nine projections, one per song. "
              runId={runId}
              delayMs={400}
            />
            <Link
              to="/work/the-eyes-chico"
              className="text-primary-legible hover:text-accent transition-colors"
            >
              The Eyes Chico
            </Link>
            <ScrambleText
              text=" started as a conversation with a fellow artist and became a room filled with red light, where you steer a soul across a field of poppies and explore questions about yourself."
              runId={runId}
              delayMs={460}
            />
          </p>

          {CLOSING.map((paragraph, i) => (
            <p key={paragraph.slice(0, 24)} className={BODY_CLASS}>
              <ScrambleText text={paragraph} runId={runId} delayMs={560 + i * 110} />
            </p>
          ))}
        </div>

        {/* Selected cases */}
        <section className="mb-16">
          <h2 className="clinical-label text-primary-legible mb-6">Selected cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {works.map((project) => (
              <div key={project.id}>
                {project.image && (
                  <Link to={`/work/${project.id}`} aria-label={`View case study: ${project.title}`}>
                    <DitheredThumb
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="w-full aspect-square object-cover border border-primary/30"
                    />
                  </Link>
                )}
                <Link
                  to={`/work/${project.id}`}
                  className="block font-mono uppercase mt-2 text-foreground/60 hover:text-accent transition-colors"
                  style={{ fontSize: 20 }}
                >
                  {project.title}
                </Link>
                <div className="font-mono mt-1 text-foreground/60" style={{ fontSize: 20 }}>
                  {project.tagline}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Link
          to="/collaborate"
          className="clinical-label text-primary-legible hover:text-accent transition-colors inline-block"
        >
          Work with me →
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default Statement;
