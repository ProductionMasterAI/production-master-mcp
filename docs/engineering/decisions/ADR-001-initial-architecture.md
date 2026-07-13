# ADR-001: Standard MCP server over hosted service

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

Production Master runs autonomous production-incident investigations on a hosted service. Users want to drive those investigations from the tools they already use — Claude Code, Cursor, Codex, OpenCode, or any client that speaks the Model Context Protocol.

There are two broad ways to deliver that:

1. **Per-client integrations** — build and maintain a separate editor-specific integration for each tool.
2. **One standard MCP server** — implement the Model Context Protocol once and let any MCP-capable client connect.

This repository is public. Anything shipped here is world-readable and may be run on end-user machines. That constraint, plus the goal of reaching every MCP client without a bespoke integration per tool, drives the decision.

## Decision

**This repository is a standalone MCP server over the hosted service.** All investigation logic is server-side. The server's responsibilities are limited to:

- **Transport** — the two standard MCP transports: Streamable HTTP at `POST /mcp` for hosted/remote clients, and stdio for clients that launch the server locally.
- **Auth pass-through** — read the caller's `Authorization: Bearer <token>` and forward it opaquely to the hosted service; store, log, and persist nothing.
- **Tool routing** — validate calls against the schemas published in the shared npm package `@production-master/mcp-tool-contract`, then relay them to the hosted service.

The server contains **no** analysis logic, **no** model or provider SDKs, and **no** stored credentials. This boundary is enforced in CI by an `ip-guard` job that fails the build if disallowed content is introduced.

Supporting choices:

- **Standard MCP endpoint.** Exposing the protocol's Streamable HTTP (`POST /mcp`) and stdio transports means any conformant client connects without a custom adapter.
- **No credential storage.** Opaque bearer forwarding keeps the auth story trivial and the server free of secrets — a token belongs to the client, not the server.
- **Schemas via a shared package.** Tool input/output schemas live in `@production-master/mcp-tool-contract`, so the tool surface is versioned in one place and identical across clients.
- **npm-workspaces layout.** Server packages live under `packages/*` and are populated via reviewed PRs.

## Consequences

### Positive

- **Reach every MCP client with one server.** No per-editor fork to maintain; a new client works the day it speaks MCP.
- **Small, safe public surface.** No proprietary logic or secrets ship in an open, installable server.
- **Independent evolution.** The service can change how investigations run without a server release, as long as the MCP tool contract holds.
- **Clear security story.** Credentials for doing the work never leave the service; the server only relays a caller-supplied token.

### Negative / trade-offs

- **Requires connectivity.** The server is useless offline — every tool call depends on the hosted service.
- **Contract coupling.** The server depends on the tool contract and the service's API; breaking changes there require a coordinated release of `@production-master/mcp-tool-contract` and the server.
- **Thin by enforcement.** Contributors may be tempted to add "just a little" logic server-side. The `ip-guard` CI job exists precisely to reject that and keep the boundary honest.

### Enforced constraints

- No model/provider SDK dependencies in any `packages/*` workspace.
- No investigation/analysis logic in this repo.
- No forwarded bearer token is ever stored, logged, or persisted.
- The `ip-guard` CI job is a required check on every PR.
