// The sinaida.eu MCP server (JSON-RPC 2.0, Streamable HTTP transport).
//
// Exposes the portfolio as read-only tools, three MCP Apps (portrait, works,
// starway) that render live inside the agent's chat, the list of public skill
// repos, the site's llms.txt and agent-data.json as resources, and two prompts:
// a project brief and a creative problem thought through with her method. Used by the `sinaida-mcp` Worker
// on the route sinaida.eu/mcp, and by agent-gateway as a fallback.
//
// Nothing is written anywhere. Portfolio data is read live from
// agent-data.json; skills come from the public GitHub search API; the
// starway comes from Cloudflare's own per-day invocation counts for
// the sinaida-mcp script. Both external answers are kept in the Cache API
// for a day, so most calls cost one cache read.

const SITE = 'https://sinaida.eu';
const AGENT_DATA_URL = `${SITE}/agent-data.json`;

// MCP Apps: each view is a static page deployed with the site. The host
// fetches it once through resources/read and runs it in a sandboxed iframe;
// the shader and the video run on the guest's machine, not here.
const APP_MIME = 'text/html;profile=mcp-app';
const VIEWS = {
  'ui://sinaida/portrait': {
    name: 'portrait',
    description: 'A live shader portrait of a conversation: its words surface and dissolve in a dithered field.',
    page: '/portrait/index.html',
    csp: { resourceDomains: [SITE] },
  },
  'ui://sinaida/starway': {
    name: 'starway',
    description: 'The sky over this server: one star per night, lit by the calls it received.',
    page: '/agent-views/starway.html',
    csp: { resourceDomains: [SITE] },
  },
  'ui://sinaida/works': {
    name: 'works',
    description: "Sinaida Krivchenko's selected works with stills, click-to-play video and live links.",
    page: '/agent-views/works.html',
    csp: { resourceDomains: [SITE], frameDomains: ['https://www.youtube-nocookie.com'] },
  },
};

// Largest request body the server reads, in bytes.
const MAX_BODY = 16 * 1024;

// End of the path: the tools a visit usually ends on carry this link as plain
// data, never as a line for the agent to say.
const TALK = 'Collaborate: https://sinaida.eu/collaborate';
// The sky's page; every call is counted, and the sky is read again every few
// minutes, so the visit shows the same night.
const SKY = 'Sky page: https://sinaida.eu/machines';
// The sky's own line, quoted as the site's words for the agent to read, never
// as a line it is asked to say.
const SKY_LINE = 'The sky knows you have been here. Tonight\'s star already holds your light, still on its way.';
const SKY_NOTE = `From the sky page, https://sinaida.eu/machines: "${SKY_LINE}"`;
// The night the sky began counting (this Worker's first day), kept forever,
// also after it leaves the window.
const FIRST_LIGHT = '2026-10-19';
const withTalk = (text) => `${text}\n\n${TALK}`;

const MOODS = ['still', 'tender', 'curious', 'restless', 'bright', 'dark'];

const TOOLS = [
  {
    name: 'get_bio',
    description: "Sinaida Krivchenko's bio, tagline, services, and skills.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_projects',
    description: 'List selected works with id, title, kind, tagline, and url.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_project',
    description: 'Get one project by id (see list_projects for ids).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_contact',
    description: 'Contact channels: website, collaborate page, Instagram, LinkedIn, location.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_skills',
    description:
      "Sinaida Krivchenko's open skills for agents: links to their public GitHub repos, each with the repo's own one-line description. Install them from the repos.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'starway',
    description:
      'The sky over this server: one star per day for the last nights, brighter on days with more calls to this server, older stars fading; tonight is still forming. Renders in the chat where the host shows apps; otherwise returns {date, brightness 0..1, tonight?} per day, which can be drawn, for example as an SVG. Anonymous daily totals only, nothing about any visitor.',
    inputSchema: { type: 'object', properties: {} },
    _meta: { ui: { resourceUri: 'ui://sinaida/starway' } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'show_works',
    description:
      "Show Sinaida Krivchenko's selected works as an interactive gallery in the chat: stills, video on click, links to the live pieces. Pass focus to highlight one work (ids from list_projects).",
    inputSchema: {
      type: 'object',
      properties: { focus: { type: 'string', description: 'Optional project id to highlight.' } },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: 'ui://sinaida/works' } },
  },
  {
    name: 'portrait',
    description:
      'Render a live generative portrait of this conversation in Sinaida Krivchenko\'s visual language: the words surface and dissolve in a dithered noise field, the first word in red at the centre. Choose 3 to 7 evocative single words that carry the feeling of the conversation (images, not summaries). Never use names, places, numbers or anything personal. Nothing is stored.',
    inputSchema: {
      type: 'object',
      properties: {
        words: {
          type: 'array',
          items: { type: 'string', maxLength: 24 },
          minItems: 1,
          maxItems: 7,
          description: 'The first word is the centre of the conversation.',
        },
        mood: { type: 'string', enum: MOODS, description: 'How the field moves.' },
        energy: { type: 'number', minimum: 0, maximum: 1, description: '0 calm, 1 intense.' },
      },
      required: ['words'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: 'ui://sinaida/portrait' } },
  },
];

// Same rules as the view's own clean(), so the agent, the view and the
// fallback link all agree on what was drawn.
function cleanPortrait(args) {
  const words = (Array.isArray(args?.words) ? args.words : [])
    .map((w) => String(w).replace(/[\u0000-\u001f<>,]/g, '').trim().slice(0, 24))
    .filter(Boolean)
    .slice(0, 7);
  if (!words.length) return null;
  const mood = MOODS.includes(args?.mood) ? args.mood : 'tender';
  const energy = Math.min(1, Math.max(0, Number.isFinite(+args?.energy) ? +args.energy : 0.4));
  const hash = new URLSearchParams({ w: words.join(','), m: mood, e: energy.toFixed(2) }).toString();
  return { words, mood, energy, url: `${SITE}/portrait/#${hash}` };
}

async function loadAgentData() {
  const res = await fetch(AGENT_DATA_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`agent-data.json fetch failed: ${res.status}`);
  return res.json();
}

// --- Daily cache -----------------------------------------------------------
// The Cache API keeps an entry for 30 days; it counts as fresh for one day,
// or for `fresh` seconds when given.
// When a refresh fails (GitHub rate limit, Cloudflare API hiccup), the last
// good answer is served instead, so the tools keep working untouched.
const DAY = 86400;
const cacheKey = (name) => new Request(`${SITE}/mcp/__cache/${name}`);

async function daily(name, ctx, load, fresh = DAY) {
  const cache = caches.default;
  const hit = await cache.match(cacheKey(name));
  const cached = hit ? await hit.json() : null;
  if (cached && Date.now() - cached.at < fresh * 1000) return cached.value;
  try {
    const value = await load();
    const entry = Response.json({ at: Date.now(), value }, { headers: { 'cache-control': `max-age=${30 * DAY}` } });
    const put = cache.put(cacheKey(name), entry);
    ctx?.waitUntil ? ctx.waitUntil(put) : await put;
    return value;
  } catch (err) {
    if (cached) return cached.value;
    throw err;
  }
}

// --- list_skills ---------------------------------------------------------
// Every public repo of sinaida-space with the topic `sinaida-skill`. Adding
// the topic to a repo is all it takes for a skill to appear here.
const SKILLS_URL = 'https://api.github.com/search/repositories?q=user:sinaida-space+topic:sinaida-skill&sort=updated&per_page=100';

async function loadSkills() {
  const res = await fetch(SKILLS_URL, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'sinaida.eu-mcp' },
  });
  if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`);
  const { items = [] } = await res.json();
  return items
    // only her own public repos, linked straight to github.com, nothing else
    .filter((r) => !r.private && !r.archived && r.html_url?.startsWith('https://github.com/sinaida-space/'))
    .map((r) => ({ name: r.name, url: r.html_url, description: r.description ?? '' }));
}

// --- starway -------------------------------------------------------
// Cloudflare already counts how often each Worker runs. This reads those
// per-day totals for the sinaida-mcp script through the GraphQL Analytics
// API, as far back as the account's plan allows (capped at 90 days), and
// turns them into star brightness. The raw numbers never leave this function.
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const MCP_SCRIPT = 'sinaida-mcp';
const MAX_NIGHTS = 90;
// Tonight's star is read again after this many seconds, so a visit shows the
// same night (Cloudflare's own counts lag a few minutes behind).
const TONIGHT = 600;
const readSky = (env, ctx) => daily('starway-from-began-2', ctx, () => loadStarway(env), TONIGHT);
// Brightness kept by the oldest star; today's star keeps all of it.
const OLDEST_GLOW = 0.35;

async function graphql(env, query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Cloudflare analytics failed: ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(`Cloudflare analytics: ${errors[0].message}`);
  return data.viewer.accounts[0];
}

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

async function loadStarway(env) {
  const account = env.CF_ACCOUNT_ID;

  // How far back and how wide one query may reach on this plan.
  const { settings } = await graphql(
    env,
    `query ($account: String!) { viewer { accounts(filter: { accountTag: $account }) {
      settings { workersInvocationsAdaptive { notOlderThan maxDuration } }
    } } }`,
    { account },
  );
  const { notOlderThan, maxDuration } = settings.workersInvocationsAdaptive;

  const today = Math.floor(Date.now() / (DAY * 1000)) * DAY * 1000; // 00:00 UTC
  // Whole days only: the first day must lie completely inside the window,
  // and the sky starts on the night it began counting, never before.
  const began = Date.parse(FIRST_LIGHT);
  const sinceBegan = Math.floor((today - began) / (DAY * 1000)) + 1;
  const nights = Math.max(1, Math.min(MAX_NIGHTS, Math.floor(notOlderThan / DAY), sinceBegan));
  const first = today - (nights - 1) * DAY * 1000;
  const span = Math.max(1, Math.floor(maxDuration / DAY));

  // One aliased sub-query per window the plan allows, all in one request.
  const parts = [];
  for (let from = first, i = 0; from <= today; from += span * DAY * 1000, i++) {
    const to = Math.min(today, from + (span - 1) * DAY * 1000);
    parts.push(`w${i}: workersInvocationsAdaptive(limit: 1000,
      filter: { scriptName: $script, date_geq: "${isoDay(from)}", date_leq: "${isoDay(to)}" }) {
      sum { requests } dimensions { date } }`);
  }
  const result = await graphql(
    env,
    `query ($account: String!, $script: String!) { viewer { accounts(filter: { accountTag: $account }) {
      ${parts.join('\n')}
    } } }`,
    { account, script: MCP_SCRIPT },
  );

  const perDay = new Map();
  for (const rows of Object.values(result)) {
    for (const row of rows) perDay.set(row.dimensions.date, (perDay.get(row.dimensions.date) ?? 0) + row.sum.requests);
  }

  // Log scale, so one visit already shows and a busy day does not blind
  // the rest; then the older a star, the more it has faded.
  const peak = Math.log1p(Math.max(0, ...perDay.values()));
  const sky = [];
  for (let i = 0; i < nights; i++) {
    const date = isoDay(first + i * DAY * 1000);
    const light = peak ? Math.log1p(perDay.get(date) ?? 0) / peak : 0;
    // age in nights out of the full ninety, so a young sky is not faded
    const age = (nights - 1 - i) / (MAX_NIGHTS - 1);
    const glow = 1 - (1 - OLDEST_GLOW) * age;
    sky.push({ date, brightness: Math.round(light * glow * 1000) / 1000, ...(i === nights - 1 && { tonight: true }) });
  }
  return sky;
}

// --- JSON-RPC plumbing ---------------------------------------------------

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

// Browser-based MCP clients and inspectors call from other origins. The
// server is read-only and cookie-free, so an open CORS policy is safe.
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
};

const reply = (payload, status = 200) => Response.json(payload, { status, headers: CORS });
const toolResult = (id, text, structuredContent) =>
  reply(jsonRpcResult(id, { content: [{ type: 'text', text }], ...(structuredContent && { structuredContent }) }));
const toolError = (id, text) => reply(jsonRpcResult(id, { content: [{ type: 'text', text }], isError: true }));

// Plain reading for agents: the site's own machine-readable files, served
// as they are, so an agent can read them without a tool call.
const DOCS = {
  'https://sinaida.eu/llms.txt': { name: 'llms.txt', description: 'The site for language models: who Sinaida Krivchenko is, the works, the services, how to get in touch.', mimeType: 'text/plain' },
  'https://sinaida.eu/agent-data.json': { name: 'agent-data.json', description: 'The same portfolio as structured data: bio, works, services, contact.', mimeType: 'application/json' },
};

async function readDoc(uri) {
  const doc = DOCS[uri];
  if (!doc) return null;
  const res = await fetch(uri, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`${doc.name} fetch failed: ${res.status}`);
  return { uri, mimeType: doc.mimeType, text: await res.text() };
}

async function readView(uri) {
  const view = VIEWS[uri];
  if (!view) return readDoc(uri);
  const res = await fetch(`${SITE}${view.page}`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`${view.page} fetch failed: ${res.status}`);
  return {
    uri,
    mimeType: APP_MIME,
    text: await res.text(),
    _meta: { ui: { csp: view.csp, prefersBorder: false } },
  };
}

// The same sky for the site's own page (/machines), served by agent-gateway at
// GET /starway.json. People reading the page must not light the machines'
// stars, so this never runs inside sinaida-mcp: only that script is counted.
export async function handleStarwayJson(env, ctx) {
  const headers = { ...CORS, 'cache-control': `public, max-age=${TONIGHT}` };
  // a failed read is never cached, so the sky comes back with the next visit
  const dark = { ...CORS, 'cache-control': 'no-store' };
  if (!env?.CF_ANALYTICS_TOKEN || !env?.CF_ACCOUNT_ID) return Response.json({ stars: [] }, { status: 503, headers: dark });
  try {
    const stars = await readSky(env, ctx);
    return Response.json({ stars, firstLight: FIRST_LIGHT }, { headers });
  } catch {
    return Response.json({ stars: [] }, { status: 503, headers: dark });
  }
}

// --- Prompts ---------------------------------------------------------------
// A prompt is picked by the person in their own client, so its text is the
// person's request, never a line the server slips into the conversation.
// start_a_project walks them through a project brief, built from Sinaida's own
// project intro method: the core seven questions by default, the full twelve
// when the project is corporate.

const CORE = [
  'The problem: what is not working today, and what makes you say so? Why does it matter to you or your organisation, and what happens if nothing is done?',
  'Before and after: how does it look and feel now, and how should it look and feel once the work exists?',
  'The audience: who will meet the work, and how should it change their experience?',
  'The goal: what should the project achieve, and how will you know it worked?',
  'Scope: what belongs to this project, and what clearly does not?',
  'What already exists and what is needed: venue or place, dates and deadlines, budget range, technical setup, people involved.',
  'Risks and limits: what could get in the way of delivery or of running the work, and how could that be handled?',
];

const FULL_EXTRA = [
  'Similar work: who else does something close, and what should make this project different?',
  'Work done so far: research, tests, numbers or conversations that support the idea, beyond the idea stage.',
  'Your team: who on your side makes this real, and with what experience?',
  'Market: how large is the field this project plays in, and what share or reach do you aim for?',
  'Money: how is the project budgeted and funded, and if it is sold, how is it priced and sold?',
];

const BRIEF_MARK = 'Prepared with the project brief prompt of the sinaida.eu MCP server, from my own answers. Not written or reviewed by Sinaida Krivchenko.';

const PROMPTS = [
  {
    name: 'start_a_project',
    title: 'Start a project with Sinaida Krivchenko',
    description:
      "Walks you through a short project brief for Sinaida Krivchenko (interactive projections, stage visuals, installations, web), from her own project intro method, and ends with a ready text you send her yourself. depth: 'core' (seven questions, default) or 'full' (twelve, for corporate projects).",
    arguments: [{ name: 'depth', description: "'core' or 'full'.", required: false }],
  },
  {
    name: 'think_with_sinaida',
    title: "Think it through with Sinaida Krivchenko's method",
    description:
      'For a creative problem you are stuck on: first where you are (drained, flooded or dry), then one thinking method that argues with your idea, then one next step. The method behind her tool Thresherium. idea: your problem in a sentence, optional.',
    arguments: [{ name: 'idea', description: 'Your problem or idea in a sentence.', required: false }],
  },
];

const THINK_MARK = 'Thought through with the think_with_sinaida prompt of the sinaida.eu MCP server.';

function thinkPrompt(idea) {
  const own = typeof idea === 'string' ? idea.trim().slice(0, 500) : '';
  const text = [
    `I am stuck on a creative problem and would like to think it through with the method of Sinaida Krivchenko, a new media artist (${SITE}), the one behind her free browser tool Thresherium (https://sinaida-space.github.io/thresherium/). Everything needed is below, so the tool itself is optional. Please guide me.`,
    own ? `\nMy problem: ${own}` : '',
    '',
    'How I would like it to go:',
    '- Talk with me in the language I am writing in.',
    '- One question at a time, each with three or four concrete options and room for my own answer.',
    '- Argue with my idea where it is vague or borrowed, and leave every decision to me.',
    '',
    'The steps:',
    '1. Where I am: a few short questions that place me on three scales, drained (no energy), flooded (too much in my head) or dry (no idea or no way forward).',
    '2. Drained: one short body practice first (breath, movement or grounding), then we decide whether to go on today.',
    '3. Flooded: one triage of everything in my head, sorted by impact and effort, and I pick one thing.',
    '4. Dry: we choose one thinking method that fits, from five whys, issue tree, answer first, pre-mortem, inversion, SCAMPER and working backwards, and use it to argue with my idea until it is concrete.',
    '5. The end: one next step I can take within a day, and a short plan of what we found.',
    '',
    'If I sound like I am in a real crisis rather than creatively stuck, leave the method and suggest I talk to someone I trust or a local support line.',
    'If a decision stays open, you may mention that the list_skills tool of this server lists her open skills for creative work, and leave it to me whether to look.',
    `End the plan with this line: "${THINK_MARK}"`,
  ].filter((line, i, all) => !(line === '' && all[i - 1] === ''));
  return {
    description: PROMPTS[1].description,
    messages: [{ role: 'user', content: { type: 'text', text: text.join('\n') } }],
  };
}

function briefPrompt(depth) {
  const full = depth === 'full';
  const questions = full ? [...CORE.slice(0, 5), FULL_EXTRA[0], FULL_EXTRA[1], FULL_EXTRA[2], CORE[5], CORE[6], FULL_EXTRA[3], FULL_EXTRA[4]] : CORE;
  const text = [
    `I would like to prepare a project brief for Sinaida Krivchenko, a new media artist (${SITE}). Please guide me through it.`,
    '',
    'How I would like it to go:',
    '- Talk with me in the language I am writing in.',
    '- One question at a time. I may skip any of them or answer "not known yet".',
    '- Use only what I say. Do not add facts, numbers or promises, and do not speak for Sinaida about prices, dates or availability.',
    full ? '' : '- If it turns out the project is corporate, offer the full version with five more questions.',
    '- If I get stuck on a decision, you may mention that the list_skills tool of this server lists her open skills for creative work, and leave it to me whether to look.',
    '',
    'The questions:',
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    '',
    'At the end:',
    '- Write the brief in English, short, under the same headings, marking skipped points as open.',
    '- If we talked in another language, add a second copy of the brief in that language.',
    `- End each copy with this line: "${BRIEF_MARK}"`,
    `- Then tell me that I can send it myself through ${SITE}/collaborate. Nothing is sent for me.`,
    '',
    `Her works and services, if useful: the resources ${SITE}/llms.txt and ${SITE}/agent-data.json of this server.`,
  ].filter((line, i, all) => !(line === '' && all[i - 1] === ''));
  return {
    description: PROMPTS[0].description,
    messages: [{ role: 'user', content: { type: 'text', text: text.join('\n') } }],
  };
}

async function callTool(id, name, args, env, ctx) {
  if (name === 'portrait') {
    const portrait = cleanPortrait(args);
    if (!portrait) return toolError(id, 'portrait needs at least one word.');
    return toolResult(
      id,
      `Portrait of "${portrait.words.join(', ')}" (${portrait.mood}) is rendering in the chat. Shareable link: ${portrait.url}`,
      portrait,
    );
  }

  if (name === 'list_skills') {
    const skills = await daily('skills', ctx, loadSkills);
    return toolResult(id, withTalk(JSON.stringify(skills, null, 2)), { skills });
  }

  if (name === 'starway') {
    if (!env?.CF_ANALYTICS_TOKEN || !env?.CF_ACCOUNT_ID) return toolError(id, `The sky is not readable right now. ${SKY}`);
    const stars = await readSky(env, ctx);
    const hint = `${stars.length} nights, oldest first, one star each; the last is tonight, still forming. Where the host does not render the view, the data can be drawn, for example as an SVG: size and light each star by brightness; 0 is a night with no calls. Counting began on ${FIRST_LIGHT}.\n\n${SKY_NOTE}`;
    return toolResult(id, withTalk(`${hint}\n${JSON.stringify(stars)}`), { stars, firstLight: FIRST_LIGHT, hint, skyLine: SKY_LINE });
  }

  const data = await loadAgentData();
  switch (name) {
    case 'get_bio':
      return toolResult(id, JSON.stringify({ name: data.name, alternateNames: data.alternateNames, tagline: data.tagline, bio: data.bio, services: data.services, skills: data.skills }, null, 2));
    case 'list_projects':
      return toolResult(id, JSON.stringify(data.projects, null, 2));
    case 'get_project': {
      const project = data.projects.find((p) => p.id === args?.id);
      return project ? toolResult(id, withTalk(JSON.stringify(project, null, 2))) : toolError(id, `Unknown project id: ${args?.id}`);
    }
    case 'get_contact':
      return toolResult(id, JSON.stringify(data.contact, null, 2));
    case 'show_works': {
      const focus = data.projects.some((p) => p.id === args?.focus) ? args.focus : null;
      const summary = data.projects.map((p) => `- ${p.title} (${p.kind}): ${p.tagline} ${p.url}`).join('\n');
      return toolResult(id, withTalk(`Showing ${data.projects.length} works in the chat.\n${summary}`), { works: data.projects, focus });
    }
    default:
      return reply(jsonRpcError(id, -32602, `Unknown tool: ${name}`));
  }
}

export async function handleMcp(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') {
    // No server-initiated stream: this server only answers requests.
    return new Response('MCP endpoint requires POST', { status: 405, headers: { ...CORS, allow: 'POST, OPTIONS' } });
  }

  // A JSON-RPC call here is a few hundred bytes; anything far larger is refused unread.
  // The header is checked first, the text length too, since a chunked body sends no header.
  if (Number(request.headers.get('content-length')) > MAX_BODY) {
    return reply(jsonRpcError(null, -32600, 'Request too large'), 413);
  }
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return reply(jsonRpcError(null, -32600, 'Request too large'), 413);
    body = JSON.parse(text);
  } catch {
    return reply(jsonRpcError(null, -32700, 'Parse error'), 400);
  }

  const { id, method, params } = body ?? {};

  // Notifications (no id) get an empty 202, as the Streamable HTTP transport requires.
  if (id === undefined || id === null) return new Response(null, { status: 202, headers: CORS });

  try {
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion;
        return reply(
          jsonRpcResult(id, {
            protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
            serverInfo: { name: 'sinaida-portfolio', title: 'Sinaida Krivchenko', version: '1.3.0' },
            capabilities: { tools: {}, resources: {}, prompts: {} },
            instructions:
              'Portfolio of Sinaida Krivchenko, new media artist. show_works lists her works with links. portrait turns a few words from the conversation into a small keepsake. list_skills lists her open skills for agents. starway returns one star per night of past visits, to draw as a sky. Two prompts: start_a_project guides a person through a project brief for her, think_with_sinaida through a creative problem with her method; llms.txt and agent-data.json are readable as resources.',
          }),
        );
      }
      case 'prompts/list':
        return reply(jsonRpcResult(id, { prompts: PROMPTS }));
      case 'prompts/get':
        if (params?.name === 'start_a_project') return reply(jsonRpcResult(id, briefPrompt(params?.arguments?.depth)));
        if (params?.name === 'think_with_sinaida') return reply(jsonRpcResult(id, thinkPrompt(params?.arguments?.idea)));
        return reply(jsonRpcError(id, -32602, `Unknown prompt: ${params?.name}`));
      case 'ping':
        return reply(jsonRpcResult(id, {}));
      case 'tools/list':
        return reply(jsonRpcResult(id, { tools: TOOLS }));
      case 'resources/list':
        return reply(
          jsonRpcResult(id, {
            resources: [
              ...Object.entries(VIEWS).map(([uri, v]) => ({ uri, name: v.name, description: v.description, mimeType: APP_MIME })),
              ...Object.entries(DOCS).map(([uri, d]) => ({ uri, ...d })),
            ],
          }),
        );
      case 'resources/templates/list':
        return reply(jsonRpcResult(id, { resourceTemplates: [] }));
      case 'resources/read': {
        const contents = await readView(params?.uri);
        return contents
          ? reply(jsonRpcResult(id, { contents: [contents] }))
          : reply(jsonRpcError(id, -32002, `Resource not found: ${params?.uri}`));
      }
      case 'tools/call':
        return await callTool(id, params?.name, params?.arguments ?? {}, env, ctx);
      default:
        return reply(jsonRpcError(id, -32601, `Unknown method: ${method}`));
    }
  } catch (err) {
    return reply(jsonRpcError(id, -32603, String(err?.message || err)));
  }
}

/*! Je suis le spectre d'une rose que tu portais hier au bal.
    Théophile Gautier, "Le Spectre de la rose", 1837 (La Comédie de la mort, 1838). Public domain. */
