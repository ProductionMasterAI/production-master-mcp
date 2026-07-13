# Architecture overview

**production-master-mcp** is a standalone MCP server. It terminates the Model Context Protocol, forwards each tool call to the Production Master hosted service, and relays the result back. It does not investigate anything itself.

## The one decision that shapes everything

**All investigation logic is server-side.** The server contains no analysis, no model or provider SDKs, and no stored credentials. It owns transport, auth pass-through, and tool routing — nothing more. This keeps the public server small, safe to open-source, and identical for every MCP client. The rationale and consequences are recorded in [ADR-001](../decisions/ADR-001-initial-architecture.md).

## Components

The server is organized around three concerns:

### 1. Transport layer

Implements the two standard MCP transports:

- **Streamable HTTP** — accepts MCP messages at `POST /mcp` for hosted/remote clients.
- **stdio** — runs as a local subprocess of the client and speaks MCP over standard I/O.

Both expose the identical MCP surface; a client picks one. The transport layer is where a client's protocol messages enter the server.

### 2. Auth pass-through

Reads the caller's `Authorization: Bearer <token>` and forwards it opaquely to the hosted service on the outbound request. The server makes **no** authorization decision and stores **no** credentials — it never persists, caches, or logs the token. Authorization is decided entirely upstream.

### 3. Tool routing

Validates each incoming tool call against the schemas published in the shared npm package `@production-master/mcp-tool-contract` (publication pending), then relays it to the hosted service's public API and maps the response back into an MCP tool result. The contract package — not this repo — owns the tool names and their input/output shapes.

## Data flow

```mermaid
sequenceDiagram
    participant Cl as MCP client
    participant M as production-master-mcp
    participant S as Hosted service

    Cl->>M: list tools (MCP)
    M-->>Cl: tool set (from contract package)

    Cl->>M: call tool + Authorization: Bearer <token>
    Note over M: validate against contract; do not store token
    M->>S: forward call, Bearer forwarded opaquely
    S-->>M: result
    M-->>Cl: MCP tool result
```

The server opens exactly one downstream channel — to the hosted service — and carries the caller's token through unchanged. It keeps no session state of its own beyond the lifetime of a request.

## What lives where

| Concern | MCP server (this repo) | Hosted service |
|---------|:---:|:---:|
| MCP transport (HTTP + stdio) | ✅ | — |
| Bearer pass-through | ✅ | — |
| Tool-call validation & routing | ✅ | — |
| Tool schemas | via `@production-master/mcp-tool-contract` | — |
| Investigation logic & orchestration | — | ✅ |
| Model / provider access | — | ✅ |
| Data source access & credentials | — | ✅ |
| Authorization decisions | — | ✅ |

## Repository layout

npm workspaces under `packages/*` (populated via PRs). The intended split follows the three concerns above — a transport-agnostic core plus the HTTP and stdio transport shims — so that no package pulls in analysis or provider code. CI's `ip-guard` job enforces that boundary. See [Build & release](../build-and-release/README.md).
