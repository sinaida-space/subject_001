// ── Static first screen + render-mode boot script ──
//
// Runs last in `npm run build`, after prerender-routes.mjs has cloned
// dist/index.html into every route, and after `vite build --ssr
// src/entry-shell.tsx` has produced dist-shell/.
//
// 1. Every built page gets a tiny inline <head> script that sets
//    html[data-mode] (lite/full) before first paint, so lite visitors see
//    Chalk from the first frame instead of a flash of Void. Its source is
//    resolveRenderMode itself, serialized, so it can never drift from the
//    runtime decision. The CSP only allows 'self' scripts, so the script's
//    sha256 is added to script-src on each page.
//
// 2. The homepage alone gets the static header + hero (entry-shell.tsx)
//    inside #root, so the headline paints without waiting for the app
//    bundle. React's createRoot replaces it on mount.
//
// 3. dist/404.html is written here, from the homepage before the hero goes
//    in.
//
// 4. Every case page gets its full static render (renderCase), for the
//    same reason: the hero still paints before the app bundle runs. There
//    React hydrates the markup (hydrateRoot in main.tsx) instead of
//    replacing it.
//
// 5. Statement gets two renders: full (the room's phone layout) in #root and
//    lite in a <template>. A tiny inline script after them keeps the one
//    that matches html[data-mode], so React hydrates exactly that markup,
//    and empties #root where the wide room is drawn by the client alone
//    (full mode from 768px). Its hash joins script-src on that page.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const SHELL_DIR = 'dist-shell';

const { renderShell, renderCase, caseIds, renderPractice, practiceIds, renderCollaborate, renderStatement, renderMachines, renderPrivacy, renderLicensing, resolveRenderMode } = await import(
  pathToFileURL(join(SHELL_DIR, 'entry-shell.js')).href
);

const bootJs = `document.documentElement.setAttribute('data-mode',(${resolveRenderMode.toString()})());`;
const bootHash = `'sha256-${createHash('sha256').update(bootJs).digest('base64')}'`;
const bootTag = `<script>${bootJs}</script>`;

// Keep in step with StatementRoom's breakpoint and main.tsx's hydration check.
const pickJs = `(function(){var r=document.getElementById('root'),t=document.getElementById('root-lite');if(document.documentElement.getAttribute('data-mode')==='lite')r.innerHTML=t.innerHTML;else if(matchMedia('(min-width: 768px)').matches)r.innerHTML='';t.remove()})();`;
const pickHash = `'sha256-${createHash('sha256').update(pickJs).digest('base64')}'`;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

function mustReplace(html, from, to, label, file) {
  if (from instanceof RegExp ? !from.test(html) : !html.includes(from)) {
    throw new Error(`prerender-shell: ${label} not found in ${file}`);
  }
  return html.replace(from, () => to);
}

// 404.html starts as a copy of the homepage, so its head still claims to be
// the homepage. Give it its own title, keep it out of the index, and drop the
// canonical and og:url that would point crawlers back at /.
function notFoundHead(html) {
  let out = mustReplace(html, /<title>[^<]*<\/title>/, '<title>Page not found | Sinaida Krivchenko</title>', 'title', '404.html');
  out = mustReplace(out, /<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">', 'robots meta', '404.html');
  out = mustReplace(out, /\s*<link rel="canonical" href="[^"]*">/, '', 'canonical', '404.html');
  return out.replace(/\s*<meta property="og:url" content="[^"]*">/, '');
}


// A route's own chunk is requested only after the entry has run, so on pages
// that hydrate (Statement, cases, Practice, Collaborate) it would start one
// round trip late. Preload it, and the chunks it imports statically, beside
// the entry. Dynamic imports (the 3D scenes) are left alone.
function staticDeps(entryFile, seen = new Set()) {
  if (seen.has(entryFile)) return seen;
  seen.add(entryFile);
  const code = readFileSync(join(DIST, 'assets', entryFile), 'utf8');
  for (const m of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) staticDeps(m[1], seen);
  return seen;
}
function routePreloads(html, prefix) {
  const entry = /<script type="module"[^>]*src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
  const chunk = readdirSync(join(DIST, 'assets')).find((f) => f.startsWith(`${prefix}-`) && f.endsWith('.js'));
  if (!chunk) return html;
  const links = [...staticDeps(chunk)]
    .filter((f) => f !== entry && !html.includes(`/assets/${f}"`))
    .map((f) => `<link rel="modulepreload" crossorigin href="/assets/${f}">`)
    .join('\n  ');
  return links ? html.replace('</head>', () => `${links}\n  </head>`) : html;
}

let pages = 0;
let cases = 0;
for (const file of htmlFiles(DIST).filter((f) => !f.endsWith('404.html'))) {
  let html = readFileSync(file, 'utf8');
  if (!html.includes('<div id="root">')) continue;

  html = mustReplace(html, '<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${bootTag}`, 'charset meta', file);
  html = mustReplace(html, "script-src 'self'", `script-src 'self' ${bootHash}`, 'CSP script-src', file);

  if (file === join(DIST, 'index.html')) {
    // GitHub Pages serves 404.html for any unknown path, and the app then
    // renders NotFound there. It gets the boot script but not the hero, or
    // every broken link would flash the homepage first.
    writeFileSync(join(DIST, '404.html'), notFoundHead(html));
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderShell()}</div>`, 'empty #root', file);
    // The home page is its own chunk; preload it so it loads beside the entry
    // instead of after it.
    const homeChunk = readdirSync(join(DIST, 'assets')).find((f) => /^Index-.*\.js$/.test(f));
    if (homeChunk) html = mustReplace(html, '</head>', `<link rel="modulepreload" crossorigin href="/assets/${homeChunk}">\n  </head>`, 'head end', file);
  }

  // 4. Case pages get their full static render.
  const caseId = caseIds.find((id) => file === join(DIST, 'work', id, 'index.html'));
  if (caseId) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderCase(caseId)}</div>`, 'empty #root', file);
    cases++;
  }

  // 4b. Practice pages and Collaborate, the same way.
  const practiceId = practiceIds.find((id) => file === join(DIST, 'practice', id, 'index.html'));
  const practiceIndex = file === join(DIST, 'practice', 'index.html');
  if (practiceId || practiceIndex) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderPractice(practiceId)}</div>`, 'empty #root', file);
    cases++;
  }
  if (file === join(DIST, 'collaborate', 'index.html')) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderCollaborate()}</div>`, 'empty #root', file);
    cases++;
  }

  // 5. Statement: one render per mode.
  if (file === join(DIST, 'statement', 'index.html')) {
    const both = `<div id="root">${renderStatement('full')}</div><template id="root-lite">${renderStatement('lite')}</template><script>${pickJs}</script>`;
    html = mustReplace(html, '<div id="root"></div>', both, 'empty #root', file);
    html = mustReplace(html, `script-src 'self' ${bootHash}`, `script-src 'self' ${bootHash} ${pickHash}`, 'CSP script-src', file);
  }

  // 6. For machines: plain text for agents, replaced by the app on load.
  if (file === join(DIST, 'machines', 'index.html')) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderMachines()}</div>`, 'empty #root', file);
  }

  // 7. Privacy: the written-out contact address, for readers without JavaScript.
  if (file === join(DIST, 'privacy', 'index.html')) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderPrivacy()}</div>`, 'empty #root', file);
  }

  // 8. Licensing: the terms as text, for readers without JavaScript.
  if (file === join(DIST, 'licensing', 'index.html')) {
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderLicensing()}</div>`, 'empty #root', file);
  }

  // 9. Preload the chunk each hydrating page adopts its markup with.
  const rel = file.slice(DIST.length + 1).replace(/\\/g, '/');
  if (rel === 'statement/index.html') html = routePreloads(html, 'Statement');
  else if (caseId) html = routePreloads(html, 'WorkCase');
  else if (practiceId || practiceIndex) html = routePreloads(html, 'Practice');
  else if (rel === 'collaborate/index.html') html = routePreloads(html, 'Collaborate');

  writeFileSync(file, html);
  pages++;
}

rmSync(SHELL_DIR, { recursive: true, force: true });
console.log(`prerender-shell: boot script on ${pages} page(s), static hero on dist/index.html, static render on ${cases} case, practice and collaborate page(s) and Statement`);
