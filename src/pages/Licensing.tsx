import { lazy, Suspense } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useRenderMode } from '@/hooks/useRenderMode';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ParticleField = lazy(() => import('@/components/ParticleField'));

/* Licensing terms for the site and for every project shown on it.
   Deliberately split in two: the code is open, the artwork is not.
   Kept in sync with the LICENSE / LICENSE-ARTWORK / THIRD-PARTY.md files
   in each project repository. Change both together or they will drift. */

const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="font-display text-lg text-foreground mt-8 scroll-mt-24">
    {children}
  </h2>
);

type Row = {
  project: string;
  code: string;
  artwork: string;
  /* Where the project lives: a repository, a case study on this site, or a video.
     `external: false` keeps in-site routes in the same tab. */
  repo?: string;
  external?: boolean;
};

const ROWS: Row[] = [
  {
    project: 'Mahler',
    code: 'Apache 2.0',
    artwork: 'No artwork',
    repo: 'https://github.com/sinaida-space/mahler-the-orchestrator',
  },
  {
    project: 'Aether Currents',
    code: 'AGPL 3.0',
    artwork: 'Recordings CC BY 4.0, attribution required',
    repo: 'https://github.com/sinaida-space/aether-currents',
  },
  {
    project: 'Ethereal Path',
    code: 'Apache 2.0',
    artwork: 'CC BY-NC-ND 4.0',
    repo: 'https://github.com/sinaida-space/ethereal-path',
  },
  {
    project: 'Stereolove',
    code: 'Apache 2.0',
    artwork: 'CC BY-NC-ND 4.0',
    repo: 'https://github.com/sinaida-space/stereolove',
  },
  {
    project: 'The Eyes, Chico',
    code: 'Apache 2.0',
    artwork: 'All rights reserved',
    repo: 'https://github.com/sinaida-space/the-eyes-chico',
  },
  {
    project: 'Redkie Ptitsy',
    code: 'Not published',
    artwork: 'All rights reserved',
    repo: '/work/redkie-ptitsy',
    external: false,
  },
  {
    project: 'Submerged Realities',
    code: 'Not published',
    artwork: 'All rights reserved',
    repo: 'https://www.youtube.com/watch?v=7qgDlifWno0',
  },
];

const Licensing = () => {
  usePageMeta({
    title: 'Licensing | Sinaida Krivchenko',
    description:
      'What you may reuse from this website and from each project, what you may not, and who to ask when the answer is no.',
    canonical: 'https://sinaida.eu/licensing/',
  });

  const { mode } = useRenderMode();

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
        className="container relative z-10 mx-auto px-6 max-w-3xl pt-40 pb-24 md:pt-32 lg:pt-36"
      >
        <a
          href="/"
          className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block"
        >
          ← Back
        </a>

        <h1 className="font-display text-4xl font-light mb-8">Licensing</h1>

        <div className="prose prose-invert font-clinical text-sm text-secondary-foreground space-y-6 leading-relaxed">
          <p>
            My projects carry two licences, because they are two&nbsp;things. The
            software is open and you are welcome to&nbsp;it. The artwork is how
            I&nbsp;make a&nbsp;living, and it moves only with my&nbsp;permission.
          </p>

          <H2>The short version</H2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Source code on my GitHub is licensed under Apache&nbsp;2.0. Read it, fork
              it, ship it commercially. Keep the notices. Aether Currents is the
              exception and uses AGPL&nbsp;3.0.
            </li>
            <li>
              Visuals, shaders as artworks, video, audio, texts and photographs are
              not covered by that licence. Each project states its own terms&nbsp;below.
            </li>
            <li>
              This website, including my biography, project descriptions, artist
              statement and images, is all rights&nbsp;reserved.
            </li>
            <li>
              Press and editorial use has a standing permission. See{' '}
              <a href="#press" className="text-primary-legible underline underline-offset-2 hover:text-accent transition-colors">
                Press and&nbsp;writing
              </a>
              .
            </li>
          </ul>

          <H2>Project by project</H2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-muted-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="clinical-label py-2 pr-4 text-primary-legible font-normal">Project</th>
                  <th className="clinical-label py-2 pr-4 text-primary-legible font-normal">Code</th>
                  <th className="clinical-label py-2 text-primary-legible font-normal">Artwork</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.project} className="border-b border-border/40 align-top">
                    <td className="py-3 pr-4 text-foreground">
                      {r.repo ? (
                        <a
                          href={r.repo}
                          {...(r.external === false
                            ? {}
                            : { target: '_blank', rel: 'noopener noreferrer' })}
                          className="underline underline-offset-2 hover:text-accent transition-colors"
                        >
                          {r.project}
                        </a>
                      ) : (
                        r.project
                      )}
                    </td>
                    <td className="py-3 pr-4">{r.code}</td>
                    <td className="py-3">{r.artwork}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground">
            Where a repository is public, the files inside it govern. This page is a
            summary and the repository is the&nbsp;authority.
          </p>

          <H2>What the artwork licences mean</H2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">CC BY-NC-ND 4.0</strong> lets you share a
            piece as it&nbsp;is, for non-commercial purposes, with credit to me and a link
            to this&nbsp;site. Post a clip, put a still in a lecture deck, write about
            it. You may not sell it, use it in commercial work, or build something
            derivative from&nbsp;it. The code underneath stays fully open, so if what
            you want is the technique, take the technique.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">All rights reserved</strong> means ask
            first. It is not a&nbsp;refusal. It is how work involving other artists,
            venues and clients has to be&nbsp;held.
          </p>

          <H2>Aether Currents</H2>
          <p className="text-muted-foreground">
            The tool&rsquo;s code is under AGPL&nbsp;3.0 rather than&nbsp;Apache. Use it,
            study it, change it, share&nbsp;it. If you run a modified version, including
            as a hosted service, you publish your source under the same&nbsp;terms. If
            you want to build something commercial on it without that obligation, a
            commercial licence is available and you should just&nbsp;ask.
          </p>
          <p className="text-muted-foreground">
            Anything you record with the built-in sounds is yours to publish, edit and
            monetise under CC BY&nbsp;4.0, on one condition that is mandatory: the credit
            line travels with the audio, everywhere it&nbsp;appears. The full terms are
            on the tool&rsquo;s own licence&nbsp;page.
          </p>

          <H2>The painting in The Eyes,&nbsp;Chico</H2>
          <p className="text-muted-foreground">
            The painting in that piece is the work of{' '}
            <strong className="text-foreground">Alisa Feer</strong> and remains her sole
            property. It appears with her permission, for this collaboration&nbsp;only.
          </p>
          <p className="text-muted-foreground">
            I hold no right to license it and cannot grant one. Permission to reproduce,
            adapt, exhibit or print the painting, in whole or in part, can come from
            Alisa Feer&nbsp;alone. Every request goes to her directly at{' '}
            <a
              href="https://uvaliss.ru/contacts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-legible underline underline-offset-2 hover:text-accent transition-colors"
            >
              uvaliss.ru/contacts
            </a>
            . Requests sent to me are forwarded, not&nbsp;answered.
          </p>

          <H2>Live and commissioned work</H2>
          <p className="text-muted-foreground">
            Stage visuals and installations made for other people carry rights that are
            not&nbsp;mine. Documentation of the Redkie Ptitsy set at Sklad&nbsp;№3
            contains the band&rsquo;s music and their performance, and any use of that
            footage needs their permission as well as&nbsp;mine. The same holds for
            client and venue work generally.
          </p>

          <H2 id="press">Press and writing</H2>
          <p className="text-muted-foreground">
            You do not need to ask me to write about the&nbsp;work. Journalists,
            curators, students and researchers may reproduce stills, short clips and
            quoted text from this site in articles, reviews, catalogues and academic
            writing, with credit to Sinaida Krivchenko and a link to sinaida.eu where a
            link is&nbsp;possible. Two exceptions: the painting described above, which
            needs Alisa Feer&rsquo;s permission, and advertising, which is commercial and
            needs&nbsp;mine.
          </p>
          <p className="text-muted-foreground">
            Press images and project texts are available on&nbsp;request, and I would
            rather send you a clean file than have you screenshot&nbsp;one.
          </p>

          <H2>Other people&rsquo;s work inside mine</H2>
          <p className="text-muted-foreground">
            Some of the shader mathematics in these projects comes from other authors,
            used under their own licences and credited in&nbsp;place:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Nebula raymarch in The Eyes,&nbsp;Chico, after a shader by Yohei
              Nishitsuji, MIT
            </li>
            <li>
              Hash function in The Eyes,&nbsp;Chico and Ethereal&nbsp;Path, from
              &ldquo;Hash without Sine&rdquo; by Dave&nbsp;Hoskins, MIT
            </li>
            <li>Three.js, MediaPipe Tasks and Vite, each under its own licence</li>
            <li>Geist Pixel and Libre Franklin, under the SIL Open Font&nbsp;Licence</li>
          </ul>
          <p className="text-muted-foreground">
            Where a project uses someone else&rsquo;s work, its repository carries a
            THIRD-PARTY file with the exact&nbsp;notices. If you believe something of
            yours is in my work without credit, write to me and I&nbsp;will fix it the
            same&nbsp;week.
          </p>

          <H2>This website</H2>
          <p className="text-muted-foreground">
            The design, code, text and images of sinaida.eu are &copy;{' '}
            {new Date().getFullYear()} Sinaida Krivchenko, all rights&nbsp;reserved. The
            biography and artist statement in particular are written by me and are not
            free to&nbsp;republish, though quoting them in press coverage is covered
            above.
          </p>

          <H2>Asking</H2>
          <p className="text-muted-foreground">
            Licensing questions, exhibition requests, and anything the table above marks
            as all rights reserved: write to me through the{' '}
            <a
              href="/collaborate"
              className="text-primary-legible underline underline-offset-2 hover:text-accent transition-colors"
            >
              collaboration&nbsp;page
            </a>
            . Tell me what you want to use and where it will&nbsp;appear. Most answers
            are&nbsp;yes.
          </p>

          <p className="clinical-label text-muted-foreground mt-10">
            Last updated 7&nbsp;August&nbsp;2026
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Licensing;
