# Contributing

Thanks for your interest in `production-master-mcp`. This repository is the
**MCP front door** to the Production Master hosted service: it speaks the
[Model Context Protocol](https://modelcontextprotocol.io), exposes the tool set
to any MCP-capable client, and relays each tool call upstream.

> **Status:** the packages under `packages/` are still being populated. If
> something described in the README doesn't exist yet, that's why — check
> [CHANGELOG.md](CHANGELOG.md) and the open PRs before filing it as a bug.

## What belongs here (and what doesn't)

The intelligence runs on the hosted service. Please don't open pull requests
that add investigation logic, prompts, model-provider SDKs, or analysis
credentials to this repository — they belong upstream, and CI will reject them
(see [CI](#ci) below).

Changes that fit well here:

- **Protocol correctness** — transport handling for Streamable HTTP (`POST
  /mcp`) and stdio, session lifecycle, error mapping.
- **Tool surface plumbing** — wiring tools against
  `@production-master/mcp-tool-contract` so every client sees the same versioned
  schemas.
- **Client compatibility** — making the server work correctly with a specific
  MCP client, and documenting how to register it.
- **Docs** — anything in `docs/`, the README, or the connection examples.

### Two invariants worth knowing before you write code

1. **Auth is pass-through.** The caller's `Authorization: Bearer <token>` is
   forwarded opaquely upstream. The server must never store, log, cache, or
   persist it. A change that writes a token anywhere — including to a debug log
   — is a security bug, not a feature.
2. **Tool schemas come from the contract package**, not from inline literals.
   If a tool's shape needs to change, it changes in the contract so every client
   moves together.

## Before you start

- **Bugs and features:** open an issue first for anything non-trivial, so we can
  agree on the approach before you spend time on it. Small fixes and doc
  corrections can go straight to a PR.
- **Security vulnerabilities:** do **not** open a public issue. Follow
  [SECURITY.md](SECURITY.md) and report privately.
- **Conduct:** participation is governed by our
  [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

You need **Node.js 22**.

```bash
nvm use
make install      # clean, lockfile-driven install
make build        # compile every workspace
```

`make help` lists every target. The `make` targets are thin wrappers — `make
test` runs `npm test` (vitest), and the workspace-wide variants are available as
`npm run test:workspaces` and `npm run lint`.

## Before you push

Run the same gates CI runs:

```bash
make lint
make test
make build
```

All three must pass. If you changed behavior, add or update a test — that
matters more than usual here, because a protocol regression shows up as a
confusing failure inside someone else's editor rather than as an error in ours.

## CI

Every pull request runs three required jobs:

| Job | What it checks |
|---|---|
| `CI` | build, lint, and the test suite |
| `secret-scan` | no credentials or tokens committed |
| `ip-guard` | no server-side implementation detail in this public repo |

`ip-guard` is the automated form of the boundary described above. If it fails on
your change, the fix is almost never to reword the flagged text — it's that the
change belongs on the service side rather than in this repository.

## Pull requests

- **Keep them focused.** One concern per PR; it makes review and revert both
  cheaper.
- **Update the docs** when you change how a client connects or what a tool
  accepts.
- **Add a CHANGELOG entry.** This project follows
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
  [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — put user-facing
  changes under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md). Purely
  internal refactors don't need one.
- **Explain the why.** The diff shows what changed; the description should say
  what problem it solves.

Maintainers review and merge. Expect a round of questions — that's normal, not a
verdict on the change.

## Licensing

This project is [MIT licensed](LICENSE). By contributing, you agree that your
contributions are licensed under the same terms.
