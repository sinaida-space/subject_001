# sinaida-mcp (Cloudflare Worker)

The MCP server of sinaida.eu (JSON-RPC 2.0, Streamable HTTP) at
`POST https://sinaida.eu/mcp`. Read-only, no sign-in, no cookies, no storage.

It runs apart from `agent-gateway` (which fronts the whole site) so that
Cloudflare's invocation count for this script is MCP calls only. The
`starway` tool reads that count back.

## Tools

| Tool | Returns | Source |
|---|---|---|
| `get_bio`, `list_projects`, `get_project`, `get_contact` | Portfolio data | `/agent-data.json`, live |
| `show_works`, `portrait` | MCP Apps that render in the chat | `/agent-views/works.html`, `/portrait/` |
| `list_skills` | `{name, url, description}` per public skill repo | GitHub search: repos of `sinaida-space` with topic `sinaida-skill` |
| `starway` | `{date, brightness 0..1}` per day, oldest first, plus a hint to draw it | Cloudflare GraphQL Analytics, `workersInvocationsAdaptive`, script `sinaida-mcp` |

`list_skills` uses each repo's own GitHub description. To add a skill, give
its public repo the topic `sinaida-skill`; it shows up within a day.

`starway` covers as many whole days as the plan keeps (90 on the free
plan, queried in windows of at most `maxDuration`, 32 days on free; both read
from the API's `settings`). Brightness is `log(1 + calls) / log(1 + busiest
day)`, faded linearly with age down to 35% for the oldest night. Only
daily totals are read; the raw counts are never returned.

Both answers are kept in the Cache API: fresh for 24 hours, kept up to 30
days and served as they are if GitHub or Cloudflare do not answer. So the
Worker makes at most a few outside requests per day per data centre.

## Secrets (once)

Create a Cloudflare API token: My Profile → API Tokens → Create Token →
Custom token, permission **Account → Account Analytics → Read**, account
resources: this account only. Then, with the token in the clipboard:

```bash
cd workers/mcp
pbpaste | npx wrangler secret put CF_ANALYTICS_TOKEN
npx wrangler secret put CF_ACCOUNT_ID
```

`CF_ACCOUNT_ID` is shown by `npx wrangler whoami`. Without the secrets every
other tool works and `starway` answers that the sky is not visible.

For `wrangler dev`, put the same two lines (`CF_ACCOUNT_ID=…`,
`CF_ANALYTICS_TOKEN=…`) into `workers/mcp/.dev.vars`; it is git-ignored.

## Deploy

```bash
cd workers/mcp && npx wrangler deploy
cd ../agent-gateway && npx wrangler deploy
```

## Verify

```bash
curl -s https://sinaida.eu/mcp -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"starway"}}'
```
