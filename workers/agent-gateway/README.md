# Agent gateway (Cloudflare Worker)

Fronts sinaida.eu to add what GitHub Pages can't do on its own: Markdown
negotiation on the homepage, a `Link` header, and an API catalog — all of
which need request-time logic or a non-standard content-type a static host
can't serve. Everything else passes straight through to the GitHub Pages
origin, unmodified.

The MCP server at `POST /mcp` lives in `../mcp/` and runs as its own Worker,
`sinaida-mcp`, on the more specific route `sinaida.eu/mcp`; see
[`../mcp/README.md`](../mcp/README.md). This Worker imports the same code and
answers `/mcp` itself only if `sinaida-mcp` is not deployed.

## One-time deploy (free Cloudflare plan is enough)

```bash
cd workers/agent-gateway
npx wrangler login
npx wrangler deploy
```

`wrangler login` opens a browser to authorize against your Cloudflare
account — do this yourself, this isn't something to hand credentials for.
`wrangler deploy` reads `wrangler.toml`, which routes the Worker to
`sinaida.eu/*` on the zone already in your Cloudflare account (matches your
existing DNS setup). No DNS changes needed — routes attach to the zone
directly.

## Verify after deploy

```bash
curl -s https://sinaida.eu/ -H 'Accept: text/markdown' | head
curl -s -I https://sinaida.eu/ | grep -i link
```

## Updating

Edit `index.js`, then `npx wrangler deploy` again. The markdown homepage
comes from `https://sinaida.eu/llms.txt` at request time; edit it (in
`public/`) to change what markdown negotiation returns; no Worker redeploy
needed for content changes. After a change in `../mcp/mcp.js`, deploy both
Workers.
