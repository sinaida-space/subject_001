import { readFileSync, writeFileSync } from 'fs';

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
const out = html.replace(/<div id="seo"[\s\S]*?<\/div>/, '');

if (out !== html) {
  writeFileSync(file, out);
  console.log('Removed legacy hidden SEO block.');
} else {
  console.log('SEO fallback preserved via noscript block.');
}
