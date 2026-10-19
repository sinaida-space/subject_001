import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import StatementRoom from '@/components/StatementRoom';
import StatementCases from '@/components/StatementCases';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import { FEATURED_WORKS } from '@/data/projects';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useMounted } from '@/lib/hydration';
import { usePageMeta } from '@/hooks/usePageMeta';
import { BackLink, BODY_CLASS, DitherHeading, H1_CLASS, H2_CLASS, LEAD_CLASS, PAGE_MAIN_CLASS, StillsRow } from '@/components/PageParts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const LEDE =
  'I work in concept and experience design: visual worlds where light, sound, movement and people meet in one room.';

// One block per paragraph: in full mode each hangs at its own depth in the room.
const PARAGRAPHS = [
  'Every language I learned well enough to be fluent in still had a territorial border around it. A body moving in a room has never needed that permission, and neither has light or sound. And no room makes sense if there is nobody in it. What I want out of a piece is a shared memory, something a group of strangers can carry out of a space together, having arrived at it without a common vocabulary.',
  'My background in engineering gave me a fascination with systems; ballet has taught me to listen to my body and to feel the space around me. Today I create experiences where technology and the human soul share one world. I build the structure, and the audience completes the work.',
];

const CLOSING = [
  'Technology is my material, and people are my subject. In practice, the machines draft and I decide what stays. This is what I see in my work and what I aim for: new meanings that neither people nor machines would reach alone.',
];

const BLOCKS = [LEDE, ...PARAGRAPHS, ...CLOSING];
// in the room paragraph 1 fills the screen in three short parts
const ACCENT_PARTS = [
  'Every language I learned well enough to be fluent in still had a territorial border around it.',
  'A body moving in a room has never needed that permission, and neither has light or sound. And no room makes sense if there is nobody in it.',
  'What I want out of a piece is a shared memory, something a group of strangers can carry out of a space together, having arrived at it without a common vocabulary.',
];
// the lead and the closing read larger; in the room they keep the text column
const ROOM_LEAD_CLASS = 'font-mono text-[clamp(22px,2.2vw,30px)] leading-[1.3] text-foreground';
// paragraph 1 fills the screen as it comes out of the opening world
// the closing paragraph is the statement's highlight, centred
const ROOM_CLOSING_CLASS = 'font-mono text-center text-[clamp(24px,2.3vw,36px)] leading-[1.32] text-foreground';
const ROOM_ACCENT_CLASS = 'font-display text-[clamp(28px,3.1vw,52px)] leading-[1.12] tracking-[-0.01em] text-foreground';

const Statement = () => {
  usePageMeta({
    title: 'Statement | Sinaida Krivchenko',
    description:
      'Why she makes responsive visual systems: a language that needs no translation, engineering structure and ballet listening, and the audience that completes the work.',
    canonical: 'https://sinaida.eu/statement/',
  });

  const { mode } = useRenderMode();
  // the starfield is browser-only, after the first commit (studio#27)
  const mounted = useMounted();
  const works = FEATURED_WORKS.slice(0, 3);

  const interactive = mode === 'full';
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {mode === 'full' && mounted && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className={PAGE_MAIN_CLASS}
      >
        <BackLink />

        {/* in full mode on desktop the title is drawn in stars by the room's scene */}
        <h1 className={interactive ? `${H1_CLASS} md:sr-only` : H1_CLASS}>
          Statement<span className="sr-only"> by Sinaida Krivchenko</span>
        </h1>

        {interactive ? (
          // full mode: the statement as a room in the star field
          <StatementRoom
            blocks={BLOCKS}
            bodyClass={BODY_CLASS}
            leadClass={ROOM_LEAD_CLASS}
            accentClass={ROOM_ACCENT_CLASS}
            closingClass={ROOM_CLOSING_CLASS}
            accentParts={ACCENT_PARTS}
            accentMark="shared memory"
            accentGather={[['light'], ['sound'], ['memory']]}
            gather={{ 2: ['soul', 'systems'], 3: ['human', 'machine'] }}
            finale={<StatementCases projects={works} ditherIn />}
          />
        ) : (
          <>
              <p className={`${LEAD_CLASS} mb-16`}>
                {LEDE}
              </p>
              <div className="space-y-8 mb-12 md:ml-[calc(100%*5/12)]">
                {[...PARAGRAPHS, ...CLOSING].map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className={BODY_CLASS}>
                    {paragraph}
                  </p>
                ))}
              </div>
          </>
        )}

        {/* Selected cases; in the room they are its last scene */}
        {!interactive && (
          <section className="mt-28 mb-16">
            <DitherHeading className={`${H2_CLASS} mb-10`}>Selected cases</DitherHeading>
            <StillsRow projects={works} />
          </section>
        )}

        {/* in the room the cases carry the two ways on themselves */}
        {!interactive && (
          <>
          {/* Both endings of the page sit in one row: where to go next, and the
              record to take away. Same clinical-label treatment, so neither reads
              as the primary action over the other. */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link
              to="/collaborate"
              className="clinical-label text-primary-legible hover:text-accent transition-colors inline-block"
            >
              Work with me →
            </Link>
            <a
              href="/files/sinaida-krivchenko-cv.pdf"
              download
              className="clinical-label text-primary-legible hover:text-accent transition-colors inline-block"
            >
              Artist CV (PDF) ↓
            </a>
          </div>
          </>
        )}
      </main>
      <ContactChannel question="Thoughts, ideas, or a shared memory to keep or to make?" />
      <Footer />
    </div>
  );
};

export default Statement;
