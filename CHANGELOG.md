# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Claude Code target bumped to 2.1.252** (from 2.1.251) in `.claude-code-version`.
  Reviewed the single-version 2.1.252 delta for MCP-facing changes: none found.
  All four items in that release are host-side reliability fixes with no MCP
  transport, registration, or pass-through-auth surface here — a Bash "task
  output swap refused (tasks dir moved or linked)" failure on some Macs, an
  "always allow" permission rule not saving in a project that has no
  `.claude/settings.local.json` yet, Remote Control sessions hosted by Claude
  Desktop or VS Code stalling for minutes after a tool finished when the
  connection to claude.ai was degraded, and background task notifications
  with very large failure output overflowing the API request size limit.
  None of them touches this server's HTTP/stdio transports, the
  `headersHelper` guidance in Quick Start/Troubleshooting, or MCP
  server-name handling — no docs or code changes follow from this bump.

### Changed
- **Cursor 3.11 (+2026-08-27):** advance `changelog_date` **2026-08-19 → 2026-08-27**; desktop **3.16.29 → 3.18.9**. Document Cloud Agent **Start from scratch** (no SCM), Origin **Create repo**, **browser port-forward preview**, and optional **Vercel publish**. No server-side change. Cursor-only.
- **Cursor 3.11 (+2026-08-19):** document native **CreateGoal** / **UpdateGoal** beside Agent Window `/goal` in Quick Start (no server change). Cursor-only.

### Added
- **OIDC trusted-publishing wiring for `@production-master/mcp` (dev#644).**
  `release.yml` now publishes the package on a `v*` tag via npm OIDC trusted
  publishing — `id-token: write` plus an in-job npm upgrade pinned to
  `^11.5.1` (mirrors `production-master`'s release train, dev#725; `@latest`
  is unbounded across majors and has broken this exact train before).
  Deliberately no `NODE_AUTH_TOKEN`: with a token also wired, a green publish
  would not distinguish OIDC actually working from the token quietly
  carrying it, so the migration could never be verified. A tag whose version
  doesn't match `packages/mcp-server/package.json` fails the release before
  any publish is attempted. This wires the release train only — it does not
  cut a release or perform a publish; that still needs the trusted publisher
  configured on npmjs.com for this package (owner-side) and an explicit tag
  push.

- **Cursor 3.11 (+2026-08-19):** advance `changelog_date` **2026-08-17 → 2026-08-19** (desktop **3.16.29** unchanged). Document cloud-agent **Subscriptions**, **Custom Modes**, **isolated-VM subagents**, Agent Window **`/goal`**, and **non-interruptive steering** in Quick Start. No server-side change (protocol boundary only). Cursor-only; other platform nightlies untouched.

### Added
- **One published package, not two (dev#701).** `@production-master/mcp-tool-router`
  is folded into `@production-master/mcp` and is no longer published. It existed
  only so that `@production-master/mcp` would resolve for an outside installer — a
  package serving a dependency graph rather than a user — which bought a second
  version cadence to keep in agreement for an audience that does not exist yet, and
  a way for someone to install a router version that does not match their server.
  Settled before the first registry write, because the asymmetry decides it:
  extracting a package later is routine, deprecating a published name is not.
  The relay keeps its module boundary as `packages/mcp-server/src/tool-router/` —
  one entry point (`index.ts`), nothing outside it importing `upstream.ts` or
  `config.ts` — so a later extraction stays cheap. It is deliberately **not**
  re-exported from the package's public `index.ts`: committing `requestUpstream` to
  the published API at first publish would recreate the compatibility obligation
  this removes. No behaviour change; the 26-test suite is unchanged and green.
- **Upstream relay hardening: one relay path, a real failure taxonomy, and a
  proven-non-leaking bearer (dev#644, AD-23).** Every `/v1/*` call now goes
  through a single `requestUpstream` in the relay module, which is
  where the pass-through-auth contract and the failure taxonomy are stated
  once instead of being restated by each of the twenty tools. Upstream
  failures are classified — `upstream_unauthorized`, `upstream_forbidden`,
  `upstream_not_found`, `upstream_rate_limited`, `upstream_failed`,
  `upstream_unreachable`, `upstream_invalid_response` — so a caller can tell
  "no such investigation" from "the service is down" without parsing prose.
  Documented for users in `docs/user/troubleshooting.md`.
- **Relay seam tests (`packages/mcp-server/src/relay.test.ts`).** Eight tests
  drive the real MCP SDK `Client` through the real HTTP transport and router
  against a stand-in upstream, asserting the three properties neither side
  can show alone: the caller's credential reaches upstream unmodified, it
  appears in no log line and no tool result even when the upstream echoes it
  back, and an upstream failure is distinguishable from a legitimate empty
  result. Suite is 26 tests (was 16).
- **`@production-master/mcp` is publishable.** It carries `repository`,
  `license`, `files`, `engines`, and `prepublishOnly`; it had `private: true`,
  which would have made `npm publish` a no-op. Its one-time dependency on a
  sibling workspace package — which could never have resolved for an outside
  installer — is gone with the consolidation above, so the published tarball
  is self-contained apart from real registry dependencies.

### Fixed
- **Removed internal identifiers left in this PUBLIC repo (Hard rule 15).** Four
  references named private-side things an outside reader cannot see and should not
  need: a private-repo source path in the `ToolCallResult` doc comment, a
  server-side signing-secret variable name in an `upstream.ts` comment, a private
  cockpit doc path in `AGENTS.md`, and a dead `CHANGELOG` link to engineering docs
  that PR #5 had already removed. Each is rewritten to state the contract or the
  rule in terms a contributor here can act on. `ip-guard` passed on all four: its
  denylist is a finite list of known spellings, so it reports that nothing on the
  list is present, not that nothing internal is.
