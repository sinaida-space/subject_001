// ── Shared site model for the static build steps ──
//
// scripts/prerender-routes.mjs (per-route <head>, JSON-LD and <noscript>) and
// scripts/build-sitemap.mjs (dist/sitemap.xml) both need the same answer to
// "what routes does this site have, and what is on each of them". That answer
// is derived from src/data/projects.ts rather than hand-maintained in two
// places, so adding a case study updates the head tags, the structured data,
// the crawler fallback and the sitemap in one edit.
//
// The extraction is regex-and-brace-scanning against the TypeScript source,
// not a real parser: this build has no TS loader in the Node steps, and
// pulling one in for four fields is not worth the dependency. Every extractor
// throws instead of returning something plausible-but-empty, so a formatting
// change in projects.ts fails the build loudly rather than silently shipping
// pages with no content in them.

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
export const DIST_DIR = join(REPO_ROOT, 'dist');

const PROJECTS_FILE = join(REPO_ROOT, 'src', 'data', 'projects.ts');

export const SITE_URL = 'https://sinaida.eu';
export const SITE_NAME = 'Sinaida Krivchenko';
export const AUTHOR_NAME = 'Sinaida Krivchenko';

/** Stable JSON-LD node ids. Everything else in a graph points at these. */
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const PERSON_ID = `${SITE_URL}/#person`;

// ── source scanning primitives ───────────────────────────────────────────

/**
 * Walk from `startIdx` (which must sit on `open`) to the matching `close`,
 * skipping over string literals so a bracket inside copy cannot throw the
 * depth count off. Returns the inclusive slice, or null if unbalanced.
 */
function scanBalanced(src, startIdx, open, close) {
  let depth = 0;
  let quote = null;
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return null;
}

/** Split a `[ ... ]` body into its top-level `{ ... }` blocks. */
function splitTopLevelObjects(arrayBody) {
  const blocks = [];
  let i = 0;
  while (i < arrayBody.length) {
    if (arrayBody[i] === '{') {
      const block = scanBalanced(arrayBody, i, '{', '}');
      if (!block) break;
      blocks.push(block);
      i += block.length;
    } else {
      i++;
    }
  }
  return blocks;
}

const UNESCAPE = { n: '\n', t: '\t', r: '\r', "'": "'", '"': '"', '`': '`', '\\': '\\' };

function unescapeLiteral(raw) {
  return raw.replace(/\\(.)/g, (_, ch) => UNESCAPE[ch] ?? ch);
}

/**
 * Read `field: '...'` out of `scope`.
 * `anchored` requires the field to start its own line, which is how top-level
 * object fields are written here; inline objects (`{ label: 'x', url: 'y' }`)
 * need it off.
 */
function readString(scope, field, { anchored = true } = {}) {
  const prefix = anchored ? '^[ \\t]*' : '(?:^|[\\s,{])';
  const re = new RegExp(`${prefix}${field}:\\s*(['"])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`, 'm');
  const match = scope.match(re);
  return match ? unescapeLiteral(match[2]) : null;
}

/** Read the balanced `[...]` or `{...}` value of `field` out of `scope`. */
function readBlock(scope, field, open, close) {
  const re = new RegExp(`(?:^|[\\s,{])${field}:\\s*\\${open}`, 'm');
  const match = scope.match(re);
  if (!match) return null;
  const start = scope.indexOf(open, match.index);
  return scanBalanced(scope, start, open, close);
}

/** Read `field: ['a', 'b']` as a plain array of strings. */
function readStringArray(scope, field) {
  const body = readBlock(scope, field, '[', ']');
  if (!body) return null;
  const out = [];
  const re = /(['"])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push(unescapeLiteral(m[2]));
  return out;
}

/** Read `field: [{ ... }, { ... }]` as an array of objects with `fields` picked out. */
function readObjectArray(scope, field, fields) {
  const body = readBlock(scope, field, '[', ']');
  if (!body) return null;
  return splitTopLevelObjects(body).map((block) => {
    const obj = {};
    for (const name of fields) {
      const value = readString(block, name, { anchored: false });
      if (value !== null) obj[name] = value;
    }
    return obj;
  });
}

/** Read `field: { ... }` as a single object with `fields` picked out. */
function readObject(scope, field, fields) {
  const body = readBlock(scope, field, '{', '}');
  if (!body) return null;
  const obj = {};
  for (const name of fields) {
    const value = readString(body, name, { anchored: false });
    if (value !== null) obj[name] = value;
  }
  return obj;
}

// ── projects.ts → case-study route model ─────────────────────────────────

/** Trim to maxLen characters, breaking on a word boundary, never mid-word. */
export function trimToWordBoundary(text, maxLen = 160) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const budget = maxLen - 1; // reserve one char for the ellipsis
  let cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + '…';
}

function projectsArrayBody(source) {
  const marker = 'export const PROJECTS: Project[] = [';
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`site-data: could not find "${marker}" in ${PROJECTS_FILE}`);
  }
  const arrayStart = markerIdx + marker.length - 1; // index of the '['
  const array = scanBalanced(source, arrayStart, '[', ']');
  if (!array) {
    throw new Error(`site-data: could not find the closing "]" for PROJECTS in ${PROJECTS_FILE}`);
  }
  return array.slice(1, -1);
}

/**
 * Every project with a `caseStudy`, as a flat record the head tags, JSON-LD,
 * <noscript> body and sitemap can all read from.
 */
export function readCaseStudies() {
  const source = readFileSync(PROJECTS_FILE, 'utf8');
  const blocks = splitTopLevelObjects(projectsArrayBody(source));

  const works = [];
  for (const block of blocks) {
    const caseIdx = block.search(/^\s*caseStudy:\s*\{/m);
    if (caseIdx === -1) continue;

    // Fields exist on both the project and its caseStudy (`links`), so the two
    // halves are read separately instead of racing each other for a match.
    const head = block.slice(0, caseIdx);
    const caseBody = block.slice(caseIdx);

    const id = readString(head, 'id');
    const title = readString(head, 'title');
    const tagline = readString(head, 'tagline');
    if (!id || !title || !tagline) {
      throw new Error(
        `site-data: a project with caseStudy is missing id/title/tagline (got id=${id}, title=${title}, tagline=${tagline})`,
      );
    }

    const subtitle = readString(head, 'subtitle');
    const blurb = readString(head, 'blurb');
    const intro = readStringArray(caseBody, 'intro');

    works.push({
      id,
      title,
      subtitle,
      fullTitle: subtitle ? `${title}: ${subtitle}` : title,
      tagline,
      blurb,
      kindLabel: readString(caseBody, 'kindLabel'),
      // The case page shows `intro` when it has one and falls back to the
      // blurb; the crawler fallback mirrors that so the two never diverge.
      body: intro && intro.length ? intro : blurb ? [blurb] : [],
      tools: readStringArray(head, 'tools') ?? [],
      externalUrl: readString(head, 'url'),
      stat: readObject(caseBody, 'stat', ['value', 'heading', 'body']),
      order: readObject(caseBody, 'order', ['heading', 'body', 'suffix']),
      credits: readStringArray(caseBody, 'credits') ?? [],
      links: readObjectArray(caseBody, 'links', ['label', 'url']) ?? [],
      contributors: readObjectArray(caseBody, 'contributors', ['name', 'url', 'type']) ?? [],
    });
  }

  if (works.length === 0) {
    throw new Error(
      `site-data: extracted zero case-study routes from ${PROJECTS_FILE} — the source format likely changed under the scanner`,
    );
  }

  return works;
}

// ── the route table ──────────────────────────────────────────────────────

/**
 * Every statically materialized route.
 *
 * `indexable: false` marks the pages served `noindex` (privacy, plus the two
 * legacy redirect stubs). build-sitemap.mjs drops those, because listing a
 * noindex URL in a sitemap contradicts the page itself.
 *
 * `sources` lists the files whose git history dates the route. It is a proxy,
 * not a per-paragraph diff: editing one case study bumps `lastmod` on all
 * three, since they share src/data/projects.ts. That errs toward "recently
 * touched" rather than toward a date that is silently frozen, and it is honest
 * about what the repo actually knows.
 */
export function buildRoutes() {
  const works = readCaseStudies();

  const home = {
    path: '',
    kind: 'home',
    title: `${AUTHOR_NAME} | New media artist · Interactive projections & stage visuals · Prague`,
    description:
      'Sinaida Krivchenko is a Prague-based new media artist: real-time TouchDesigner and GLSL systems for stage visuals, projections, and audio-reactive performance.',
    canonical: `${SITE_URL}/`,
    indexable: true,
    priority: '1.0',
    sources: ['index.html', 'src/pages/Index.tsx', 'src/data/projects.ts', 'src/data/services.ts'],
    works,
  };

  const collaborate = {
    path: 'collaborate',
    kind: 'page',
    title: `Work with me | ${AUTHOR_NAME}`,
    description:
      'She takes commissions for stage and projection design, immersive installations, and generative AI visual direction, based in Prague and touring for installs.',
    canonical: `${SITE_URL}/collaborate/`,
    breadcrumbLabel: 'Work with me',
    indexable: true,
    priority: '0.8',
    sources: ['src/pages/Collaborate.tsx', 'src/data/services.ts'],
    fallback: {
      heading: 'Work with me',
      paragraphs: [
        'Sinaida Krivchenko takes commissions for stage and projection design, audio-reactive concert visuals, interactive and immersive installations, generative AI visual direction, and creative direction for cultural institutions. Based in Prague, travelling for installs.',
      ],
      lists: [
        {
          heading: 'How to brief a project',
          items: [
            'Festivals and concerts: send the setlist and the stage dimensions.',
            'Galleries and venues: send the room, the run dates, and what the space already owns.',
            'Institutions: send the audience you are trying to reach and what currently stands in the way.',
          ],
        },
      ],
    },
  };

  const experiences = {
    path: 'experiences',
    kind: 'page',
    title: `Experiences · ${AUTHOR_NAME} and Daria Blokhina`,
    description:
      'Exhibition and event spaces where the physical structure and the real-time interactive system are designed as one brief. Daria Blokhina builds the space, Sinaida Krivchenko builds the system.',
    canonical: `${SITE_URL}/experiences/`,
    breadcrumbLabel: 'Experiences',
    indexable: true,
    priority: '0.9',
    sources: ['src/pages/Experiences.tsx', 'src/data/experiences.ts'],
    fallback: {
      heading: 'Experiences',
      paragraphs: [
        'Exhibition and event spaces where the physical structure and the real-time interactive system are designed as one brief, rather than a built room with screens added afterwards. Daria Blokhina builds the space. Sinaida Krivchenko builds the system that lives in it.',
      ],
    },
  };

  const statement = {
    path: 'statement',
    kind: 'page',
    title: `Statement | ${AUTHOR_NAME}`,
    description:
      'Why she builds responsive visual systems: a language that needs no translation, engineering structure and ballet listening, and the audience that completes the work.',
    canonical: `${SITE_URL}/statement/`,
    breadcrumbLabel: 'Statement',
    indexable: true,
    priority: '0.8',
    sources: ['src/pages/Statement.tsx'],
    fallback: {
      heading: 'Sinaida Krivchenko',
      paragraphs: [
        'Sinaida Krivchenko creates responsive visual systems where light, sound, movement and human presence become a shared experience.',
        'Her work is structured by code and amplified by the people who interact with it. She builds motion-reactive and audio-responsive experiences: a full set of live visuals in TouchDesigner for the band Redkie Ptitsy, nine projections, one per song, and The Eyes Chico, a room filled with red light where you steer a soul across a field of poppies.',
      ],
    },
  };

  const privacy = {
    path: 'privacy',
    kind: 'page',
    title: `Privacy Policy | ${AUTHOR_NAME}`,
    description: 'How this website handles personal data, what it stores, and the rights visitors have under GDPR.',
    canonical: `${SITE_URL}/privacy/`,
    breadcrumbLabel: 'Privacy policy',
    robots: 'noindex, follow',
    indexable: false,
    sources: ['src/pages/PrivacyPolicy.tsx'],
    fallback: {
      heading: 'Privacy policy',
      paragraphs: ['How this website handles personal data, what it stores, and the rights visitors have under GDPR.'],
    },
  };

  // Legacy redirect stubs: the SPA sends /booking/ and /press/ visitors on to
  // /collaborate/, so their static shells reuse collaborate's copy and point
  // search engines at the real destination instead of indexing the redirect.
  const legacyRedirect = (path) => ({
    ...collaborate,
    path,
    canonical: collaborate.canonical,
    robots: 'noindex, follow',
    indexable: false,
  });

  const workRoutes = works.map((work) => ({
    path: `work/${work.id}`,
    kind: 'work',
    title: `${work.fullTitle} · Case Study | ${SITE_NAME}`,
    description: trimToWordBoundary(work.blurb ? `${work.tagline}. ${work.blurb}` : work.tagline, 160),
    canonical: `${SITE_URL}/work/${work.id}/`,
    breadcrumbLabel: work.fullTitle,
    indexable: true,
    priority: '0.9',
    sources: ['src/pages/WorkCase.tsx', 'src/data/projects.ts'],
    work,
  }));

  return [
    home,
    collaborate,
    experiences,
    statement,
    privacy,
    legacyRedirect('booking'),
    legacyRedirect('press'),
    ...workRoutes,
  ];
}
