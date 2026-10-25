// ── Per-route JSON-LD and <noscript> fallback ──
//
// Each route gets its own <noscript> body and its own structured data, so a
// crawler that does not execute JS reads a description of the page it is on
// (the case study, not the homepage), and a work's JSON-LD never declares
// itself to be a different work. Both are generated per route from the same
// model in ./site-data.mjs.
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

import { SITE_URL, AUTHOR_NAME, WEBSITE_ID, PERSON_ID } from './site-data.mjs';

const OG_IMAGE = `${SITE_URL}/og-cover-1200x630.jpg`;

const PERSON_NODE = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: AUTHOR_NAME,
  alternateName: ['Зинаида Кривченко', 'Zinaida Krivchenko'],
  jobTitle: 'New media artist',
  description:
    'Prague-based new media artist who creates visual worlds for stage and screen. She makes real-time audio-reactive and motion-reactive systems built with tools like TouchDesigner, interactive projections and generative art for live performance and cultural institutions.',
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
    'Generative Art',
    'Motion-Reactive Visuals',
    'Interactive Installations',
    'Audio-Reactive Visuals',
    'Stage Visuals',
    'Concept Design',
    'Experience Design',
    'Digital Art',
    'Agentic Coding',
    'Multi-Agent Orchestration',
    'Model Context Protocol',
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
    ...(work.practiceLabels.length ? { keywords: work.practiceLabels.join(', ') } : {}),
    creator: ref(PERSON_ID),
    author: ref(PERSON_ID),
    ...(contributors.length ? { contributor: contributors } : {}),
    // A collaborator's testimonial, stated as a schema.org Review so machines
    // read it as a review of the work rather than as part of its description.
    ...(work.testimonial
      ? {
          review: {
            '@type': 'Review',
            reviewBody: work.testimonial.paragraphs.join('\n\n'),
            author: {
              '@type': 'Person',
              name: work.testimonial.name,
              ...(work.testimonial.role ? { jobTitle: work.testimonial.role } : {}),
            },
          },
        }
      : {}),
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

/** A practice page's works, so a consumer can enumerate them from the page alone. */
function practiceListNode(route) {
  return {
    '@type': 'ItemList',
    '@id': `${route.canonical}#works`,
    name: route.itemList.name,
    itemListElement: route.itemList.works.map((work, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@id': `${SITE_URL}/work/${work.id}/#work`, name: work.fullTitle, url: `${SITE_URL}/work/${work.id}/` },
    })),
  };
}

function webPageNode(route, { hasBreadcrumb, mainEntityId }) {
  return {
    // ProfilePage on "/" because the homepage's subject is the person, which
    // is exactly the claim a search or answer engine is trying to resolve.
    '@type': route.kind === 'home' ? ['WebPage', 'ProfilePage'] : route.itemList ? 'CollectionPage' : 'WebPage',
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
  if (route.itemList) graph.push(practiceListNode(route));

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
    // "Camera frames that leave the device: 0". Concrete figures are the part of a
    // case study an answer engine is most likely to quote, so the number has
    // to survive into the text, not just the layout.
    lines.push(`        <h2>${escapeHtml(work.stat.heading)}: ${escapeHtml(work.stat.value)}</h2>`);
    lines.push(p(work.stat.body));
  }

  if (work.practices.length) {
    lines.push(
      ...listBlock(
        'Practice',
        work.practices.map((id, i) => `<a href="/practice/${escapeHtml(id)}/">${escapeHtml(work.practiceLabels[i])}</a>`),
      ),
    );
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
    // An item is plain text, or a link with an optional note after it.
    const html = list.items.map((item) =>
      typeof item === 'string'
        ? escapeHtml(item)
        : `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${item.note ? `: ${escapeHtml(item.note)}` : ''}`,
    );
    lines.push(...listBlock(list.heading, html));
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
