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
| Source of truth | `@production-master/mcp-tool-contract` (publication pending) |
| Discovery | standard MCP tool-listing call — your client shows the current set on connect |
| Names & schemas | defined by the contract package; versioned there, not in this repo |

The tool set covers driving Production Master investigations end to end; the exact tool names and their input/output schemas ship with the contract package and are listed by your client once connected.

## Configuration

| Setting | Status |
|---------|--------|
| Upstream service endpoint | configured for the server; specifics defined as packages land |
| Transport / port | defined as packages land |
| Auth | none stored — the caller's bearer token is forwarded opaquely upstream |

Concrete environment variables and flags are documented here as the server packages land. The server ships no baked-in credentials or endpoints; all configuration is read from the environment at runtime.

## Scope

This surface covers connecting to the server and calling its tools. Anything beyond that — how an investigation reasons, what data it reads — happens on the hosted service and is not controlled from this server.
