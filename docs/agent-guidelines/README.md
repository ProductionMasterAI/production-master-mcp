# Agent guidelines

The canonical agent policy for this repository lives in **[`AGENTS.md`](../../AGENTS.md)**
at the repo root. Start there.

This directory is a stub index — it exists so agents that look under `docs/` for
guidance are pointed back to the single source of truth. Do not duplicate policy here.

## Quick links

- **[`AGENTS.md`](../../AGENTS.md)** — canonical policy: what this repo is (the MCP
  server), layout, build & verify, hard constraints, branch/commit/PR conventions,
  dependency management.
- **[`CLAUDE.md`](../../CLAUDE.md)** — Claude Code addenda (imports `AGENTS.md`).
- **[`.cursor/rules/000-project.mdc`](../../.cursor/rules/000-project.mdc)** — Cursor
  pointer to `AGENTS.md`.

## The one thing to remember

`production-master-mcp` is the **standalone MCP server** over the hosted service — a
protocol boundary that forwards tool calls upstream. All investigation logic — pipeline,
prompts, retrieval, evaluation data — is server-side and never lives here. No provider
SDKs, no server logic, and never log or store a forwarded bearer token; CI enforces the
first two.
