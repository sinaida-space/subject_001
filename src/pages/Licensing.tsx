import { lazy, Suspense } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useRenderMode } from '@/hooks/useRenderMode';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import { withProjectNames } from '@/lib/projectNames';
import { BackLink, H1_CLASS, TextSection, KICKER_CLASS, LEAD_CLASS, PAGE_MAIN_CLASS, RuledRows } from '@/components/PageParts';

// 'Last updated' is the date of the last commit to this file (vite.config.ts),
// written as '7 August 2026' with non-breaking spaces.
const LAST_UPDATED = (() => {
  const iso = typeof __LICENSING_UPDATED__ === 'undefined' ? '' : __LICENSING_UPDATED__;
  const date = iso ? new Date(`${iso}T12:00:00Z`) : new Date();
  return date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .replace(/ /g, '\u00a0');
})();

const ParticleField = lazy(() => import('@/components/ParticleField'));

/* Licensing terms for the site and for every project shown on it.
   Deliberately split in two: the code is open, the artwork is not.
   Kept in sync with the LICENSE / LICENSE-ARTWORK / THIRD-PARTY.md files
   in each project repository. Change both together or they will drift. */

type Row = {
  project: string;
  code: string;
  artwork: string;
  /* Where the project lives: a repository, a case study on this site, or a video.
     `external: false` keeps in-site routes in the same tab. */
  repo?: string;
  external?: boolean;
  /* Licence files in the repository, linked so the reader checks the source. */
  files?: string[];
};

// Alphabetical by project name, ignoring a leading "The".
const ROWS: Row[] = [
  {
    project: 'Aether Currents',
    code: 'AGPL 3.0',
    artwork: 'Recordings CC BY 4.0, attribution required',
    repo: 'https://github.com/sinaida-space/aether-currents',
    files: ['LICENSE', 'LICENSE-CONTENT', 'NOTICE', 'THIRD-PARTY.md'],
},
  {
    project: 'CONSPACE ROOMS',
    code: 'Apache 2.0',
    artwork: 'CC BY-NC-ND 4.0',
    repo: 'https://github.com/sinaida-space/conspace-rooms',
    files: ['LICENSE', 'LICENSE-ARTWORK', 'NOTICE'],
},
  {
    project: 'Ethereal Path',
    code: 'Apache 2.0',
    artwork: 'CC BY-NC-ND 4.0',
    repo: 'https://github.com/sinaida-space/ethereal-path',
    files: ['LICENSE', 'LICENSE-ARTWORK', 'NOTICE', 'THIRD-PARTY.md'],
},
  {
    project: 'The Eyes, Chico',
    code: 'Apache 2.0',
    artwork: 'All rights reserved',
    repo: 'https://github.com/sinaida-space/the-eyes-chico',
    files: ['LICENSE', 'LICENSE-ARTWORK', 'NOTICE', 'THIRD-PARTY.md'],
},
  {
    project: 'Infinite Voidsong',
    code: 'Apache 2.0',
    artwork: 'Field recordings CC0 1.0, from their authors',
    repo: 'https://github.com/sinaida-space/infinite-voidsong',
    files: ['LICENSE'],
},
  {
    project: 'Redkie Ptitsy',
    code: 'Not published',
    artwork: 'All rights reserved',
    repo: '/work/redkie-ptitsy',
    external: false,
  },
  {
    project: 'sinaida.eu',
    code: 'All rights reserved',
    artwork: 'All rights reserved',
    repo: 'https://github.com/sinaida-space/subject_001',
    files: ['LICENSE', 'THIRD-PARTY.md'],
  },
  {
    project: 'Stereolove',
    code: 'Apache 2.0',
    artwork: 'CC BY-NC-ND 4.0',
    repo: 'https://github.com/sinaida-space/stereolove',
    files: ['LICENSE', 'LICENSE-ARTWORK', 'NOTICE', 'THIRD-PARTY.md'],
},
  {
    project: 'Storm Glass',
    code: 'Project files for Patreon members',
    artwork: 'All rights reserved',
    repo: 'https://youtu.be/hwFttiCKbrU',
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
        <div className={KICKER_CLASS}>Licensing</div>
        <h1 className={H1_CLASS}>Two licences</h1>

        <RuledRows
          className="mt-14"
          rows={[
            {
              label: 'Code',
              value: <>Most source code on my GitHub is licensed under Apache&nbsp;2.0. Read it, fork it, ship it commercially. Keep the&nbsp;notices.</>,
              note: <><span className="project-name">Aether Currents</span> uses AGPL&nbsp;3.0, and the code of this website is all rights&nbsp;reserved.</>,
            },
            {
              label: 'Artwork',
              value: 'Visuals, shaders as artworks, video, audio, texts and photographs are not covered by that licence.',
              note: <>Each project states its own terms&nbsp;below.</>,
            },
            {
              label: 'Site',
              value: <>Biography, project descriptions, artist statement and images: all rights&nbsp;reserved.</>,
            },
            {
              label: 'Press',
              value: (
                <>
                  Editorial use has a standing permission. See{' '}
                  <a href="#press" className="text-primary-legible underline underline-offset-2 transition-colors hover:text-accent">
                    Press and&nbsp;writing
                  </a>
                  .
                </>
              ),
            },
          ]}
        />

        <div className="mt-8 font-mono text-[19px] leading-normal text-foreground/85">
          <TextSection title={<>Projects</>}>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[17px] text-foreground/75">
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
                            {withProjectNames(r.project)}
                          </a>
                        ) : (
                          withProjectNames(r.project)
                        )}
                        {r.files && r.repo && (
                          <span className="mt-1 block text-[12px] text-muted-foreground">
                            {r.files.map((f, i) => (
                              <span key={f}>
                                {i > 0 && ' · '}
                                <a
                                  href={`${r.repo}/blob/HEAD/${f}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline underline-offset-2 hover:text-accent transition-colors"
                                >
                                  {f}
                                </a>
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{r.code}</td>
                      <td className="py-3">{r.artwork}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              Where a repository is public, the files inside it govern. This page is a
              summary and the repository is the&nbsp;authority.
            </p>
          </TextSection>
          <TextSection title={<>What the artwork licences mean</>}>

            <p>
              <strong className="text-foreground">CC BY-NC-ND 4.0</strong> lets you share a
              piece as it&nbsp;is, for non-commercial purposes, with credit to me and a link
              to this&nbsp;site. Post a clip, put a still in a lecture deck, write about
              it. You may not sell it, use it in commercial work, or build something
              derivative from&nbsp;it. The code underneath stays fully open, so if what
              you want is the technique, take the technique.
            </p>
            <p>
              <strong className="text-foreground">All rights reserved</strong> means ask
              first. It is not a&nbsp;refusal. It is how work involving other artists
              and venues has to be&nbsp;held.
            </p>
          </TextSection>
          <TextSection title={<><span className="project-name">Aether Currents</span></>}>

            <p>
              The tool&rsquo;s code is under AGPL&nbsp;3.0 rather than&nbsp;Apache. Use it,
              study it, change it, share&nbsp;it. If you run a modified version, including
              as a hosted service, you publish your source under the same&nbsp;terms.
            </p>
            <p>
              Anything you record with the built-in sounds is yours to publish, edit and
              monetise under CC BY&nbsp;4.0, on one condition that is mandatory: the credit
              line travels with the audio, everywhere it&nbsp;appears. The full terms are
              on the tool&rsquo;s own licence&nbsp;page.
            </p>
          </TextSection>
          <TextSection title={<>The painting in <span className="project-name">The Eyes,&nbsp;Chico</span></>}>

            <p>
              The painting in that piece is the work of{' '}
              <strong className="text-foreground">Alisa Feer</strong> and remains her sole
              property. It appears with her permission, for this collaboration&nbsp;only.
            </p>
            <p>
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
          </TextSection>
          <TextSection title={<>Live work and collaborations</>}>

            <p>
              Stage visuals and installations made for other people carry rights that are
              not&nbsp;mine. Documentation of the <span className="project-name">Redkie Ptitsy</span> set at Sklad&nbsp;No.&nbsp;3
              contains the band&rsquo;s music and their performance, and any use of that
              footage needs their permission as well as&nbsp;mine. The same holds for
              work made with other artists and venues.
            </p>
          </TextSection>
          <TextSection id="press" title={<>Press and writing</>}>

            <p>
              You do not need to ask me to write about the&nbsp;work. Journalists,
              curators, students and researchers may reproduce stills, short clips and
              quoted text from this site in articles, reviews, catalogues and academic
              writing, with credit to Sinaida Krivchenko and a link to sinaida.eu where a
              link is&nbsp;possible. Three exceptions: the painting described above, which
              needs Alisa Feer&rsquo;s permission; footage of the <span className="project-name">Redkie&nbsp;Ptitsy</span> set,
              which also needs the band&rsquo;s; and advertising, which is commercial and
              needs&nbsp;mine.
            </p>
            <p>
              Press images and project texts are available on&nbsp;request, and I would
              rather send you a clean file than have you screenshot&nbsp;one.
            </p>
          </TextSection>
          <TextSection title={<>Other people&rsquo;s work inside mine</>}>

            <p>
              Some of the shader mathematics in these projects comes from other authors,
              used under their own licences and credited in&nbsp;place:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Nebula raymarch in <span className="project-name">The Eyes,&nbsp;Chico</span>, after a shader by Yohei
                Nishitsuji, MIT
              </li>
              <li>
                Hash function in <span className="project-name">The Eyes,&nbsp;Chico</span> and <span className="project-name">Ethereal&nbsp;Path</span>, from
                &ldquo;Hash without Sine&rdquo; by Dave&nbsp;Hoskins, MIT
              </li>
              <li>Three.js, MediaPipe Tasks and Vite, each under its own licence</li>
              <li>Geist Pixel and Libre Franklin, under the SIL Open Font&nbsp;Licence</li>
            </ul>
            <p>
              I credit everything I know&nbsp;of. Agentic tools can draw on sources
              I&nbsp;cannot see, so if you find your work here without credit, please
              contact me: we will look at it together and fix&nbsp;it.
            </p>
          </TextSection>
          <TextSection title={<>This website</>}>

            <p>
              The design, code, text and images of sinaida.eu are &copy;{' '}
              {new Date().getFullYear()} Sinaida Krivchenko, all rights&nbsp;reserved.
              Quoting my biography or artist statement in press coverage is fine, see
              Press and writing&nbsp;above.
            </p>
          </TextSection>
          <p className="clinical-label mt-16 text-foreground/60">
            Last updated {LAST_UPDATED}
          </p>
        </div>
      </main>
      <ContactChannel question="Have an idea or a thought to share?" />
      <Footer />
    </div>
  );
};

export default Licensing;
