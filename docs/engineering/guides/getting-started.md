# Getting started (development)

Set up the repo to contribute to the MCP server. For contribution rules and the PR process, see [CONTRIBUTING](../../CONTRIBUTING.md).

## Prerequisites

- **Node.js 22** — the repo pins the version in `.nvmrc`.
- **npm** (ships with Node) — the repo uses npm workspaces (`packages/*`).
- **git** and a GitHub account (fork-based workflow).

## Setup

```bash
# clone your fork
git clone https://github.com/<your-username>/production-master-mcp.git
cd production-master-mcp

# use the pinned Node version
nvm use          # reads .nvmrc (Node 22)

# install workspace dependencies
make install     # npm ci
```

> **Note:** `packages/*` are being populated via PRs. Until a package lands, `make install` sets up the workspace root and tooling; build/test targets operate on whatever packages exist.

## Everyday commands

The `make` targets wrap the npm scripts CI runs:

```bash
make build     # build all workspaces
make test      # run the test suite
make lint      # lint (CI runs with max-warnings 0)
make dev       # run the server locally (available once packages land)
```

Run build, test, and lint before opening a PR — CI runs the same checks plus `ip-guard`, and fails on any lint warning.

## Project structure

```
production-master-mcp/
├─ packages/                 # npm workspaces (transport, auth pass-through, tool routing)
├─ docs/                     # documentation (you are here)
│  ├─ user/                  # connect, usage, troubleshooting, reference
│  └─ engineering/           # architecture, decisions, guides, build-and-release
├─ assets/                   # banner and static assets
└─ README.md
```

The intended package split mirrors the three server concerns — transport (HTTP + stdio), auth pass-through, and tool routing — described in the [architecture overview](../architecture/overview.md).

## The one rule to keep in mind

This is the **MCP server** — a protocol boundary. Do not add investigation logic, model/provider SDKs, or analysis code — that lives on the hosted service — and never log or store a forwarded bearer token. CI's `ip-guard` job enforces the no-logic / no-SDK boundary and will fail your PR if disallowed content is introduced. See [ADR-001](../decisions/ADR-001-initial-architecture.md).

## Next

- [Architecture overview](../architecture/overview.md) — how the pieces fit
- [Build & release](../build-and-release/README.md) — CI and release flow
- [Contributing](../../CONTRIBUTING.md) — branching, commits, PRs
