// ── Build-time static render of the first screen ──
// Built with `vite build --ssr` and run by scripts/prerender-shell.mjs, which
// injects the markup into dist/index.html's #root. Mirrors the top of
// pages/Index.tsx (wrapper, header, hero) so the swap to the live app is
// invisible. Never shipped to the browser.

import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import { RenderModeProvider } from '@/hooks/useRenderMode';

export { resolveRenderMode } from '@/lib/resolveRenderMode';

export function renderShell(): string {
  return renderToStaticMarkup(
    <RenderModeProvider initialMode="full">
      <StaticRouter location="/">
        <div className="relative min-h-screen bg-background">
          <Header />
          <main id="main-content" tabIndex={-1}>
            <div className="shell-hold" data-shell-hero="">
              <HeroSection />
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
