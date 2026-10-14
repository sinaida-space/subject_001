# Agent gateway (Cloudflare Worker)

Fronts sinaida.eu to add what GitHub Pages can't do on its own: Markdown
negotiation on the homepage, a `Link` header, and an API catalog — all of
which need request-time logic or a non-standard content-type a static host
can't serve. It also runs a small MCP server at `POST /mcp` exposing the
portfolio (bio, projects, contact) as read-only tools. Everything else
passes straight through to the GitHub Pages origin, unmodified.

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
curl -s https://sinaida.eu/mcp -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Updating

Edit `index.js`, then `npx wrangler deploy` again. Tool data comes from
`https://sinaida.eu/agent-data.json` and `/llms.txt` at request time — edit
those (in `public/`) to update what the MCP tools and markdown negotiation
return; no Worker redeploy needed for content changes.
