// ── Static per-route <head> and crawler fallback for GitHub Pages ──
//
// This is a Vite/React SPA. GitHub Pages can only serve static files, so the
// deploy workflow used to materialize every route by copying dist/index.html
// verbatim into dist/<route>/index.html. That means every route shipped the
// homepage's <title>, description, canonical, og:*/twitter:* tags, structured
// data and <noscript> body — search engines saw every case study as a
// duplicate of "/", social crawlers rendered the homepage card for any shared
// deep link, and every work page's JSON-LD claimed to describe a different
// work than the one on the page.
//
// This script runs after `vite build` (and after scripts/inject-seo.mjs, so it
// reads the already-cleaned template). For every known route it clones
// dist/index.html and rewrites the route-specific parts with targeted string
// replacement — no HTML parser, no new dependency, just regex against a known
// file.
//
// The route table and the page content both come from scripts/lib/site-data.mjs,
// which derives /work/<slug>/ pages from src/data/projects.ts, so a new case
// study is picked up automatically the next time this runs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { DIST_DIR, buildRoutes } from './lib/site-data.mjs';
import { buildGraph, buildFallback } from './lib/structured-data.mjs';

const INDEX_HTML = join(DIST_DIR, 'index.html');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Replace the first match of `regex` in `html`, or throw if it's missing. */
function replaceRequired(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(`prerender-routes: expected tag not found in dist/index.html (${label}) — pattern: ${regex}`);
  }
  // A `$` in the replacement (none in today's copy, but copy changes) would
  // otherwise read as a capture-group reference, so it goes in via a function.
  return html.replace(regex, () => replacement);
}

function renderRouteHtml(baseHtml, route) {
  let html = baseHtml;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(route.canonical);

  const headTags = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`, 'title'],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`, 'meta description'],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`, 'link canonical'],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`, 'og:title'],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`, 'og:description'],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`, 'og:url'],
    [/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`, 'twitter:title'],
    [/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`, 'twitter:description'],
  ];
  for (const [regex, replacement, label] of headTags) {
    html = replaceRequired(html, regex, replacement, label);
  }

  if (route.robots) {
    html = replaceRequired(
      html,
      /<meta name="robots" content="[^"]*">/,
      `<meta name="robots" content="${escapeHtml(route.robots)}">`,
      'meta robots',
    );
  }

  html = replaceRequired(
    html,
    /<script type="application\/ld\+json" id="ld-graph">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="ld-graph">\n${JSON.stringify(buildGraph(route), null, 2)}\n    </script>`,
    'ld+json graph',
  );

  const fallback = buildFallback(route);
  if (fallback) {
    html = replaceRequired(
      html,
      /<noscript id="page-fallback">[\s\S]*?<\/noscript>/,
      `<noscript id="page-fallback">\n${fallback}\n    </noscript>`,
      'noscript fallback',
    );
  }

  return html;
}

function main() {
  if (!existsSync(INDEX_HTML)) {
    throw new Error(`prerender-routes: ${INDEX_HTML} does not exist — run vite build first`);
  }

  // Read once, up front: the homepage route rewrites this same file, and every
  // other route must still clone the template as Vite built it.
  const baseHtml = readFileSync(INDEX_HTML, 'utf8');
  const routes = buildRoutes();

  for (const route of routes) {
    const html = renderRouteHtml(baseHtml, route);

    // The homepage is dist/index.html itself. It keeps its hand-written
    // <noscript> (buildFallback returns null for it) and only has its
    // structured data swapped for the graph.
    if (route.path === '') {
      writeFileSync(INDEX_HTML, html);
      console.log('prerender-routes: rewrote dist/index.html structured data');
      continue;
    }

    const outDir = join(DIST_DIR, route.path);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
    console.log(`prerender-routes: wrote dist/${route.path}/index.html`);
  }

  console.log(`prerender-routes: done — ${routes.length} route(s) materialized.`);
}

main();
