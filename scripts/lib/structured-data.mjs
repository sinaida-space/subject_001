// ── Per-route JSON-LD and <noscript> fallback ──
//
// Two problems this fixes, both introduced by materializing routes as copies
// of dist/index.html:
//
//   1. Every route shipped the homepage's <noscript> body, so a crawler that
//      does not execute JS read "Sinaida Krivchenko | New media artist" plus
//      the homepage service list on /work/redkie-ptitsy/ and saw nothing of
//      the case study.
//   2. Every route shipped the homepage's structured data, which included a
//      CreativeWork block for The Eyes Chico. /work/redkie-ptitsy/ therefore
//      declared itself to be a different work. That is worse than no markup.
//
// Both are now generated per route from the same model in ./site-data.mjs.
//
// The markup is emitted as ONE @graph rather than several loose blocks, with
// every node carrying an @id and referring to the others by @id. A consumer
// then reads one connected description of the page (this work, by this
// person, on this site) instead of guessing how independent blocks relate.
//
// Deliberately absent: datePublished / dateModified. The repo has honest dates
// in git, but the source files behind a case page are shared, so a per-page
// date here would be a guess dressed as a fact. Freshness is signalled through
// sitemap lastmod instead, where being file-derived is the expected contract.

import { SITE_URL, SITE_NAME, AUTHOR_NAME, WEBSITE_ID, PERSON_ID } from './site-data.mjs';

const OG_IMAGE = `${SITE_URL}/og-cover-1200x630.jpg`;

const PERSON_NODE = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: AUTHOR_NAME,
  alternateName: 'sin.ai.da',
  jobTitle: 'New media artist',
  description:
    'Prague-based new media artist building living visual systems for stages and physical spaces: real-time TouchDesigner and GLSL work, interactive projections, and audio-reactive visuals for live performance and cultural institutions.',
  url: `${SITE_URL}/`,
  image: OG_IMAGE,
  sameAs: [
    'https://www.instagram.com/sin.ai.da/',
    'https://www.linkedin.com/in/sinaida',
    'https://www.behance.net/sinaida',
    'https://github.com/sinaida-space',
  ],
  knowsAbout: [
    'TouchDesigner',
    'GLSL',
    'Projection Mapping',
    'Interactive Installations',
    'Audio-Reactive Visuals',
    'Stage Visuals',
    'Creative Direction',
    'Digital Art',
  ],
  alumniOf: {
    '@type': 'Organization',
    name: 'Bauman Moscow State Technical University, General Electric IT Leadership Program',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Prague',
    addressCountry: 'CZ',
  },
};

const WEBSITE_NODE = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: AUTHOR_NAME,
  alternateName: SITE_NAME,
  inLanguage: 'en',
  publisher: { '@id': PERSON_ID },
};

const ref = (id) => ({ '@id': id });

/** Home › <this page>. Omitted on the homepage, where a one-item trail says nothing. */
function breadcrumbNode(route) {
  if (route.kind === 'home') return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${route.canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: route.breadcrumbLabel ?? route.title, item: route.canonical },
    ],
  };
}

function creativeWorkNode(route) {
  const { work } = route;
  const contributors = work.contributors.map((c) => ({
    '@type': c.type ?? 'Person',
    name: c.name,
    ...(c.url ? { url: c.url } : {}),
  }));

  // `url` is the case page; `sameAs` is the thing itself where it lives
  // elsewhere (a playable build, a repo), which is the distinction a consumer
  // needs to tell "read about it here" from "go experience it there".
  //
  // A case page also links out to the people on it, and those URLs must not
  // land here: sameAs asserts "this is the same work", so Telefm's Bandcamp
  // under Aether Currents would claim the musician's page *is* the instrument.
  // Contributor links are dropped for that reason; they are already stated
  // correctly, as contributor.url, below.
  const contributorUrls = new Set(work.contributors.map((c) => c.url).filter(Boolean));
  const sameAs = [work.externalUrl, ...work.links.map((l) => l.url)]
    .filter((u) => u && /^https?:\/\//.test(u) && !contributorUrls.has(u))
    .filter((u, i, all) => all.indexOf(u) === i);

  return {
    '@type': 'CreativeWork',
    '@id': `${route.canonical}#work`,
    name: work.fullTitle,
    headline: work.title,
    description: work.blurb ?? work.tagline,
    abstract: work.tagline,
    url: route.canonical,
    ...(sameAs.length ? { sameAs } : {}),
    ...(work.kindLabel ? { genre: work.kindLabel } : {}),
    ...(work.tools.length ? { keywords: work.tools.join(', ') } : {}),
    creator: ref(PERSON_ID),
    author: ref(PERSON_ID),
    ...(contributors.length ? { contributor: contributors } : {}),
    isPartOf: ref(WEBSITE_ID),
    mainEntityOfPage: ref(`${route.canonical}#webpage`),
    inLanguage: 'en',
  };
}

/** The homepage's portfolio index, so a consumer can enumerate the work from "/" alone. */
function worksListNode(route) {
  return {
    '@type': 'ItemList',
    '@id': `${SITE_URL}/#works`,
    name: 'Selected work',
    itemListElement: route.works.map((work, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        '@id': `${SITE_URL}/work/${work.id}/#work`,
        name: work.fullTitle,
        description: work.tagline,
        url: `${SITE_URL}/work/${work.id}/`,
      },
    })),
  };
}

function webPageNode(route, { hasBreadcrumb, mainEntityId }) {
  return {
    // ProfilePage on "/" because the homepage's subject is the person, which
    // is exactly the claim a search or answer engine is trying to resolve.
    '@type': route.kind === 'home' ? ['WebPage', 'ProfilePage'] : 'WebPage',
    '@id': `${route.canonical}#webpage`,
    url: route.canonical,
    name: route.title,
    description: route.description,
    isPartOf: ref(WEBSITE_ID),
    about: ref(mainEntityId),
    mainEntity: ref(mainEntityId),
    ...(hasBreadcrumb ? { breadcrumb: ref(`${route.canonical}#breadcrumb`) } : {}),
    primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
    inLanguage: 'en',
  };
}

/** The full `<script type="application/ld+json">` payload for one route. */
export function buildGraph(route) {
  const breadcrumb = breadcrumbNode(route);
  const work = route.kind === 'work' ? creativeWorkNode(route) : null;
  const mainEntityId = work ? work['@id'] : PERSON_ID;

  const graph = [
    WEBSITE_NODE,
    PERSON_NODE,
    webPageNode(route, { hasBreadcrumb: Boolean(breadcrumb), mainEntityId }),
  ];
  if (breadcrumb) graph.push(breadcrumb);
  if (work) graph.push(work);
  if (route.kind === 'home') graph.push(worksListNode(route));

  return { '@context': 'https://schema.org', '@graph': graph };
}

// ── <noscript> crawler fallback ──────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const p = (text) => `        <p>${escapeHtml(text)}</p>`;

function listBlock(heading, items) {
  if (!items.length) return [];
  return [
    `        <h2>${escapeHtml(heading)}</h2>`,
    '        <ul>',
    ...items.map((item) => `          <li>${item}</li>`),
    '        </ul>',
  ];
}

function breadcrumbTrail(route) {
  if (route.kind === 'home') return [];
  return [
    '        <nav aria-label="Breadcrumb">',
    `          <a href="/">Home</a> › ${escapeHtml(route.breadcrumbLabel ?? route.title)}`,
    '        </nav>',
  ];
}

function workFallback(route) {
  const { work } = route;
  const lines = [
    ...breadcrumbTrail(route),
    `        <h1>${escapeHtml(work.fullTitle)}</h1>`,
    p(work.tagline),
    ...work.body.map((para) => p(para)),
  ];

  if (work.stat) {
    // The page shows the number as a big display glyph above its heading.
    // Prose cannot, so the number is folded onto the end of the heading:
    // "Bytes that leave the device: 0". Concrete figures are the part of a
    // case study an answer engine is most likely to quote, so the number has
    // to survive into the text, not just the layout.
    lines.push(`        <h2>${escapeHtml(work.stat.heading)}: ${escapeHtml(work.stat.value)}</h2>`);
    lines.push(p(work.stat.body));
  }

  if (work.tools.length) {
    lines.push('        <h2>Built with</h2>');
    lines.push(p(work.tools.join(', ')));
  }

  lines.push(...listBlock('Credits', work.credits.map((c) => escapeHtml(c))));
  lines.push(
    ...listBlock(
      'Links',
      work.links.map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`),
    ),
  );

  if (work.order) {
    lines.push(`        <h2>${escapeHtml(work.order.heading)}</h2>`);
    lines.push(p(work.order.body));
  }

  lines.push(`        <p><a href="/collaborate/">Work with ${escapeHtml(AUTHOR_NAME)}</a></p>`);
  return lines;
}

function pageFallback(route) {
  const { fallback } = route;
  const lines = [
    ...breadcrumbTrail(route),
    `        <h1>${escapeHtml(fallback.heading)}</h1>`,
    ...fallback.paragraphs.map((para) => p(para)),
  ];
  for (const list of fallback.lists ?? []) {
    lines.push(...listBlock(list.heading, list.items.map((item) => escapeHtml(item))));
  }
  return lines;
}

/**
 * The inner HTML of the route's <noscript> block.
 * Returns null for the homepage, whose hand-written fallback in index.html is
 * the canonical one and stays untouched.
 */
export function buildFallback(route) {
  if (route.kind === 'home') return null;
  const lines = route.kind === 'work' ? workFallback(route) : pageFallback(route);
  return ['      <main>', ...lines, '      </main>'].join('\n');
}
