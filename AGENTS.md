# AGENTS.md — production-master-mcp

> **Read this first.** This is the **single canonical agent policy** for this repo, for
> all AI coding agents (Claude Code, Cursor, Copilot, Codex, …). `CLAUDE.md` starts with
> `@AGENTS.md`; `.cursor/rules/000-project.mdc` is a
> thin pointer back here. Edit the policy **here** — never fork it into the adapters.

## What this repo is

`production-master-mcp` is the **standalone MCP server** for the Production Master hosted
incident-investigation service. It implements the standard Model Context Protocol —
Streamable HTTP (`POST /mcp`) and stdio transports — and exposes the Production Master
tool set to any MCP-capable client. It is a protocol boundary and nothing more.

- **All investigation logic lives on the hosted service.** The pipeline, agent reasoning,
  prompts, retrieval, scoring, and evaluation data live behind the service's API. This
  repo **never** contains any of it and never reimplements it locally.
- The server terminates MCP, validates tool calls against the shared contract, and
  forwards them to the hosted service over its public API. Authentication is **opaque
  pass-through**: the caller's `Authorization: Bearer <token>` is forwarded upstream and
  the server stores no credentials of its own.
- Being public, this repo must stay free of anything proprietary to the service. If you
  find yourself needing service internals to do a task here, the task is on the wrong
  side of the boundary — stop and flag it.

## Layout

| Path | Role |
|---|---|
| `packages/mcp-server` | The one published package, `@production-master/mcp`: transport (HTTP + stdio), auth pass-through, and the `src/tool-router/` relay module |
| `docs/` | User-facing docs only (install/operate) plus CONTRIBUTING/CHANGELOG — this repo is PUBLIC |
| `.github/` | CI workflows, issue/PR templates, Dependabot config |

TypeScript, npm **workspaces** (`packages/*`) — currently one workspace, and the repo
publishes exactly one package. The relay is an internal module directory rather
than a second package: keep its boundary intact (single entry point, no reaching past
`tool-router/index.ts`) so extracting it later stays cheap. Tool input/output schemas are
consumed from the shared npm package `@production-master/mcp-tool-contract` (published on
npm), never redefined here.

## Build & verify

Definition of done = **all of the following green**, with the command output cited:

```bash
nvm use            # pin the Node version from .nvmrc
npm ci             # clean, lockfile-faithful install
npm run build      # compile every workspace
npm test           # run the full test suite
npm run lint       # lint + format check (CI fails on warnings)
```

Never claim a change works without pasting the relevant passing output. A green typecheck
alone is not proof a feature works — exercise the affected path.

## Hard constraints

1. **No LLM/model-provider SDK imports — ever.** No model-provider client library of any
   kind anywhere in this repo. The server never calls a model directly; it forwards tool
   calls to the hosted service. **CI grep-enforces this** (the ip-guard job) — a
   violating import fails the build.
2. **No server-side investigation logic.** No investigation-pipeline steps, agent
   prompts, retrieval/scoring code, or evaluation datasets. That is the hosted service's
   private code and must not appear here even as a copy, fixture, or comment.
3. **Never log or persist forwarded bearer tokens.** Auth is opaque pass-through: read the
   caller's `Authorization` header, forward it upstream, and drop it. Do not store it, log
   it, cache it, or write it to disk anywhere.
4. **CI is GitHub-hosted `ubuntu-latest` only.** Every workflow runs on GitHub-hosted
   runners. Never reference self-hosted runner labels; this public repo has no private
   runner fleet.
5. **No secrets in code or config.** No tokens, keys, or endpoints baked into source or
   committed config. Use environment-variable substitution only; document required vars in
   `docs/` as the server packages land. Secret scanning runs in CI.

The **ip-guard** job additionally greps for a denylist of internal identifiers so no
proprietary names from the hosted service leak into this public repo. Keep the repo
scrubbed; a match fails the build.

## Branch & commit conventions

- `main` is the default branch and is always releasable.
- Branch per change: `feat/<slug>` or `fix/<slug>` off `main`.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, …). Every commit ends
  with the trailer:

  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## PR workflow

- Open a PR against `main`; keep it focused and reviewable.
- CI must be **fully green** — build, test, lint, secret-scan, and the **ip-guard** job
  (the no-provider-SDK / no-server-logic / denylist grep) — before merge.
- **Squash merge**, then **delete the branch**.
- Open the PR and share the URL; do not merge until checks pass. Never blindly merge on a
  red or pending gate.

## Dependency management

Dependabot is configured under `.github/dependabot.yml`. Rules:

- **Only ecosystems actually present** in the repo (npm, github-actions) get a Dependabot
  entry — no speculative ecosystems.
- **Cadence:** `npm` **weekly**, `github-actions` **monthly**. Never `daily`.
- **Group** minor + patch updates into a single PR **per ecosystem** — no per-dependency
  PR storms.
- **Block automatic semver-major** bumps with an `ignore` rule
  (`update-types: ["version-update:semver-major"]`); majors are handled deliberately by a
  human/agent, not auto-proposed.
- **`open-pull-requests-limit: 3`** (or lower) per ecosystem. Never raise it to allow
  per-dependency PRs.
- **Never blindly merge a Dependabot PR** — CI (including ip-guard) must pass first, and
  the change reviewed, before merge.

## Where the boundary is (quick test)

Ask: *"Does this change decide anything about how an investigation runs?"* If yes, it
belongs in the hosted service, not here. This repo only speaks the protocol and forwards
calls — it decides how a tool call is transported and authenticated, never how the
investigation behind it is performed.

## Skills bridge

Developer workflow skills live in **`.claude/skills/`** — that directory is the single
canonical skills location for ALL agents (there is deliberately no `.agents/skills/`
mirror to drift out of sync). Non-Claude agents should read skill definitions from
`.claude/skills/` directly; each skill is plain markdown with no Claude-specific runtime
dependency.

## Versioning & changelog

The repo follows [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html). Record every
user-facing change in the root [`CHANGELOG.md`](CHANGELOG.md) under `## [Unreleased]`
as part of the PR that makes the change. The full versioning policy is maintained
privately and is not part of this repo; SemVer plus the changelog rule above is the
whole of what a contributor here needs.
