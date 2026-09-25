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
//    in, which is why the deploy workflow no longer copies index.html.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const SHELL_DIR = 'dist-shell';

const { renderShell, resolveRenderMode } = await import(
  pathToFileURL(join(SHELL_DIR, 'entry-shell.js')).href
);

const bootJs = `document.documentElement.setAttribute('data-mode',(${resolveRenderMode.toString()})());`;
const bootHash = `'sha256-${createHash('sha256').update(bootJs).digest('base64')}'`;
const bootTag = `<script>${bootJs}</script>`;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

function mustReplace(html, from, to, label, file) {
  if (!html.includes(from) && !(from instanceof RegExp && from.test(html))) {
    throw new Error(`prerender-shell: ${label} not found in ${file}`);
  }
  return html.replace(from, () => to);
}

let pages = 0;
for (const file of htmlFiles(DIST).filter((f) => !f.endsWith('404.html'))) {
  let html = readFileSync(file, 'utf8');
  if (!html.includes('<div id="root">')) continue;

  html = mustReplace(html, '<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${bootTag}`, 'charset meta', file);
  html = mustReplace(html, "script-src 'self'", `script-src 'self' ${bootHash}`, 'CSP script-src', file);

  if (file === join(DIST, 'index.html')) {
    // GitHub Pages serves 404.html for any unknown path, and the app then
    // renders NotFound there. It gets the boot script but not the hero, or
    // every broken link would flash the homepage first.
    writeFileSync(join(DIST, '404.html'), html);
    html = mustReplace(html, '<div id="root"></div>', `<div id="root">${renderShell()}</div>`, 'empty #root', file);
  }

  writeFileSync(file, html);
  pages++;
}

rmSync(SHELL_DIR, { recursive: true, force: true });
console.log(`prerender-shell: boot script on ${pages} page(s), static hero on dist/index.html`);
