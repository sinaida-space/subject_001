import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import DitherReveal from '@/components/DitherReveal';
import { PracticeChips, MadeLine } from '@/components/PracticeChips';
import { DrawnRule, KICKER_CLASS, H2_CLASS, LEAD_CLASS, BODY_CLASS, PAGE_MAIN_CLASS } from '@/components/PageParts';
import NotFound from '@/pages/NotFound';
import { PROJECTS, KIND_LABEL, type Project } from '@/data/projects';
import { PRACTICES, PRACTICE_SHARED_LINE, practiceById, practicePath, type Practice as PracticeT } from '@/data/practices';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useMounted } from '@/lib/hydration';
import { usePageMeta, SITE_NAME } from '@/hooks/usePageMeta';

const ParticleField = lazy(() => import('@/components/ParticleField'));

// Practice pages: one page per practice tag, listing every work in
// it, plus an index of all practices at /practice. Their job is finding work
// and moving between practices; every row links on to its case and its other
// practices. Prerendered by scripts/lib/site-data.mjs.

const TITLE_CLASS = 'mt-3 font-display text-[clamp(2.5rem,7vw,6rem)] uppercase font-light leading-[0.95] tracking-[-0.02em] text-foreground';

const worksIn = (id: PracticeT['id']): Project[] => PROJECTS.filter((p) => p.practices.includes(id));

function WorkRow({ project, current }: { project: Project; current: PracticeT['id'] }) {
  const to = `/work/${project.id}`;
  return (
    <li className="relative grid grid-cols-1 gap-6 py-8 md:grid-cols-12">
      <DrawnRule className="top-0" />
      <Link to={to} className="block md:col-span-4" tabIndex={-1} aria-hidden="true">
        {project.image && <DitherReveal src={project.image} alt="" aspect={4 / 3} touch={false} />}
      </Link>
      <div className="flex flex-col gap-3 md:col-span-8">
        <span className={KICKER_CLASS}>{KIND_LABEL[project.kind]}</span>
        <h2 className="font-display text-[clamp(28px,3vw,44px)] uppercase leading-[1.05] text-foreground">
          <Link to={to} className="transition-colors hover:text-accent">
            {project.title}
          </Link>
        </h2>
        <p className="font-mono text-[17px] leading-snug text-foreground/80">{project.tagline}</p>
        <MadeLine project={project} />
        <PracticeChips ids={project.practices} current={current} />
      </div>
    </li>
  );
}

function PracticeIndex() {
  usePageMeta({
    title: `Practices | ${SITE_NAME}`,
    description: PRACTICES.map((p) => p.label).join(', ') + '.',
    canonical: 'https://sinaida.eu/practice/',
  });
  return (
    <>
      <h1 className={TITLE_CLASS}>Practices</h1>
      <p className={`${BODY_CLASS} mt-8`}>{PRACTICE_SHARED_LINE}</p>
      <ul className="relative mt-12">
        {PRACTICES.map((p) => (
          <li key={p.id} className="relative grid grid-cols-1 gap-2 py-6 md:grid-cols-12 md:gap-6">
            <DrawnRule className="top-0" />
            <h2 className="font-display text-[clamp(24px,2.6vw,36px)] uppercase leading-[1.05] md:col-span-5">
              <Link to={practicePath(p.id)} className="text-foreground transition-colors hover:text-accent">
                {p.label}
              </Link>
            </h2>
            <p className="font-mono text-[17px] leading-snug text-foreground/80 md:col-span-5">{p.description}</p>
            <p className="font-mono text-[16px] uppercase tracking-[0.15em] text-foreground/60 md:col-span-2 md:text-right">
              {worksIn(p.id).length} works
            </p>
          </li>
        ))}
        <DrawnRule className="bottom-0" />
      </ul>
    </>
  );
}

function PracticeDetail({ practice }: { practice: PracticeT }) {
  usePageMeta({
    title: `${practice.label} · Practice | ${SITE_NAME}`,
    description: `${practice.description} ${PRACTICE_SHARED_LINE}`,
    canonical: `https://sinaida.eu/practice/${practice.id}/`,
  });
  const works = worksIn(practice.id);
  const others = PRACTICES.filter((p) => p.id !== practice.id).map((p) => p.id);
  return (
    <>
      <Link to="/practice" className="clinical-label mb-10 inline-block text-primary-legible transition-colors hover:text-accent">
        ← All practices
      </Link>
      <p className={KICKER_CLASS}>Practice</p>
      <h1 className={TITLE_CLASS}>{practice.label}</h1>
      <p className={LEAD_CLASS}>{practice.description}</p>
      <p className={`${BODY_CLASS} mt-6 md:ml-[calc(100%*5/12)]`}>{PRACTICE_SHARED_LINE}</p>
      <p className="mt-16 font-mono text-[16px] uppercase tracking-[0.15em] text-foreground/60">
        {works.length} {works.length === 1 ? 'work' : 'works'}
      </p>
      <ul className="relative mt-4">
        {works.map((w) => (
          <WorkRow key={w.id} project={w} current={practice.id} />
        ))}
        <DrawnRule className="bottom-0" />
      </ul>

      <section className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-12">
        <h2 className={`${H2_CLASS} md:col-span-5`}>Work with me</h2>
        <div className="flex flex-col gap-4 md:col-span-7">
          {practice.lane && <p className="font-mono text-[19px] uppercase tracking-[0.12em] text-foreground/85">{practice.lane}</p>}
          <Link to="/collaborate" className="w-fit font-mono text-[20px] uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70">
            Get in touch →
          </Link>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="clinical-label mb-4 text-foreground/65">Other practices</h2>
        <PracticeChips ids={others} className="" />
      </section>
    </>
  );
}

export default function Practice() {
  const { slug } = useParams();
  const { mode } = useRenderMode();
  // the starfield is browser-only, after the first commit
  const mounted = useMounted();
  const practice = slug ? practiceById(slug) : undefined;
  if (slug && !practice) return <NotFound />;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {mode === 'full' && mounted && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className={PAGE_MAIN_CLASS}>
        {practice ? <PracticeDetail practice={practice} /> : <PracticeIndex />}
      </main>
      <ContactChannel />
      <Footer />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
