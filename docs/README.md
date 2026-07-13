# Documentation

Documentation for **production-master-mcp**, the standalone MCP server for the Production Master hosted service.

Start with the [project README](../README.md) for the elevator pitch and connection steps, then use the map below to find what you need.

## User docs

| Doc | Read it when |
|-----|--------------|
| [Quick Start](user/quick-start.md) | You want to connect an MCP client to the server over HTTP or stdio |
| [Usage](user/usage.md) | You know the basics and want the common workflows (connect each client, bearer pass-through) |
| [Troubleshooting](user/troubleshooting.md) | A 401 upstream, connectivity, Node version, or transport mismatch is blocking you |
| [Command reference](user/reference/commands.md) | You want the endpoint shape, transports, and config reference |

## Engineering docs

| Doc | Read it when |
|-----|--------------|
| [Architecture overview](engineering/architecture/overview.md) | You want to understand the server's components and data flow |
| [ADR-001 — Standard MCP server over hosted service](engineering/decisions/ADR-001-initial-architecture.md) | You want the rationale behind the transport, auth, and contract choices |
| [Getting started (dev)](engineering/guides/getting-started.md) | You're setting up the repo to contribute |
| [Build & release](engineering/build-and-release/README.md) | You want the build, test, and release process |

## Project docs

| Doc | Purpose |
|-----|---------|
| [Contributing](CONTRIBUTING.md) | Branching, commits, and PR process |
| [Changelog](../CHANGELOG.md) | Release history |

## Scope reminder

This repo is the **MCP server only** — a protocol boundary that forwards tool calls to the hosted service. Anything about how investigations are actually run — analysis, models, data sources — is out of scope here and lives with the hosted service. If a doc starts describing investigation internals, it's in the wrong repo.
