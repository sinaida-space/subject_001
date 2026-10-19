// Cloudflare Worker in front of sinaida.eu (GitHub Pages origin).
//
// GitHub Pages serves static files only — it can't react to request headers
// or run a server. This Worker adds the three things that need request-time
// logic, then passes everything else straight through to the origin:
//
//   1. POST /mcp            — the MCP server. It lives in ../mcp/mcp.js and
//                              normally runs in its own Worker (sinaida-mcp,
//                              route sinaida.eu/mcp) so its daily invocation
//                              count is agents only; this is the fallback.
//      GET /starway.json   — the same sky of daily MCP calls for /machines,
//                              read here so page views never count as calls.
//   2. GET  /  (Accept: text/markdown) — markdown rendition of the homepage.
//   3. GET  /  (any Accept)  — adds a Link header pointing agents at the
//                              MCP server card and the llms.txt summary.
//
// Tool/markdown data is read live from https://sinaida.eu/agent-data.json
// and /llms.txt, both already deployed with the site, so this Worker has no
// content of its own to keep in sync.

import { handleMcp, handleStarwayJson, CORS } from '../mcp/mcp.js';

const SITE = 'https://sinaida.eu';
const LLMS_TXT_URL = `${SITE}/llms.txt`;

const NO_AUTH_PATHS = new Set([
  '/register',
  '/authorize',
  '/token',
  '/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration',
]);

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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp') {
      return handleMcp(request, env, ctx);
    }

    if (url.pathname === '/starway.json' && request.method === 'GET') {
      return handleStarwayJson(env, ctx);
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
