# sinaida.eu agent API

One read-only API on this site: an MCP server at `/mcp` (JSON-RPC 2.0,
Streamable HTTP transport). It exposes the portfolio (bio, selected works,
contact channels) as tools, so an agent can query it directly instead
of scraping the HTML.

- Server card: [/.well-known/mcp/server-card.json](/.well-known/mcp/server-card.json)
- Protocol: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- Tools: `get_bio`, `list_projects`, `get_project`, `get_contact`
- `list_skills`: my open skills for agents, linked to their GitHub repos
- `starway`: one star per day for the last nights, brighter on days
  when more agents called this server; it renders in the chat where the
  client supports MCP Apps, otherwise draw the sky yourself
- MCP Apps (interactive views in clients that support them):
  `show_works` opens a gallery of the works with video and live links;
  `portrait` turns a few words from the conversation into a live shader
  portrait, also at [/portrait/](/portrait/)

No authentication: everything it returns is already public on the site.
Source: [github.com/sinaida-space](https://github.com/sinaida-space) →
`workers/mcp`.
