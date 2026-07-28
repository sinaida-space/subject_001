import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import ObfuscatedMailto from '@/components/ObfuscatedMailto';
import VideoEmbed from '@/components/VideoEmbed';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionBreak from '@/components/SectionBreak';
import SignalMark from '@/components/SignalMark';
import { useRenderMode } from '@/hooks/useRenderMode';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  EXPERIENCES_META,
  DARIA_PROJECTS,
  SINAIDA_VIDEOS,
  EXPERIENCES_STATS,
  EXPERIENCES_SECTIONS,
  type ExperienceProject,
  type ExperienceSection,
  type ExperienceRichSection,
  type RichTextPart,
} from '@/data/experiences';

const ParticleField = lazy(() => import('@/components/ParticleField'));

function GoldenBlock({ level, label, text }: { level: 1 | 2 | 3; label: string; text: string }) {
  return (
    <div>
      <SignalMark level={level} />
      <span className="sr-only">{label}</span>
      <p className="font-mono text-[15px] leading-[1.8] text-foreground/[0.87] mt-2">{text}</p>
    </div>
  );
}

// Renders a rich-text paragraph: plain parts as text, linked parts as
// internal (react-router) or external links. Mirrors the pattern used by
// SERVICES[].record in Collaborate.tsx.
function RichParagraph({ parts }: { parts: RichTextPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (!part.href) return <span key={i}>{part.text}</span>;
        if (part.href.startsWith('/')) {
          return (
            <Link key={i} to={part.href} className="underline hover:text-accent transition-colors">
              {part.text}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent transition-colors"
          >
            {part.text}
          </a>
        );
      })}
    </>
  );
}

function RichTextBlock({ section, highlight }: { section: ExperienceRichSection; highlight?: boolean }) {
  return (
    <section className="mb-20">
      <h2 className="clinical-label text-primary-legible mb-6">{section.heading}</h2>
      <div className="space-y-4">
        {section.paragraphs.map((parts, i) => (
          <p
            key={i}
            className={
              highlight && i === 0
                ? 'font-mono text-[15px] leading-[1.8] text-foreground/[0.87] border-l-2 border-primary/40 pl-4'
                : 'font-mono text-[15px] leading-[1.8] text-foreground/[0.87]'
            }
          >
            <RichParagraph parts={parts} />
          </p>
        ))}
      </div>
    </section>
  );
}

function ProjectGallery({ project }: { project: ExperienceProject }) {
  return (
    <div className="mb-14">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-4 font-mono">
        <h3 className="text-foreground text-base font-medium">{project.title}</h3>
        <div className="text-[13px] text-foreground/60">
          {project.client} · {project.detail}
        </div>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={`${project.title} gallery`}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6"
      >
        {project.images.map((img) => {
          const avif = img.src.replace(/\.jpg$/, '.avif');
          return (
            <picture
              key={img.src}
              className="shrink-0 snap-start w-[68vw] sm:w-[38%] lg:w-[31%] aspect-[4/3] border border-primary/30 block"
            >
              <source srcSet={avif} type="image/avif" />
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                width={800}
                height={600}
                className="h-full w-full object-cover"
              />
            </picture>
          );
        })}
      </div>
    </div>
  );
}

function SectionBlock({ section, highlight }: { section: ExperienceSection; highlight?: boolean }) {
  return (
    <section className="mb-20">
      <h2 className="clinical-label text-primary-legible mb-6">{section.heading}</h2>
      <div className="space-y-4">
        {section.paragraphs.map((p, i) => (
          <p
            key={i}
            className={
              highlight && i === 0
                ? 'font-mono text-[15px] leading-[1.8] text-foreground/[0.87] border-l-2 border-primary/40 pl-4'
                : 'font-mono text-[15px] leading-[1.8] text-foreground/[0.87]'
            }
          >
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function StatRow() {
  return (
    <section className="mb-20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {EXPERIENCES_STATS.map((stat) => (
          <div
            key={stat.label}
            style={{ border: '1px solid hsl(var(--sinaida-red))', background: 'hsl(var(--sinaida-red) / 0.05)', padding: '20px' }}
          >
            <div className="font-display text-5xl leading-none text-primary">{stat.value}</div>
            <p className="mt-2 font-mono text-[13px] leading-relaxed text-foreground/65">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Experiences() {
  usePageMeta({
    title: 'Experiences · Sinaida Krivchenko and Daria Blokhina',
    description:
      'Exhibition and event spaces where the physical structure and the real-time interactive system are designed as one brief. Daria Blokhina builds the space, Sinaida Krivchenko builds the system.',
    canonical: 'https://sinaida.eu/experiences/',
  });

  const { mode } = useRenderMode();
  const s = EXPERIENCES_SECTIONS;

  return (
    <div className="relative min-h-screen bg-background">
      {mode === 'full' && (
        <Suspense fallback={null}>
          <ParticleField subtle />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className="container relative z-10 mx-auto px-6 max-w-4xl pt-40 pb-24 md:pt-32 lg:pt-36">
        <a href="/" className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block">
          ← Back
        </a>

        <div className="font-mono uppercase text-primary-legible mb-2" style={{ letterSpacing: '0.2em', fontSize: 30 }}>
          Experiences
        </div>
        <h1 className="font-display text-7xl md:text-8xl uppercase font-light mb-4">
          {EXPERIENCES_META.headlineLead}{' '}
          <span className="text-primary font-bold">{EXPERIENCES_META.headlineAccent}</span>
        </h1>
        <p className="font-mono text-[15px] leading-[1.8] mb-4 text-foreground/[0.87]">
          {EXPERIENCES_META.whoLine}
        </p>
        <p className="font-mono text-[15px] leading-[1.8] mb-16 text-foreground/60">
          {EXPERIENCES_META.hook}
        </p>

        {/* Why / How / What */}
        <section className="mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <GoldenBlock level={1} label="Why" text={EXPERIENCES_META.golden.why} />
            <GoldenBlock level={2} label="How" text={EXPERIENCES_META.golden.how} />
            <GoldenBlock level={3} label="What" text={EXPERIENCES_META.golden.what} />
          </div>
        </section>

        {/* Daria's work */}
        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Daria’s work</h2>
          {DARIA_PROJECTS.map((project) => (
            <ProjectGallery key={project.id} project={project} />
          ))}
        </section>

        <StatRow />

        {/* Sinaida's work */}
        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Sinaida’s work</h2>
          <div className="space-y-14">
            {SINAIDA_VIDEOS.map((video) => (
              <div key={video.id}>
                <VideoEmbed id={video.id} title={video.title} maxHeightVh={60} />
                <div className="font-mono uppercase mt-4 text-foreground" style={{ fontSize: 15 }}>
                  {video.title}
                </div>
                <p className="font-mono text-[13px] leading-relaxed mt-2 mb-2 text-foreground/60">
                  {video.caption}
                </p>
                <Link
                  to={video.caseHref}
                  className="font-mono text-[13px] uppercase text-primary-legible hover:text-accent transition-colors"
                >
                  View the full case →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Act one: the argument */}
        <SectionBlock section={s.execSummary} />
        <SectionBlock section={s.problem} />

        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Before / after</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="font-mono uppercase text-foreground/60 mb-2" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                Before
              </div>
              <p className="font-mono text-[15px] leading-[1.8] text-foreground/[0.87]">{s.beforeAfter.before}</p>
            </div>
            <div>
              <div className="font-mono uppercase text-primary-legible mb-2" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                After
              </div>
              <p className="font-mono text-[15px] leading-[1.8] text-foreground/[0.87]">{s.beforeAfter.after}</p>
            </div>
          </div>
        </section>

        <SectionBlock section={s.clientBenefit} highlight />

        <SectionBreak />

        {/* Act two: the plan */}
        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Goal</h2>
          <p className="font-mono text-[15px] leading-[1.8] mb-6 text-foreground/[0.87]">{s.goal.statement}</p>
          <div className="overflow-x-auto">
            <table className="font-mono text-[13px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left border-b border-foreground/10 py-2 pr-4 text-foreground/60 font-medium">Description</th>
                  <th className="text-left border-b border-foreground/10 py-2 pr-4 text-foreground/60 font-medium">Target</th>
                  <th className="text-left border-b border-foreground/10 py-2 text-foreground/60 font-medium">Measure</th>
                </tr>
              </thead>
              <tbody>
                {s.goal.ctqs.map((ctq, i) => (
                  <tr key={i}>
                    <td className="border-b border-foreground/10 py-2 pr-4 text-foreground/75 align-top">{ctq.description}</td>
                    <td className="border-b border-foreground/10 py-2 pr-4 text-foreground/75 align-top">{ctq.target}</td>
                    <td className="border-b border-foreground/10 py-2 text-foreground/75 align-top">{ctq.measure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Scope</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="font-mono uppercase text-primary-legible mb-3" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                In scope
              </div>
              <ul className="font-mono text-[13px] space-y-2 text-foreground/75">
                {s.scope.inScope.map((item, i) => (
                  <li key={i}>
                    <span className="text-primary-legible">{'> '}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono uppercase text-foreground/60 mb-3" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                Out of scope
              </div>
              <ul className="font-mono text-[13px] space-y-2 text-foreground/60">
                {s.scope.outScope.map((item, i) => (
                  <li key={i}>
                    <span className="text-foreground/40">{'> '}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <SectionBlock section={s.differentiation} />
        <RichTextBlock section={s.progress} highlight />
        <RichTextBlock section={s.team} />

        <SectionBreak />

        {/* Act three: the practicalities */}
        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="font-mono uppercase text-primary-legible mb-3" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                Have
              </div>
              <ul className="font-mono text-[13px] space-y-2 text-foreground/75">
                {s.resources.have.map((item, i) => (
                  <li key={i}>
                    <span className="text-primary-legible">{'> '}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono uppercase text-foreground/60 mb-3" style={{ letterSpacing: '0.15em', fontSize: 13 }}>
                Need
              </div>
              <ul className="font-mono text-[13px] space-y-2 text-foreground/60">
                {s.resources.need.map((item, i) => (
                  <li key={i}>
                    <span className="text-foreground/40">{'> '}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="clinical-label text-primary-legible mb-6">Risks</h2>
          <div className="overflow-x-auto">
            <table className="font-mono text-[13px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left border-b border-foreground/10 py-2 pr-4 text-foreground/60 font-medium">Risk</th>
                  <th className="text-left border-b border-foreground/10 py-2 pr-4 text-foreground/60 font-medium">Level</th>
                  <th className="text-left border-b border-foreground/10 py-2 text-foreground/60 font-medium">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {s.risks.map((risk, i) => (
                  <tr key={i}>
                    <td className="border-b border-foreground/10 py-2 pr-4 text-foreground/75 align-top">{risk.risk}</td>
                    <td className="border-b border-foreground/10 py-2 pr-4 text-foreground/75 align-top">{risk.level}</td>
                    <td className="border-b border-foreground/10 py-2 text-foreground/75 align-top">{risk.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <SectionBlock section={s.market} />
        <SectionBlock section={s.businessModel} highlight />
        <SectionBlock section={s.nextSteps} />

        {/* Contact */}
        <section>
          <h2 className="clinical-label text-primary-legible mb-6">Contact</h2>
          <div className="flex flex-wrap gap-4">
            <ObfuscatedMailto
              label="EMAIL SINAIDA ↗"
              className="inline-block font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none border border-primary text-primary-legible bg-primary/[0.06]"
            />
            <ObfuscatedMailto
              label="EMAIL DARIA ↗"
              addressParts={['onlystrikes', '@', 'gmail', '.com']}
              className="inline-block font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none border border-primary text-primary-legible bg-primary/[0.06]"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
