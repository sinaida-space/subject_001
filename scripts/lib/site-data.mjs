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
const PRACTICES_FILE = join(REPO_ROOT, 'src', 'data', 'practices.ts');

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
  // \uXXXX first (the NBSP glue in projects.ts is written as \u00A0), then single-char escapes.
  return raw.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, ch) =>
    ch.length === 5 ? String.fromCharCode(parseInt(ch.slice(1), 16)) : UNESCAPE[ch] ?? ch,
  );
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

/** Read `testimonial: { paragraphs: [...], name, role }`, or null. */
function readTestimonial(scope) {
  const body = readBlock(scope, 'testimonial', '{', '}');
  if (!body) return null;
  const paragraphs = readStringArray(body, 'paragraphs') ?? [];
  const name = readString(body, 'name', { anchored: false });
  const role = readString(body, 'role', { anchored: false });
  return paragraphs.length && name ? { paragraphs, name, role } : null;
}

// ── projects.ts → case-study route model ─────────────────────────────────

/**
 * Case paragraphs may carry inline links as `[label](/work/id)` or
 * `[label](https://...)` (rendered by WorkCase.tsx). Head tags, JSON-LD and
 * the <noscript> body get the label alone.
 */
export function stripInlineLinks(text) {
  return text == null ? text : String(text).replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');
}

/** stripInlineLinks over every string value of a flat object (stat, order). */
function stripObject(obj) {
  if (!obj) return obj;
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripInlineLinks(v)]));
}

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

/** The practice tags from src/data/practices.ts, in source order. */
export function readPractices() {
  const source = readFileSync(PRACTICES_FILE, 'utf8');
  const marker = 'export const PRACTICES: Practice[] = [';
  const at = source.indexOf(marker);
  if (at === -1) throw new Error(`site-data: could not find "${marker}" in ${PRACTICES_FILE}`);
  const array = scanBalanced(source, at + marker.length - 1, '[', ']');
  const practices = splitTopLevelObjects(array.slice(1, -1)).map((block) => ({
    id: readString(block, 'id'),
    label: readString(block, 'label'),
    description: readString(block, 'description'),
    lane: readString(block, 'lane'),
  }));
  if (practices.length === 0 || practices.some((p) => !p.id || !p.label || !p.description)) {
    throw new Error(`site-data: could not read the practices in ${PRACTICES_FILE}`);
  }
  const shared = source.match(/PRACTICE_SHARED_LINE =\s*'((?:\\.|[^'])*)'/);
  if (!shared) throw new Error(`site-data: could not find PRACTICE_SHARED_LINE in ${PRACTICES_FILE}`);
  return { practices, sharedLine: unescapeLiteral(shared[1]) };
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
    const tagline = stripInlineLinks(readString(head, 'tagline'));
    if (!id || !title || !tagline) {
      throw new Error(
        `site-data: a project with caseStudy is missing id/title/tagline (got id=${id}, title=${title}, tagline=${tagline})`,
      );
    }

    // The hero still is an imported asset (`image: workX,` + `import workX from
    // '@/assets/file.webp'`); keep its file stem so the prerender can find the
    // hashed build output and preload it.
    const imageIdent = head.match(/^\s*image:\s*(\w+),/m)?.[1];
    const imageStem = imageIdent
      ? source.match(new RegExp(`import\\s+${imageIdent}\\s+from\\s+'@/assets/([^']+)\\.webp'`))?.[1]
      : undefined;

    const subtitle = readString(head, 'subtitle');
    const blurb = stripInlineLinks(readString(head, 'blurb'));
    const intro = readStringArray(caseBody, 'intro')?.map(stripInlineLinks);

    works.push({
      id,
      imageStem,
      title,
      subtitle,
      fullTitle: subtitle ? `${title}: ${subtitle}` : title,
      tagline,
      blurb,
      kindLabel: readString(caseBody, 'kindLabel'),
      // The case page shows `intro` when it has one and falls back to the
      // blurb; the crawler fallback mirrors that so the two never diverge.
      body: intro && intro.length ? intro : blurb ? [blurb] : [],
      practices: readStringArray(head, 'practices') ?? [],
      externalUrl: readString(head, 'url'),
      stat: stripObject(readObject(caseBody, 'stat', ['value', 'heading', 'body'])),
      order: stripObject(readObject(caseBody, 'order', ['heading', 'body', 'suffix'])),
      credits: (readStringArray(caseBody, 'credits') ?? []).map(stripInlineLinks),
      links: readObjectArray(caseBody, 'links', ['label', 'url']) ?? [],
      contributors: readObjectArray(caseBody, 'contributors', ['name', 'url', 'type']) ?? [],
      testimonial: readTestimonial(caseBody),
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
  const { practices, sharedLine } = readPractices();
  const practiceLabel = Object.fromEntries(practices.map((p) => [p.id, p.label]));
  for (const work of works) {
    const unknown = work.practices.find((id) => !practiceLabel[id]);
    if (unknown) throw new Error(`site-data: ${work.id} lists unknown practice "${unknown}"`);
    work.practiceLabels = work.practices.map((id) => practiceLabel[id]);
  }

  const home = {
    path: '',
    kind: 'home',
    title: `${AUTHOR_NAME} | New media artist · Interactive projections & stage visuals · Prague`,
    description:
      'Sinaida creates visual worlds for stages and screens, turning your ideas into living systems. Let’s talk <3',
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
      'She takes commissions for audio-reactive concert visuals, interactive web, theater and dance scenography, and installations for venues, brands and institutions, based in Prague and touring for installs.',
    canonical: `${SITE_URL}/collaborate/`,
    breadcrumbLabel: 'Work with me',
    indexable: true,
    priority: '0.8',
    sources: ['src/pages/Collaborate.tsx', 'src/data/services.ts'],
    fallback: {
      heading: 'Work with me',
      paragraphs: [
        'Sinaida Krivchenko takes commissions for audio-reactive concert visuals, interactive web, theater and dance scenography, and installations for venues, brands and institutions. Based in Prague, travelling for installs.',
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
        'Sinaida Krivchenko works in concept and experience design: visual worlds where light, sound, movement and people meet in one room.',
        'Her background in engineering gave her a fascination with systems; ballet has taught her to listen to her body and to feel the space around her. Today she creates experiences where technology and the human soul share one world. She builds the structure, and the audience completes the work.',
        'Technology is her material, and people are her subject. In practice, the machines draft and she decides what stays. What she aims for are new meanings that neither people nor machines would reach alone.',
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

  // Internal reference: built so the URL resolves on Pages, but unlisted
  // everywhere: noindex, not in the sitemap, not in llms.txt or agent-data.
  const effects = {
    path: 'drafts/effects',
    kind: 'page',
    title: `Textures and effects | ${AUTHOR_NAME}`,
    description: 'Internal reference: every texture and effect on the site, with its source file and parameters.',
    canonical: `${SITE_URL}/drafts/effects/`,
    breadcrumbLabel: 'Textures and effects',
    robots: 'noindex, nofollow',
    indexable: false,
    sources: ['src/pages/EffectsOverview.tsx'],
    fallback: {
      heading: 'Textures and effects',
      paragraphs: ['Internal reference.'],
    },
  };

  const licensing = {
    path: 'licensing',
    kind: 'page',
    title: `Licensing | ${AUTHOR_NAME}`,
    description:
      'What you may reuse from this website and from each project, what you may not, and who to ask when the answer is no.',
    canonical: `${SITE_URL}/licensing/`,
    breadcrumbLabel: 'Licensing',
    indexable: true,
    priority: '0.3',
    sources: ['src/pages/Licensing.tsx'],
    fallback: {
      heading: 'Licensing',
      paragraphs: [
        'What you may reuse from this website and from each project, what you may not, and who to ask when the answer is no.',
      ],
    },
  };

  const machines = {
    path: 'machines',
    kind: 'page',
    title: `For machines | ${AUTHOR_NAME}`,
    description: 'This site has a second entrance for AI assistants: an MCP server that lets them read the work first hand.',
    canonical: `${SITE_URL}/machines/`,
    breadcrumbLabel: 'For machines',
    indexable: true,
    priority: '0.3',
    sources: ['src/pages/Machines.tsx'],
    fallback: {
      heading: 'For machines',
      paragraphs: [
        'The internet is now read by machines as much as by people. I build for that meeting point, so this site has a second entrance: an MCP server that lets AI assistants read my work first hand.',
        'Address: https://sinaida.eu/mcp. Add it as a connector in Claude, ChatGPT or any assistant that speaks MCP. No sign-in needed.',
      ],
    },
  };

  // Legacy redirect stubs: the SPA sends /booking/ and /press/ visitors on to
  // /collaborate/, so their static shells reuse collaborate's copy and point
  // search engines at the real destination instead of indexing the redirect.
  const legacyRedirect = (path) => ({
    ...collaborate,
    path,
    canonical: collaborate.canonical,
    redirectTo: collaborate.canonical,
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

  // Practice pages: an index and one page per practice tag.
  const workItem = (work) => ({ label: work.fullTitle, href: `/work/${work.id}/`, note: work.tagline });
  const practiceIndex = {
    path: 'practice',
    kind: 'page',
    title: `Practices | ${SITE_NAME}`,
    description: `${practices.map((p) => p.label).join(', ')}.`,
    canonical: `${SITE_URL}/practice/`,
    breadcrumbLabel: 'Practices',
    indexable: true,
    priority: '0.7',
    sources: ['src/pages/Practice.tsx', 'src/data/practices.ts', 'src/data/projects.ts'],
    fallback: {
      heading: 'Practices',
      paragraphs: [sharedLine],
      lists: [{ heading: 'Practices', items: practices.map((p) => ({ label: p.label, href: `/practice/${p.id}/`, note: p.description })) }],
    },
  };
  const practiceRoutes = practices.map((p) => {
    const inPractice = works.filter((w) => w.practices.includes(p.id));
    return {
      path: `practice/${p.id}`,
      kind: 'page',
      title: `${p.label} · Practice | ${SITE_NAME}`,
      description: trimToWordBoundary(`${p.description} ${sharedLine}`, 160),
      canonical: `${SITE_URL}/practice/${p.id}/`,
      breadcrumbLabel: p.label,
      indexable: true,
      priority: '0.7',
      sources: ['src/pages/Practice.tsx', 'src/data/practices.ts', 'src/data/projects.ts'],
      itemList: { name: p.label, works: inPractice },
      fallback: {
        heading: p.label,
        paragraphs: [p.description, sharedLine],
        lists: [{ heading: 'Works', items: inPractice.map(workItem) }],
      },
    };
  });

  return [
    home,
    collaborate,
    statement,
    privacy,
    effects,
    licensing,
    machines,
    // /license is the SPA's alias for /licensing; same shell, not indexed.
    { ...licensing, path: 'license', redirectTo: licensing.canonical, robots: 'noindex, follow', indexable: false },
    legacyRedirect('booking'),
    legacyRedirect('press'),
    ...workRoutes,
    practiceIndex,
    ...practiceRoutes,
  ];
}
