# @production-master/mcp

The standard [Model Context Protocol](https://modelcontextprotocol.io) server for the
Production Master hosted incident-investigation service. It speaks MCP over both
**Streamable HTTP** (`POST /mcp`) and **stdio**, and exposes the Production Master
investigation tool set to any MCP-capable client.

This package is a protocol boundary and nothing more: it terminates MCP, validates tool
calls against the shared `@production-master/mcp-tool-contract`, and forwards them to the
hosted service over its public API. All investigation logic lives on the hosted service.

## Install

```bash
npx -y @production-master/mcp
```

## Auth

Authentication is **pass-through**. The server holds no credentials of its own:

- **HTTP** — each request carries its own `Authorization: Bearer <token>`, which is
  forwarded opaquely upstream.
- **stdio** — the token is read once from `PM_SESSION_JWT` for the process's run.

The forwarded token is never stored, cached, logged, or echoed back — including when the
upstream service reflects it into an error body, where it is redacted before it reaches
you.

## Configuration

| Variable | Transport | Required | Purpose |
|---|---|---|---|
| `PM_API_URL` | both | yes | Base URL of the hosted `/v1/*` API. No default. |
| `PM_SESSION_JWT` | stdio | yes | Your session token for the process's run. |
| `PM_MCP_HTTP_PORT` | HTTP | no (`3000`) | Port for `POST /mcp`. |

## Docs

Quick start, client setup, usage, and troubleshooting (including the upstream error
codes) live in the
[repository](https://github.com/ProductionMasterAI/production-master-mcp).

MIT licensed.
