import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import { FEATURED_WORKS } from '@/data/projects';
import { useRenderMode } from '@/hooks/useRenderMode';
import { usePageMeta } from '@/hooks/usePageMeta';
import { BackLink, BODY_CLASS, DitherHeading, H1_CLASS, H2_CLASS, KICKER_CLASS, LEAD_CLASS, PAGE_MAIN_CLASS, StillsRow } from '@/components/PageParts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const LEDE =
  'I work in concept and experience design: visual worlds where light, sound, movement and people meet in one room.';

const PARAGRAPHS = [
  'Every language I learned well enough to be fluent in still had a territorial border around it. A body moving in a room has never needed that permission, and neither has light or sound. And no room makes sense if there is nobody in it. What I want out of a piece is a shared memory, something a group of strangers can carry out of a space together, having arrived at it without a common vocabulary.',
  'My background in engineering gave me a fascination with systems; ballet has taught me to listen to my body and to feel the space around me. Today I create experiences where technology and the human soul share one world. I build the structure, and the audience completes the work.',
];

const CLOSING = [
  'Technology is my material, and people are my subject. In practice, the machines draft and I decide what stays. This is what I see in my work and what I aim for: new meanings that neither people nor machines would reach alone.',
];

const Statement = () => {
  usePageMeta({
    title: 'Statement | Sinaida Krivchenko',
    description:
      'Why she makes responsive visual systems: a language that needs no translation, engineering structure and ballet listening, and the audience that completes the work.',
    canonical: 'https://sinaida.eu/statement/',
  });

  const { mode } = useRenderMode();
  const works = FEATURED_WORKS.slice(0, 3);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {mode === 'full' && (
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

        <h1 className={H1_CLASS}>
          Statement<span className="sr-only"> by Sinaida Krivchenko</span>
        </h1>

        <p className={`${LEAD_CLASS} mb-16`}>{LEDE}</p>
        <div className="space-y-8 mb-12 md:ml-[calc(100%*5/12)]">
          {[...PARAGRAPHS, ...CLOSING].map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className={BODY_CLASS}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Selected cases */}
        <section className="mt-28 mb-16">
          <DitherHeading className={`${H2_CLASS} mb-10`}>Selected cases</DitherHeading>
          <StillsRow projects={works} />
        </section>

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
      </main>
      <ContactChannel question="Thoughts, ideas, or a shared memory to keep or to make?" />
      <Footer />
    </div>
  );
};

export default Statement;
