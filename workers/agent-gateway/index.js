// Cloudflare Worker in front of sinaida.eu (GitHub Pages origin).
//
// GitHub Pages serves static files only — it can't react to request headers
// or run a server. This Worker adds the three things that need request-time
// logic, then passes everything else straight through to the origin:
//
//   1. POST /mcp            — a minimal MCP server (JSON-RPC 2.0) exposing
//                              the portfolio as read-only tools, plus two
//                              MCP Apps (portrait, works) that render live
//                              inside the agent's chat.
//   2. GET  /  (Accept: text/markdown) — markdown rendition of the homepage.
//   3. GET  /  (any Accept)  — adds a Link header pointing agents at the
//                              MCP server card and the llms.txt summary.
//
// Tool/markdown data is read live from https://sinaida.eu/agent-data.json
// and /llms.txt, both already deployed with the site, so this Worker has no
// content of its own to keep in sync.

const SITE = 'https://sinaida.eu';
const AGENT_DATA_URL = `${SITE}/agent-data.json`;
const LLMS_TXT_URL = `${SITE}/llms.txt`;

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
  'ui://sinaida/works': {
    name: 'works',
    description: "Sinaida Krivchenko's selected works with stills, click-to-play video and live links.",
    page: '/agent-views/works.html',
    csp: { resourceDomains: [SITE], frameDomains: ['https://www.youtube-nocookie.com'] },
  },
};

const MOODS = ['still', 'tender', 'curious', 'restless', 'bright', 'dark'];

const TOOLS = [
  {
    name: 'get_bio',
    description: "Sinaida Krivchenko's bio, tagline, services, and skills.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_projects',
    description: 'List selected works with id, title, kind, tagline, and url.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project',
    description: 'Get one project by id (see list_projects for ids).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'get_contact',
    description: 'Contact channels: website, collaborate page, Instagram, LinkedIn, location.',
    inputSchema: { type: 'object', properties: {} },
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

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

const NO_AUTH_PATHS = new Set([
  '/register',
  '/authorize',
  '/token',
  '/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration',
]);

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

// Browser-based MCP clients and inspectors call from other origins. The
// server is read-only and cookie-free, so an open CORS policy is safe.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
};

const reply = (payload, status = 200) => Response.json(payload, { status, headers: CORS });
const toolResult = (id, text, structuredContent) =>
  reply(jsonRpcResult(id, { content: [{ type: 'text', text }], ...(structuredContent && { structuredContent }) }));
const toolError = (id, text) => reply(jsonRpcResult(id, { content: [{ type: 'text', text }], isError: true }));

async function readView(uri) {
  const view = VIEWS[uri];
  if (!view) return null;
  const res = await fetch(`${SITE}${view.page}`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`${view.page} fetch failed: ${res.status}`);
  return {
    uri,
    mimeType: APP_MIME,
    text: await res.text(),
    _meta: { ui: { csp: view.csp, prefersBorder: false } },
  };
}

async function callTool(id, name, args) {
  if (name === 'portrait') {
    const portrait = cleanPortrait(args);
    if (!portrait) return toolError(id, 'portrait needs at least one word.');
    return toolResult(
      id,
      `Portrait of "${portrait.words.join(', ')}" (${portrait.mood}) is rendering in the chat. Shareable link: ${portrait.url}`,
      portrait,
    );
  }

  const data = await loadAgentData();
  switch (name) {
    case 'get_bio':
      return toolResult(id, JSON.stringify({ name: data.name, alternateNames: data.alternateNames, tagline: data.tagline, bio: data.bio, services: data.services, skills: data.skills }, null, 2));
    case 'list_projects':
      return toolResult(id, JSON.stringify(data.projects, null, 2));
    case 'get_project': {
      const project = data.projects.find((p) => p.id === args?.id);
      return project ? toolResult(id, JSON.stringify(project, null, 2)) : toolError(id, `Unknown project id: ${args?.id}`);
    }
    case 'get_contact':
      return toolResult(id, JSON.stringify(data.contact, null, 2));
    case 'show_works': {
      const focus = data.projects.some((p) => p.id === args?.focus) ? args.focus : null;
      const summary = data.projects.map((p) => `- ${p.title} (${p.kind}): ${p.tagline} ${p.url}`).join('\n');
      return toolResult(id, `Showing ${data.projects.length} works in the chat.\n${summary}`, { works: data.projects, focus });
    }
    default:
      return reply(jsonRpcError(id, -32602, `Unknown tool: ${name}`));
  }
}

async function handleMcp(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') {
    // No server-initiated stream: this server only answers requests.
    return new Response('MCP endpoint requires POST', { status: 405, headers: { ...CORS, allow: 'POST, OPTIONS' } });
  }

  let body;
  try {
    body = await request.json();
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
            serverInfo: { name: 'sinaida-portfolio', title: 'Sinaida Krivchenko', version: '1.1.0' },
            capabilities: { tools: {}, resources: {} },
            instructions:
              "Portfolio of Sinaida Krivchenko, new media artist. To show her work, call show_works. To give the person a keepsake of the conversation, call portrait with a few evocative words from it.",
          }),
        );
      }
      case 'ping':
        return reply(jsonRpcResult(id, {}));
      case 'tools/list':
        return reply(jsonRpcResult(id, { tools: TOOLS }));
      case 'resources/list':
        return reply(
          jsonRpcResult(id, {
            resources: Object.entries(VIEWS).map(([uri, v]) => ({ uri, name: v.name, description: v.description, mimeType: APP_MIME })),
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
        return await callTool(id, params?.name, params?.arguments ?? {});
      default:
        return reply(jsonRpcError(id, -32601, `Unknown method: ${method}`));
    }
  } catch (err) {
    return reply(jsonRpcError(id, -32603, String(err?.message || err)));
  }
}

async function handleMarkdownHomepage() {
  const res = await fetch(LLMS_TXT_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) return null;
  const text = await res.text();
  return new Response(text, {
    status: 200,
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}

const LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </llms.txt>; rel="service-doc"';

const API_CATALOG = {
  linkset: [
    {
      anchor: 'https://sinaida.eu/mcp',
      'service-desc': [{ href: 'https://sinaida.eu/.well-known/mcp/server-card.json' }],
      'service-doc': [{ href: 'https://sinaida.eu/agent-api.md' }],
    },
  ],
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp') {
      return handleMcp(request);
    }

    // GitHub Pages only reads files: it answers every other method with a 405,
    // which clients read as "something is here but broken". MCP clients probe
    // OAuth registration (POST /register) and give up on a 405. This server has
    // no sign-in and nothing else to write to, so every non-read request and
    // every OAuth path gets a plain 404 here and never reaches the origin.
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    if (!isRead || NO_AUTH_PATHS.has(url.pathname) || url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      return new Response('Not Found', { status: 404, headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });
    }

    if (url.pathname === '/.well-known/api-catalog') {
      return Response.json(API_CATALOG, {
        headers: { 'content-type': 'application/linkset+json' },
      });
    }

    const isHomepage = url.pathname === '/' || url.pathname === '/index.html';
    if (isHomepage && request.method === 'GET') {
      const accept = request.headers.get('accept') || '';
      if (accept.includes('text/markdown')) {
        const md = await handleMarkdownHomepage();
        if (md) return md;
      }

      const originResponse = await fetch(request);
      const response = new Response(originResponse.body, originResponse);
      response.headers.append('Link', LINK_HEADER);
      return response;
    }

    return fetch(request);
  },
};

/*! Je suis le spectre d'une rose que tu portais hier au bal.
    Théophile Gautier, "Le Spectre de la rose", 1837 (La Comédie de la mort, 1838). Public domain. */
