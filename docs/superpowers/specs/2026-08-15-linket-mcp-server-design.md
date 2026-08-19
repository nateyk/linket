# Linket MCP Server Design

Date: 2026-08-15
Status: Approved
Path: `packages/mcp-server/`

## Overview

A standalone TypeScript MCP (Model Context Protocol) server that exposes Linket data
(short links, analytics, digital products, sales, payouts) to AI clients (Claude
Desktop, Codex, opencode, etc.) via stdio transport. The server is read-only in v1
and talks to Linket's existing Laravel API, so it reuses the app's permissions and
validation instead of touching the database directly.

## Package Structure

A standalone Node/TS package at `packages/mcp-server/`. It is NOT an npm workspace
member — the root `package.json` is the Vite frontend build, and keeping the two
decoupled avoids dependency conflicts. The package has its own `package.json`,
`tsconfig.json`, and `node_modules`, is built with `tsc`, and is run via stdio.

```
packages/mcp-server/
  package.json          type: module, bin: linket-mcp
  tsconfig.json
  README.md
  src/
    index.ts            entrypoint: registers server + tools, starts stdio
    config.ts           env parsing (LINKET_API_URL, LINKET_API_TOKEN)
    linket-client.ts    axios wrapper: bearer auth, base URL, typed helpers
    tools/
      links.ts          link lookup + analytics tools
      products.ts       storefront/product read tools
```

## Config & Auth

- `LINKET_API_URL` (default `http://localhost`) — base URL of the Linket install,
  e.g. `https://linket.app`.
- `LINKET_API_TOKEN` — a Sanctum personal access token created via
  `POST /api/v1/access-tokens` for a user with the `api.access` permission (the
  `verifyApiAccess` middleware rejects requests without it).
- Loaded from the environment via `config.ts`. No dotenv dependency — users export
  env vars or configure them in their MCP client's env block.
- Every request sends `Authorization: Bearer <token>`.

## Tools (v1, read-only)

All tools pass user-provided args through as query parameters (validated
server-side by Laravel) and return the raw JSON payload as the tool result.

### Links

| Tool | Endpoint | Params |
|---|---|---|
| `linket.list_links` | `GET /api/v1/links` | query, per_page, page, folder_id, type, is_archived, sort, name, long_url |
| `linket.get_link` | `GET /api/v1/links/{id}` | id |
| `linket.link_analytics` | `GET /api/v1/tracked-events/report` | link_id, start_date, end_date, timezone, metric |
| `linket.tracked_events` | `GET /api/v1/tracked-events` | link_id, event_type, country, city, device, browser, created_at, page, per_page |

### Storefront / Digital Products

| Tool | Endpoint | Params |
|---|---|---|
| `linket.list_products` | `GET /api/v1/digital-products` | per_page |
| `linket.get_product` | `GET /api/v1/digital-products/{id}` | id |
| `linket.product_sales` | `GET /api/v1/digital-products/sales` | none (server paginates) |
| `linket.product_reviews` | `GET /api/v1/digital-products/{id}/reviews` | id |
| `linket.payout_requests` | `GET /api/v1/digital-products/payout-requests` | none (server paginates) |

## Error Handling

- Axios errors are mapped to MCP tool errors containing: HTTP status, API error
  message, and request path — so the model can correct its arguments.
- Network errors report connection failure to the configured API URL.
- Non-JSON error responses are surfaced as-is.

## Entrypoint

`index.ts` creates an `McpServer` from `@modelcontextprotocol/sdk`, registers all
tools from `tools/links.ts` and `tools/products.ts`, connects a
`StdioServerTransport`, and starts listening.

## Testing

- Unit tests with Node's built-in `node:test` + `tsx` runner (no extra test
  framework). Cover: config parsing, error mapping, and each tool handler calling
  the correct endpoint with the correct args (mock the axios layer).
- Smoke test: spawn the built server over stdio with the MCP client SDK, call
  `tools/list` and one link tool, verify responses.
- Verification commands: `npm run build` (tsc), `npm test` (node:test),
  `npm run lint` (oxlint, matching root convention).

## Documentation

`packages/mcp-server/README.md` covers: setup, env vars, building, registering the
server in Claude Desktop / Codex / opencode client configs, and a tool reference
table.

## Out of Scope (v1)

- Write tools (create/update links, products, etc.)
- HTTP/SSE transport
- Direct database access
- Workspace membership in the root npm workspace