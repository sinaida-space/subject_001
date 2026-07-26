# sinaida.eu agent API

One read-only API on this site: an MCP server at `/mcp` (JSON-RPC 2.0,
Streamable HTTP transport). It exposes the portfolio — bio, selected works,
contact channels — as tools, so an agent can query it directly instead of
scraping the HTML.

- Server card: [/.well-known/mcp/server-card.json](/.well-known/mcp/server-card.json)
- Protocol: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- Tools: `get_bio`, `list_projects`, `get_project`, `get_contact`

No authentication — everything it returns is already public on the site.
Source: [github.com/sinaida-space](https://github.com/sinaida-space) →
`workers/agent-gateway`.
