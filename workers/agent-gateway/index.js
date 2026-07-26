// Cloudflare Worker in front of sinaida.eu (GitHub Pages origin).
//
// GitHub Pages serves static files only — it can't react to request headers
// or run a server. This Worker adds the three things that need request-time
// logic, then passes everything else straight through to the origin:
//
//   1. POST /mcp            — a minimal MCP server (JSON-RPC 2.0) exposing
//                              the portfolio as read-only tools.
//   2. GET  /  (Accept: text/markdown) — markdown rendition of the homepage.
//   3. GET  /  (any Accept)  — adds a Link header pointing agents at the
//                              MCP server card and the llms.txt summary.
//
// Tool/markdown data is read live from https://sinaida.eu/agent-data.json
// and /llms.txt, both already deployed with the site, so this Worker has no
// content of its own to keep in sync.

const AGENT_DATA_URL = 'https://sinaida.eu/agent-data.json';
const LLMS_TXT_URL = 'https://sinaida.eu/llms.txt';

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
];

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

async function handleMcp(request) {
  if (request.method !== 'POST') {
    return new Response('MCP endpoint requires POST', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(jsonRpcError(null, -32700, 'Parse error'), { status: 400 });
  }

  const { id, method, params } = body;

  if (method === 'initialize') {
    return Response.json(
      jsonRpcResult(id, {
        protocolVersion: '2026-01-01',
        serverInfo: { name: 'sinaida-portfolio', version: '1.0.0' },
        capabilities: { tools: {} },
      }),
    );
  }

  if (method === 'tools/list') {
    return Response.json(jsonRpcResult(id, { tools: TOOLS }));
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    let data;
    try {
      data = await loadAgentData();
    } catch (err) {
      return Response.json(jsonRpcError(id, -32000, String(err)), { status: 502 });
    }

    let content;
    switch (toolName) {
      case 'get_bio':
        content = { name: data.name, tagline: data.tagline, bio: data.bio, services: data.services, skills: data.skills };
        break;
      case 'list_projects':
        content = data.projects;
        break;
      case 'get_project': {
        const projectId = params?.arguments?.id;
        content = data.projects.find((p) => p.id === projectId) ?? null;
        break;
      }
      case 'get_contact':
        content = data.contact;
        break;
      default:
        return Response.json(jsonRpcError(id, -32601, `Unknown tool: ${toolName}`), { status: 404 });
    }

    return Response.json(
      jsonRpcResult(id, { content: [{ type: 'text', text: JSON.stringify(content, null, 2) }] }),
    );
  }

  return Response.json(jsonRpcError(id, -32601, `Unknown method: ${method}`), { status: 400 });
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
