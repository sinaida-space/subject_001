// ── Build-time static render of the first screen ──
// Built with `vite build --ssr` and run by scripts/prerender-shell.mjs, which
// injects the markup into dist/index.html's #root. Mirrors the top of
// pages/Index.tsx (wrapper, header, hero) so the swap to the live app is
// invisible. Never shipped to the browser.

import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import Header from '@/components/Header';
import HeroLetters from '@/components/HeroLetters';
import { RenderModeProvider, type RenderMode } from '@/hooks/useRenderMode';
import WorkCase from '@/pages/WorkCase';
import Statement from '@/pages/Statement';
import Machines from '@/pages/Machines';
import Practice from '@/pages/Practice';
import Collaborate from '@/pages/Collaborate';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Licensing from '@/pages/Licensing';
import { PRACTICES } from '@/data/practices';
import { PROJECTS } from '@/data/projects';

export { resolveRenderMode } from '@/lib/resolveRenderMode';

export function renderShell(): string {
  return renderToStaticMarkup(
    <RenderModeProvider initialMode="full">
      <StaticRouter location="/">
        <div className="relative min-h-screen bg-background">
          <Header />
          <main id="main-content" tabIndex={-1}>
            <div className="shell-hold" data-shell-hero="">
              <HeroLetters />
            </div>
            {/* The live page is many screens tall. Without this the shell
                has no scrollbar, and where scrollbars take layout width
                (Windows, Linux) the hero would jump sideways on handoff. */}
            <div style={{ height: '100vh' }} aria-hidden="true" />
          </main>
        </div>
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// Case pages: the whole case renders at build time, so the hero
// still is in the HTML and LCP does not wait for the main bundle. Unlike
// the homepage, main.tsx hydrates this markup instead of replacing it, so it
// is the app's own tree (AppRoutes, as App renders it) through renderToString,
// with the hydration markers React needs.
export const caseIds = PROJECTS.filter((p) => p.caseStudy).map((p) => p.id);

export function renderCase(id: string): string {
  return renderToString(
    <RenderModeProvider initialMode="full">
      <StaticRouter location={`/work/${id}/`}>
        <AppRoutes pages={{ work: WorkCase }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// Practice and Collaborate: the commission-facing pages, rendered
// and hydrated the same way as case pages, always in full mode.
export const practiceIds = PRACTICES.map((p) => p.id);

export function renderPractice(slug?: string): string {
  return renderToString(
    <RenderModeProvider initialMode="full">
      <StaticRouter location={slug ? `/practice/${slug}/` : '/practice/'}>
        <AppRoutes pages={{ practice: Practice }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

export function renderCollaborate(): string {
  return renderToString(
    <RenderModeProvider initialMode="full">
      <StaticRouter location="/collaborate/">
        <AppRoutes pages={{ collaborate: Collaborate }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// Statement: rendered once per mode, the same way. Full is the
// phone layout of the room (StatementRoom renders its plain flow below
// 768px); the wide room is drawn by the client alone.
export function renderStatement(mode: RenderMode): string {
  return renderToString(
    <RenderModeProvider initialMode={mode}>
      <StaticRouter location="/statement/">
        <AppRoutes pages={{ statement: Statement }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// Privacy: the one place the contact address is written out, so it is in the
// file for anyone without JavaScript (EMAIL ME falls back to it). Replaced by
// the app on load, like machines.
export function renderPrivacy(): string {
  return renderToStaticMarkup(
    <RenderModeProvider initialMode="full">
      <StaticRouter location="/privacy/">
        <AppRoutes pages={{ privacy: PrivacyPolicy }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// Licensing: the terms are text, so they are in the file for readers and
// crawlers without JavaScript. Replaced by the app on load, like privacy.
export function renderLicensing(): string {
  return renderToStaticMarkup(
    <RenderModeProvider initialMode="full">
      <StaticRouter location="/licensing/">
        <AppRoutes pages={{ licensing: Licensing }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}

// For machines: agents that fetch /machines read plain HTML and never run the
// bundle, so the page's text is in the file. main.tsx does not hydrate it; the
// app replaces it on load, as on the homepage. Lite mode: the still sky, which
// stays empty here because the nights load in the browser.
export function renderMachines(): string {
  return renderToStaticMarkup(
    <RenderModeProvider initialMode="lite">
      <StaticRouter location="/machines/">
        <AppRoutes pages={{ machines: Machines }} />
      </StaticRouter>
    </RenderModeProvider>,
  );
}
