// sinaida-mcp: the MCP server of sinaida.eu as its own Worker.
//
// agent-gateway fronts the whole site, so its invocation count mixes people
// and agents. Running /mcp here, on the more specific route sinaida.eu/mcp,
// keeps this script's count to MCP calls only; the starway tool reads
// that count back from Cloudflare's analytics. Everything else gets a 404.

import { handleMcp, CORS } from './mcp.js';

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/mcp') return handleMcp(request, env, ctx);
    return new Response('Not Found', { status: 404, headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });
  },
};

/*! Je suis le spectre d'une rose que tu portais hier au bal.
    Théophile Gautier, "Le Spectre de la rose", 1837 (La Comédie de la mort, 1838). Public domain. */
