// ── Static per-route <head> tags for GitHub Pages ──
//
// This is a Vite/React SPA. GitHub Pages can only serve static files, so the
// deploy workflow used to materialize every route by copying dist/index.html
// verbatim into dist/<route>/index.html. That means every route shipped the
// homepage's <title>, description, canonical, and og:*/twitter:* tags —
// search engines saw every case study as a duplicate of "/", and social
// crawlers (which do not execute JS) always rendered the homepage card for
// any shared deep link.
//
// This script runs after `vite build` (and after scripts/inject-seo.mjs, so
// it reads the already-cleaned template). For every known route it clones
// dist/index.html and rewrites the route-specific <head> tags with targeted
// string replacement — no HTML parser, no new dependency, just regex against
// a known file. Root ("/") is left exactly as Vite built it.
//
// Route data for /work/<slug>/ pages is derived from src/data/projects.ts
// (every project with a `caseStudy`) instead of being hand-maintained here,
// so a new case study is picked up automatically the next time this runs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DIST_DIR = join(REPO_ROOT, 'dist');
const PROJECTS_FILE = join(REPO_ROOT, 'src', 'data', 'projects.ts');
const INDEX_HTML = join(DIST_DIR, 'index.html');

const SITE_URL = 'https://sinaida.eu';
const SITE_NAME = 'sin.ai.da';

// ── tiny string helpers ──────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Trim to maxLen characters, breaking on a word boundary, never mid-word. */
function trimToWordBoundary(text, maxLen = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const budget = maxLen - 1; // reserve one char for the ellipsis
  let cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + '…';
}

/** Replace the first match of `regex` in `html`, or throw if it's missing. */
function replaceRequired(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(`prerender-routes: expected tag not found in dist/index.html (${label}) — pattern: ${regex}`);
  }
  return html.replace(regex, replacement);
}

// ── derive /work/<slug>/ routes from src/data/projects.ts ───────────────

/** Split a `[ ... ]` array body into its top-level `{ ... }` object blocks. */
function splitTopLevelObjects(arrayBody) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < arrayBody.length; i++) {
    const ch = arrayBody[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(arrayBody.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

/** Extract a top-level `field: '...'` or `field: "..."` string value from an object block. */
function extractField(block, fieldName) {
  const re = new RegExp(`^[ \\t]*${fieldName}:\\s*(['"])([\\s\\S]*?)\\1`, 'm');
  const match = block.match(re);
  return match ? match[2] : null;
}

function extractCaseStudyProjects(source) {
  const marker = 'export const PROJECTS: Project[] = [';
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`prerender-routes: could not find "${marker}" in ${PROJECTS_FILE}`);
  }

  const arrayOpen = markerIdx + marker.length - 1; // index of the '['
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayOpen; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) {
    throw new Error(`prerender-routes: could not find the closing "]" for PROJECTS in ${PROJECTS_FILE}`);
  }

  const arrayBody = source.slice(arrayOpen + 1, arrayEnd);
  const blocks = splitTopLevelObjects(arrayBody);

  const routes = [];
  for (const block of blocks) {
    if (!/^\s*caseStudy:/m.test(block)) continue;

    const id = extractField(block, 'id');
    const title = extractField(block, 'title');
    const tagline = extractField(block, 'tagline');
    const blurb = extractField(block, 'blurb'); // optional

    if (!id || !title || !tagline) {
      throw new Error(
        `prerender-routes: a project with caseStudy is missing id/title/tagline (got id=${id}, title=${title}, tagline=${tagline})`,
      );
    }

    const combined = blurb ? `${tagline}. ${blurb}` : tagline;

    routes.push({
      path: `work/${id}`,
      title: `${title} — Case Study | ${SITE_NAME}`,
      description: trimToWordBoundary(combined, 160),
      canonical: `${SITE_URL}/work/${id}/`,
    });
  }

  if (routes.length === 0) {
    throw new Error(
      `prerender-routes: extracted zero case-study routes from ${PROJECTS_FILE} — regex parsing likely broke against a source-format change`,
    );
  }

  return routes;
}

// ── build the full route list ────────────────────────────────────────────

function buildRoutes() {
  const projectsSource = readFileSync(PROJECTS_FILE, 'utf8');
  const workRoutes = extractCaseStudyProjects(projectsSource);

  const collaborate = {
    path: 'collaborate',
    title: 'Work with me — Sinaida Krivchenko',
    description:
      'She takes commissions for stage and projection design, immersive installations, and generative AI visual direction, based in Prague and touring for installs.',
    canonical: `${SITE_URL}/collaborate/`,
  };

  const privacy = {
    path: 'privacy',
    title: 'Privacy Policy — Sinaida Krivchenko',
    description: 'How this website handles personal data, what it stores, and the rights visitors have under GDPR.',
    canonical: `${SITE_URL}/privacy/`,
    robots: 'noindex, follow',
  };

  // Legacy redirect stubs: the SPA sends /booking/ and /press/ visitors on to
  // /collaborate/, so their static shells reuse collaborate's copy and point
  // search engines at the real destination instead of indexing the redirect.
  const legacyRedirect = (path) => ({
    path,
    title: collaborate.title,
    description: collaborate.description,
    canonical: collaborate.canonical,
    robots: 'noindex, follow',
  });

  return [collaborate, privacy, legacyRedirect('booking'), legacyRedirect('press'), ...workRoutes];
}

// ── apply a route's tags to the base template ────────────────────────────

function renderRouteHtml(baseHtml, route) {
  let html = baseHtml;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(route.canonical);

  html = replaceRequired(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceRequired(
    html,
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${description}">`,
    'meta description',
  );
  html = replaceRequired(
    html,
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${canonical}">`,
    'link canonical',
  );
  html = replaceRequired(
    html,
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${title}">`,
    'og:title',
  );
  html = replaceRequired(
    html,
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${description}">`,
    'og:description',
  );
  html = replaceRequired(
    html,
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${canonical}">`,
    'og:url',
  );
  html = replaceRequired(
    html,
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${title}">`,
    'twitter:title',
  );
  html = replaceRequired(
    html,
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${description}">`,
    'twitter:description',
  );

  if (route.robots) {
    html = replaceRequired(
      html,
      /<meta name="robots" content="[^"]*">/,
      `<meta name="robots" content="${escapeHtml(route.robots)}">`,
      'meta robots',
    );
  }

  return html;
}

// ── main ──────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(INDEX_HTML)) {
    throw new Error(`prerender-routes: ${INDEX_HTML} does not exist — run vite build first`);
  }

  const baseHtml = readFileSync(INDEX_HTML, 'utf8');
  const routes = buildRoutes();

  for (const route of routes) {
    const html = renderRouteHtml(baseHtml, route);
    const outDir = join(DIST_DIR, route.path);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
    console.log(`prerender-routes: wrote dist/${route.path}/index.html`);
  }

  console.log(`prerender-routes: done — ${routes.length} route(s) materialized.`);
}

main();
