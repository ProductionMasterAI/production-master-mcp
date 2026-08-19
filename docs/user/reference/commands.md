# Reference — endpoint, transports, and config

`production-master-mcp` is reached over the Model Context Protocol, not a fixed set of slash commands — the callable **tools** are defined by `@production-master/mcp-tool-contract` and discovered at runtime through the standard MCP tool-listing call. This page documents the protocol surface: the endpoint, the two transports, and configuration.

## Endpoint

| Transport | Shape | Use when |
|-----------|-------|----------|
| Streamable HTTP | `POST <server-url>/mcp` | The server runs as a hosted/remote process; the client connects to its URL |
| stdio | client launches the server subprocess (e.g. `npx …`) | The client runs the server locally and talks over standard I/O |

Both transports expose the **same** MCP surface and the same tool set; only the connection mechanism differs. A given client entry configures one transport — a URL for HTTP, a launch command for stdio.

### HTTP request shape

The Streamable HTTP transport follows the MCP standard: MCP JSON-RPC messages are sent as the body of `POST <server-url>/mcp`, and the caller attaches an `Authorization: Bearer <token>` header. That header is forwarded opaquely to the hosted service; the server adds no auth of its own.

## Tools

| Item | Value |
|------|-------|
| Source of truth | `@production-master/mcp-tool-contract` (published on npm) |
| Discovery | standard MCP tool-listing call — your client shows the current set on connect |
| Names & schemas | defined by the contract package; versioned there, not in this repo |

The tool set covers driving Production Master investigations end to end; the exact tool names and their input/output schemas ship with the contract package and are listed by your client once connected.

## Configuration

The server reads all configuration from the environment at runtime — it ships no baked-in credentials or endpoints.

| Variable | Applies to | Required | Meaning |
|----------|-----------|----------|---------|
| `PM_API_URL` | both transports | yes | Base URL of the Production Master hosted `/v1/*` REST API the server forwards tool calls to. There is no built-in default — the server refuses to start a request without it rather than silently pointing at the wrong host. |
| `PM_SESSION_JWT` | stdio only | yes | Your Production Master session token, fixed for the process's whole run (stdio has no per-request header, unlike HTTP). Missing → the server exits immediately with an error, not a confusing failure on the first tool call. |
| `PM_MCP_HTTP_PORT` | HTTP only | no (default `3000`) | Port the Streamable HTTP transport listens on for `POST /mcp`. |

Over HTTP, auth is per-request instead: the caller's `Authorization: Bearer <token>` header is forwarded opaquely to `PM_API_URL` on every call — nothing is read from the environment for it.

Launch: `production-master-mcp` for stdio (default), `production-master-mcp --http` for the Streamable HTTP transport.

## Scope

This surface covers connecting to the server and calling its tools. Anything beyond that — how an investigation reasons, what data it reads — happens on the hosted service and is not controlled from this server.
