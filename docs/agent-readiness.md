# Agent-readiness (isitagentready.com scan, 2026-07-26)

Scored 29/100 ("Bot-Aware"). Site is a static GitHub Pages deploy with no
backend, so most of the scanner's checks assume infrastructure this site
didn't have (an API, an OAuth server, a live MCP server). What's real vs.
skipped:

## Shipped in this branch

- **MCP server + Server Card** — `workers/agent-gateway/` is a Cloudflare
  Worker (deploy instructions in its README) exposing the portfolio (bio,
  projects, contact) as read-only MCP tools at `POST /mcp`. The card at
  `public/.well-known/mcp/server-card.json` points to it. This needed a real
  server, so it runs on the Cloudflare account already in front of the
  domain's DNS (free plan, no hosting migration).
- **API Catalog** — same Worker serves `/.well-known/api-catalog` (RFC 9727,
  `application/linkset+json`) with one entry describing the `/mcp` API,
  linking to the server card and a plain-language doc at
  `public/agent-api.md`. Genuine now that a real API exists behind it.
- **Markdown negotiation** (homepage only) — same Worker: `GET /` with
  `Accept: text/markdown` returns `/llms.txt` instead of HTML.
- **Link response header** — same Worker: homepage responses get a `Link`
  header pointing at the api-catalog, the MCP server card, and llms.txt.
- **WebMCP** — `src/components/WebMcpTools.tsx`, mounted site-wide in
  `App.tsx`, registers `list_projects` and `open_project` via
  `navigator.modelContext.registerTool()` where that API exists (Chrome
  origin trial only, today). Real actions — reads the same project data the
  UI uses, navigates with the same router. No-ops silently everywhere else.
- **`public/agent-data.json`** — structured bio/projects/contact, the single
  source both the MCP tools and (indirectly) llms.txt draw from.

None of this deploys itself — see `workers/agent-gateway/README.md` for the
one-time `wrangler login && wrangler deploy`. Until that's run, the scan
will still show these as missing (they only take effect once the Worker is
live in front of the zone).

## Skipped, and why

- **OAuth/OIDC discovery, OAuth Protected Resource, auth.md** — all three
  exist to let an agent authenticate against a protected API. The `/mcp`
  API is deliberately public and read-only (same data as the HTML site) —
  there's nothing to authenticate for. Publishing OAuth metadata pointing
  at no authorization server would be a stub.
- **Agent Skills index** — this spec is for downloadable skill files an
  agent can execute (like Claude Skills), not a portfolio bio. Doesn't fit.
- **Web Bot Auth request signing** — cryptographic request signing for bot
  identity; no client of ours needs to authenticate as a signed bot. Also
  informational-only in the scan (doesn't affect the score).
- **Commerce (x402, MPP, UCP, ACP)** — correctly not scored; no e-commerce
  on this site.
- **DNS for AI Discovery (DNS-AID)** — needs SVCB/HTTPS records under
  `_index._agents.sinaida.eu` etc., added in the Cloudflare DNS dashboard
  (not something deployable from this repo). It's also still a draft IETF
  spec with near-zero real-world lookups today. Low priority; can revisit
  if it stabilizes. If you want to add it anyway, the scan's own guidance
  is at the IETF draft linked from the scan results.

## Already passing

robots.txt, sitemap.xml, AI bot rules + Content Signals in robots.txt (all
2/2 or better already — no action needed).
